import { useEffect, useState, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import {
  Sparkles, ArrowRight, Loader2, TrendingUp, Target,
  Search, Check, X, Globe, Zap, ChevronDown, ChevronUp
} from "lucide-react"
import Fuse from "fuse.js"

/**
 * SynapseKZ — Discover
 *
 * Design system: "serious infrastructure", light.
 *   Base   : warm stone  #F5F2ED
 *   Surface: #FFFFFF / #FBFAF7
 *   Ink    : #1A1714
 *   Accent : deep teal #0F6E56  (single signal color)
 *   Line   : #E4DFD5
 *   Mono   : JetBrains Mono for scores + labels
 *
 * All logic (semantic match, synergy insight, connect / express-interest /
 * reach-out flows, fuzzy search, role-based tabs) is unchanged.
 */

const C = {
  base: "#F5F2ED",
  surface: "#FFFFFF",
  surfaceSoft: "#FBFAF7",
  ink: "#1A1714",
  inkSoft: "#3D3833",
  accent: "#0F6E56",
  accentSoft: "#E1EFEA",
  accentText: "#0B5642",
  line: "#E4DFD5",
  lineSoft: "#EFEBE3",
  muted: "#8A8378",
}

const INVESTMENT_KEYWORDS = ["investment", "investor", "funding", "grant", "venture"]
const POSITION_KEYWORDS   = ["developer", "designer", "engineer", "разработчик", "дизайнер",
  "frontend", "backend", "fullstack", "ml", "data", "devops", "mobile", "ios", "android", "cto", "technical"]

const STAGE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Idea:   { bg: "#F0EBE2", text: "#8A6D3B", dot: "#C9A05B" },
  MVP:    { bg: "#E8EFEC", text: "#0B5642", dot: "#1D9E75" },
  Seed:   { bg: "#EAEEE6", text: "#4F6B2E", dot: "#7BA049" },
  Growth: { bg: "#F2EBE6", text: "#9A5B33", dot: "#C97A45" },
}
function stageStyle(stage: string) {
  return STAGE_COLORS[stage] ?? STAGE_COLORS.Idea
}

export default function Discover() {
  const [loading, setLoading]             = useState(true)
  const [isMatching, setIsMatching]       = useState(false)
  const [searchQuery, setSearchQuery]     = useState("")
  const [filterStage, setFilterStage]     = useState("")
  const [filterLocation, setFilterLocation] = useState("")
  const [myStartups, setMyStartups]       = useState([])
  const [selectedMyStartup, setSelectedMyStartup] = useState("")
  const [allStartups, setAllStartups]     = useState([])
  const [aiMatches, setAiMatches]         = useState([])
  const [sentRequests, setSentRequests]   = useState([])
  const [insights, setInsights]           = useState({})
  const [loadingInsight, setLoadingInsight] = useState(null)
  const [activeTab, setActiveTab]         = useState("all")
  const [myRole, setMyRole]               = useState("founder")
  const [myUserId, setMyUserId]           = useState(null)
  const [sentTalentReqs, setSentTalentReqs] = useState([])   // talent_profile ids
  const [sentInvestReqs, setSentInvestReqs] = useState([])   // startup ids
  const [talentProfiles, setTalentProfiles] = useState([])
  const [stats, setStats] = useState({ totalStartups:0, totalCollabs:0, topNeed:"" })
  const [expandedCard, setExpandedCard]   = useState(null)

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setMyUserId(user.id)
        const role = (user.user_metadata?.role || "founder").toLowerCase()
        setMyRole(role)
        if (role === "investor") setActiveTab("investment")
        else if (role === "talent") setActiveTab("positions")

        const { data: mine } = await supabase.from("startups").select("*").eq("created_by", user.id)
        setMyStartups(mine || [])
        if (mine?.length > 0) {
          setSelectedMyStartup(mine[0].id)
          const myIds = mine.map(s => s.id)
          const { data: sent } = await supabase
            .from("collaboration_requests").select("to_startup_id").in("from_startup_id", myIds)
          setSentRequests(sent?.map(r => r.to_startup_id) || [])

          // talent requests already sent from any of my startups
          const { data: sentTalent } = await supabase
            .from("talent_requests").select("to_talent_profile_id").in("from_startup_id", myIds)
          setSentTalentReqs(sentTalent?.map(r => r.to_talent_profile_id) || [])
        }

        // investment interest already expressed by me (as a user)
        if (role === "investor") {
          const { data: sentInv } = await supabase
            .from("investment_requests").select("to_startup_id").eq("from_user_id", user.id)
          setSentInvestReqs(sentInv?.map(r => r.to_startup_id) || [])
        }
      }

      const { data: all } = await supabase
        .from("startups_public")
        .select("id,name,description,stage,location,needs,offers,bin_number,created_by,needs_embedding,offers_embedding,created_at")
      setAllStartups(all || [])

      const { data: talents } = await supabase
        .from("talent_profiles")
        .select("id,user_id,full_name,city,role,level,tech_stack,pitch,availability,collaboration_types")
      setTalentProfiles(talents || [])

      const { count: collabCount } = await supabase
        .from("collaboration_requests").select("*", { count:"exact", head:true }).eq("status","accepted")

      const allNeeds = (all || []).flatMap(s => s.needs || [])
      const needCounts = allNeeds.reduce((acc, n) => { acc[n] = (acc[n]||0)+1; return acc }, {})
      const topNeed = Object.entries(needCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || ""
      setStats({ totalStartups: all?.length||0, totalCollabs: collabCount||0, topNeed })
      setLoading(false)
    }
    init()
  }, [])

  const handleSemanticMatch = async () => {
    if (!selectedMyStartup) return toast.error("Please select a project")
    setIsMatching(true)
    setAiMatches([])
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/match-startups`,
        { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ startup_id: selectedMyStartup }) }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const filtered = data.filter(m => !myStartups.some(s => s.id === m.id))
      setAiMatches(filtered)
      toast.success(`Found ${filtered.filter(m => m.similarity > 0.7).length} strong matches`)
    } catch (err) {
      toast.error("Matching failed: " + err.message)
    } finally { setIsMatching(false) }
  }

  const fetchInsight = async (matchedStartup) => {
    const myStartup = myStartups.find(s => s.id === selectedMyStartup)
    if (!myStartup) return
    setLoadingInsight(matchedStartup.id)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/synergy-insight`,
        { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ startup_a: myStartup, startup_b: matchedStartup, similarity: matchedStartup.similarity }) }
      )
      const data = await res.json()
      setInsights(prev => ({ ...prev, [matchedStartup.id]: data.insight }))
      const { data: req } = await supabase
        .from("collaboration_requests").select("id,status")
        .or(`and(from_startup_id.eq.${selectedMyStartup},to_startup_id.eq.${matchedStartup.id}),and(from_startup_id.eq.${matchedStartup.id},to_startup_id.eq.${selectedMyStartup})`)
        .eq("status","accepted").maybeSingle()
      if (req) await supabase.from("collaborations").update({ ai_synergy_insight: data.insight }).eq("request_id", req.id)
    } catch { toast.error("Failed to generate insight") }
    finally { setLoadingInsight(null) }
  }

  const onConnect = async (targetItem) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return toast.error("Please log in")
    if (!selectedMyStartup) return toast.error("Select your project first")
    if (myStartups.some(s => s.id === targetItem.id)) return toast.error("That's your own startup!")
    const myProject = myStartups.find(s => s.id === selectedMyStartup)
    const score = Math.round((targetItem.similarity||0)*100)

    const { data: existing } = await supabase
      .from("collaboration_requests").select("id")
      .eq("from_startup_id", targetItem.id).eq("to_startup_id", selectedMyStartup)
      .eq("status","pending").single()

    if (existing) {
      await supabase.from("collaboration_requests").update({ status:"accepted" }).eq("id", existing.id)
      toast.success("Mutual interest detected! Collaboration accepted!")
      setSentRequests(prev => [...prev, targetItem.id])
      return
    }

    const { error } = await supabase.from("collaboration_requests").insert({
      from_startup_id: selectedMyStartup, to_startup_id: targetItem.id,
      status:"pending", match_score: targetItem.similarity||null,
      message: `AI Match: ${score>0 ? score+"%" : "New Connection"}. Request from ${myProject?.name}.`
    })
    if (error?.code === "23505") {
      toast.error("Already sent a request to this startup!")
      setSentRequests(prev => [...prev, targetItem.id])
    } else if (error) { toast.error("Failed to send request") }
    else {
      setSentRequests(prev => [...prev, targetItem.id])
      toast.success(`Request sent to ${targetItem.name}!`)
    }
  }

  // ── startup → talent ("Reach Out") ──────────────────────────────
  const onReachOutTalent = async (talent) => {
    if (myStartups.length === 0) return toast.error("Create a startup first")
    if (!selectedMyStartup) return toast.error("Select your startup first")
    const myProject = myStartups.find(s => s.id === selectedMyStartup)
    const { error } = await supabase.from("talent_requests").insert({
      from_startup_id: selectedMyStartup,
      to_talent_profile_id: talent.id,
      status: "pending",
      message: `${myProject?.name || "A startup"} is interested in working with you.`,
    })
    if (error?.code === "23505") {
      setSentTalentReqs(prev => [...prev, talent.id])
      toast.error("Already reached out to this talent")
    } else if (error) {
      toast.error("Failed to send request")
    } else {
      setSentTalentReqs(prev => [...prev, talent.id])
      toast.success(`Request sent to ${talent.full_name}!`)
    }
  }

  // ── user (investor / mentor) → startup ("Express Interest") ──────
  const onExpressInterest = async (startup) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return toast.error("Please log in")
    if (startup.created_by === user.id) return toast.error("That's your own startup!")
    if (myStartups.some(s => s.id === startup.id)) return toast.error("That's your own startup!")
    const type = "investment"
    const { error } = await supabase.from("investment_requests").insert({
      from_user_id: user.id,
      to_startup_id: startup.id,
      type,
      status: "pending",
      message: `Investment interest from ${user.user_metadata?.full_name || "a member"}.`,
    })
    if (error?.code === "23505") {
      setSentInvestReqs(prev => [...prev, startup.id])
      toast.error("Already expressed interest")
    } else if (error) {
      toast.error("Failed to send request")
    } else {
      setSentInvestReqs(prev => [...prev, startup.id])
      toast.success(`Interest sent to ${startup.name}!`)
    }
  }

  const filteredAll = useMemo(() => {
    const base = allStartups.filter(s => {
      const notMine    = s.created_by !== myUserId
      const matchStage = filterStage    ? s.stage === filterStage : true
      const matchLoc   = filterLocation ? s.location.toLowerCase().includes(filterLocation.toLowerCase()) : true
      return notMine && matchStage && matchLoc
    })
    if (!searchQuery.trim()) return base
    const fuse = new Fuse(base, { keys:["name","needs","offers","tech_stack","target_market"], threshold:0.35, ignoreLocation:true, minMatchCharLength:2 })
    return fuse.search(searchQuery).map(r => r.item)
  }, [allStartups, searchQuery, filterStage, filterLocation, myUserId])

  const aiResults = useMemo(() => ({
    direct:    aiMatches.filter(r => r.similarity >= 0.7),
    strategic: aiMatches.filter(r => r.similarity < 0.7 && r.similarity >= 0.4),
  }), [aiMatches])

  const seekingInvestment = useMemo(() =>
    filteredAll.filter(s => s.needs?.some(n => INVESTMENT_KEYWORDS.some(kw => n.toLowerCase().includes(kw)))),
    [filteredAll])

  const openPositions = useMemo(() =>
    filteredAll.filter(s => s.needs?.some(n => POSITION_KEYWORDS.some(kw => n.toLowerCase().includes(kw)))),
    [filteredAll])

  const filteredTalents = useMemo(() => {
    // Never show the current user's own talent profile in the list.
    const base = talentProfiles.filter(t => t.user_id !== myUserId)
    if (!searchQuery.trim()) return base
    const fuse = new Fuse(base, { keys:["full_name","tech_stack","pitch"], threshold:0.35, ignoreLocation:true })
    return fuse.search(searchQuery).map(r => r.item)
  }, [talentProfiles, searchQuery, myUserId])

  if (loading) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4" style={{ background: C.base }}>
      <div className="flex h-12 w-12 items-center justify-center rounded-lg animate-pulse" style={{ background: C.accent }}>
        <Zap className="h-6 w-6 text-white" />
      </div>
      <p className="syn-mono text-xs uppercase tracking-widest" style={{ color: C.muted }}>Loading ecosystem</p>
      <FontStyles />
    </div>
  )

  const currentList = activeTab === "investment" ? seekingInvestment
    : activeTab === "positions" ? openPositions : filteredAll

  return (
    <div className="min-h-screen" style={{ background: C.base, color: C.ink, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <FontStyles />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">

        {/* AI MATCH PANEL */}
        <div
          className="mb-10 rounded-lg p-8"
          style={{ background: C.ink, color: "#F5F2ED" }}
        >
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div>
              <div
                className="syn-mono mb-3 inline-flex items-center gap-2 rounded-md px-3 py-1 text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#9FE1CB", background: "rgba(29,158,117,0.14)", border: "1px solid rgba(159,225,203,0.2)" }}
              >
                <Sparkles className="h-3 w-3" /> Intelligent discovery
              </div>
              <h2 className="syn-display mb-1 text-2xl font-bold">Find your perfect match</h2>
              <p className="max-w-md text-sm" style={{ color: "#B8B0A4" }}>
                Select your project — we&apos;ll find startups whose offers complement your needs.
              </p>
            </div>
            <div className="flex w-full flex-shrink-0 flex-col gap-3 sm:flex-row md:w-auto">
              <Select value={selectedMyStartup} onValueChange={setSelectedMyStartup}>
                <SelectTrigger
                  className="h-11 w-full rounded-md text-sm sm:w-[240px]"
                  style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.14)", color: "#F5F2ED" }}
                >
                  <SelectValue placeholder="Choose your project" />
                </SelectTrigger>
                <SelectContent className="rounded-md" style={{ background: C.surface, color: C.ink }}>
                  {myStartups.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                onClick={handleSemanticMatch}
                disabled={isMatching || myStartups.length === 0}
                className="h-11 rounded-md px-7 font-semibold text-white transition-transform hover:scale-[1.02]"
                style={{ background: C.accent }}
              >
                {isMatching
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Matching…</>
                  : <><Target className="mr-2 h-4 w-4" />{myStartups.length === 0 ? "Create a startup first" : "Find partners"}</>}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">

          {/* MAIN COLUMN */}
          <div className="space-y-10 lg:col-span-8">

            {/* AI RESULTS */}
            {aiMatches.length > 0 && (
              <section className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="syn-mono flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: C.accentText }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: C.accent }} />
                    AI recommendations
                  </h3>
                  <button
                    onClick={() => setAiMatches([])}
                    className="flex items-center gap-1 text-xs transition-colors hover:opacity-70"
                    style={{ color: C.muted }}
                  >
                    <X size={12} /> Clear
                  </button>
                </div>
                <div className="space-y-4">
                  {aiResults.direct.map(item => (
                    <ResultCard key={item.id} item={item} highlight
                      onConnect={() => onConnect(item)} isSent={sentRequests.includes(item.id)}
                      insight={insights[item.id]} onGetInsight={() => fetchInsight(item)}
                      loadingInsight={loadingInsight === item.id}
                      expanded={expandedCard === item.id}
                      onToggleExpand={() => setExpandedCard(expandedCard === item.id ? null : item.id)} />
                  ))}
                  {aiResults.strategic.map(item => (
                    <ResultCard key={item.id} item={item}
                      onConnect={() => onConnect(item)} isSent={sentRequests.includes(item.id)}
                      insight={insights[item.id]} onGetInsight={() => fetchInsight(item)}
                      loadingInsight={loadingInsight === item.id}
                      expanded={expandedCard === item.id}
                      onToggleExpand={() => setExpandedCard(expandedCard === item.id ? null : item.id)} />
                  ))}
                </div>
              </section>
            )}

            {/* ECOSYSTEM SECTION */}
            <section className="space-y-5">
              <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: C.line }}>
                <h3 className="syn-display text-xl font-bold">Ecosystem projects</h3>
                <span className="syn-mono text-xs" style={{ color: C.muted }}>{currentList.length} found</span>
              </div>

              {/* Search + filters */}
              <div className="flex flex-wrap gap-3">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: C.muted }} />
                  <Input
                    placeholder="Search by name or tag…"
                    className="h-10 rounded-md pl-10 text-sm"
                    style={{ background: C.surface, borderColor: C.line }}
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <select
                  value={filterStage} onChange={e => setFilterStage(e.target.value)}
                  className="h-10 rounded-md px-3 text-sm focus:outline-none"
                  style={{ background: C.surface, border: `1px solid ${C.line}`, color: C.ink }}
                >
                  <option value="">All stages</option>
                  {["Idea","MVP","Seed","Growth"].map(s => <option key={s}>{s}</option>)}
                </select>
                <select
                  value={filterLocation} onChange={e => setFilterLocation(e.target.value)}
                  className="h-10 rounded-md px-3 text-sm focus:outline-none"
                  style={{ background: C.surface, border: `1px solid ${C.line}`, color: C.ink }}
                >
                  <option value="">All cities</option>
                  {["Astana","Almaty","Shymkent"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Tabs */}
              <div className="flex flex-wrap gap-2">
                {[
                  { key:"all",        label:"All projects",       count: filteredAll.length },
                  { key:"investment", label:"Seeking investment",  count: seekingInvestment.length },
                  { key:"positions",  label:"Open positions",     count: openPositions.length },
                ].map(tab => {
                  const active = activeTab === tab.key
                  return (
                    <button
                      key={tab.key} onClick={() => setActiveTab(tab.key)}
                      className="rounded-md px-4 py-1.5 text-sm font-semibold transition-all"
                      style={active
                        ? { background: C.ink, color: "#F5F2ED", border: `1px solid ${C.ink}` }
                        : { background: C.surface, color: C.inkSoft, border: `1px solid ${C.line}` }}
                    >
                      {tab.label}
                      <span className="syn-mono ml-1.5 text-xs" style={{ color: active ? "#9FE1CB" : C.muted }}>
                        {tab.count}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Cards */}
              <div className="space-y-4">
                {currentList.map(item => {
                  const isMine = myStartups.some(s => s.id === item.id)
                  // Talent never initiates contact with startups (resource-pull model).
                  const isTalent  = myRole === "talent"
                  const isInvestor = myRole === "investor"
                  const ctaMode = isInvestor ? "invest" : "connect"
                  return (
                    <ResultCard key={item.id} item={item}
                      ctaMode={ctaMode}
                      isMine={isMine}
                      canAct={!isTalent}
                      onConnect={() => isInvestor ? onExpressInterest(item) : onConnect(item)}
                      isSent={isInvestor ? sentInvestReqs.includes(item.id) : sentRequests.includes(item.id)}
                      expanded={expandedCard === item.id}
                      onToggleExpand={() => setExpandedCard(expandedCard === item.id ? null : item.id)} />
                  )
                })}

                {activeTab === "positions" && filteredTalents.length > 0 && (
                  <>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="h-px flex-1" style={{ background: C.line }} />
                      <p className="syn-mono text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>Available talent</p>
                      <div className="h-px flex-1" style={{ background: C.line }} />
                    </div>
                    {filteredTalents.map(t => (
                      <TalentCard key={t.id} talent={t}
                        canReachOut={myStartups.length > 0 && !!selectedMyStartup && t.user_id !== myUserId}
                        isSent={sentTalentReqs.includes(t.id)}
                        onReachOut={() => onReachOutTalent(t)} />
                    ))}
                  </>
                )}

                {currentList.length === 0 && (activeTab !== "positions" || filteredTalents.length === 0) && (
                  <div className="rounded-lg py-20 text-center" style={{ background: C.surfaceSoft, border: `1px dashed ${C.line}` }}>
                    <p className="text-sm" style={{ color: C.muted }}>No projects found</p>
                    {activeTab !== "all" && (
                      <button onClick={() => setActiveTab("all")} className="mt-3 text-xs hover:underline" style={{ color: C.accent }}>
                        View all projects →
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-6 lg:col-span-4">
            <div className="sticky top-24">
              <div className="rounded-lg p-6" style={{ background: C.ink, color: "#F5F2ED" }}>
                <div className="mb-5 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" style={{ color: "#9FE1CB" }} />
                  <span className="syn-display text-sm font-semibold">Market intelligence</span>
                </div>
                <div className="mb-3 grid grid-cols-2 gap-3">
                  <div className="rounded-md p-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <p className="syn-mono mb-1 text-[9px] uppercase tracking-widest" style={{ color: "#9FE1CB" }}>Startups</p>
                    <p className="syn-mono text-3xl font-medium">{stats.totalStartups}</p>
                  </div>
                  <div className="rounded-md p-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <p className="syn-mono mb-1 text-[9px] uppercase tracking-widest" style={{ color: "#9FE1CB" }}>Collabs</p>
                    <p className="syn-mono text-3xl font-medium">{stats.totalCollabs}</p>
                  </div>
                </div>
                {stats.topNeed && (
                  <div className="rounded-md p-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <p className="syn-mono mb-1 text-[9px] uppercase tracking-widest" style={{ color: "#9FE1CB" }}>Most wanted</p>
                    <p className="text-sm font-semibold">{stats.topNeed}</p>
                  </div>
                )}
                <p className="syn-mono mt-3 text-[11px]" style={{ color: "#8A8378" }}>
                  Real-time data based on {stats.totalStartups} active projects.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── RESULT CARD ────────────────────────────────────────────────────────── */
function ResultCard({ item, highlight=false, onConnect, isSent, insight, onGetInsight, loadingInsight, expanded, onToggleExpand, ctaMode="connect", isMine=false, canAct=true }) {
  const score   = item.similarity ? Math.round(item.similarity * 100) : null
  const ss      = stageStyle(item.stage)
  const isStrong = highlight && score >= 70
  const actLabelSm = ctaMode === "invest" ? "Express Interest" : "Connect"
  const actLabelLg = ctaMode === "invest" ? "Express interest in" : "Connect with"
  const sentLabel  = ctaMode === "invest" ? "Interest Sent" : "Request Sent"

  return (
    <div
      className={`group relative overflow-hidden rounded-lg transition-all duration-300
        ${expanded ? "" : "hover:-translate-y-0.5"} ${isSent ? "opacity-70" : ""}`}
      style={{
        background: C.surface,
        border: `1px solid ${isStrong ? C.accent : C.line}`,
      }}
    >
      {/* Direct match top stripe */}
      {isStrong && <div className="h-1 w-full" style={{ background: C.accent }} />}

      <div className="relative z-10 p-6">

        {/* ── Header row ── */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 cursor-pointer items-center gap-3.5" onClick={onToggleExpand}>
            <div
              className="syn-display flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md text-base font-bold text-white"
              style={{ background: isSent ? C.muted : C.ink }}
            >
              {item.name?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="syn-display truncate text-base font-semibold leading-tight">
                  {item.name}
                </h4>
                {item.bin_number && (
                  <span
                    className="syn-mono flex-shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-medium"
                    style={{ color: C.accentText, background: C.accentSoft }}
                  >✓ Verified</span>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium"
                  style={{ background: ss.bg, color: ss.text }}
                >
                  <span className="h-1 w-1 rounded-full" style={{ background: ss.dot }} />{item.stage}
                </span>
                <span className="flex items-center gap-1 text-[11px]" style={{ color: C.muted }}>
                  <Globe size={9} />{item.location}
                </span>
              </div>
            </div>
          </div>

          {/* Score + expand toggle */}
          <div className="flex flex-shrink-0 items-center gap-3">
            {score && (
              <div className="text-right">
                <p
                  className="syn-mono text-xl font-medium leading-none"
                  style={{ color: score >= 70 ? C.accent : C.muted }}
                >
                  {score}%
                </p>
                <p className="syn-mono text-[8px] uppercase tracking-widest" style={{ color: C.muted }}>match</p>
              </div>
            )}
            <button
              onClick={onToggleExpand}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md transition-colors"
              style={{ background: C.surfaceSoft, color: C.inkSoft, border: `1px solid ${C.line}` }}
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* ── Description ── */}
        <p
          onClick={onToggleExpand}
          className={`mb-4 cursor-pointer border-l-2 pl-3 text-sm leading-relaxed ${expanded ? "" : "line-clamp-2"}`}
          style={{ color: C.inkSoft, borderColor: isStrong ? C.accentSoft : C.lineSoft }}
        >
          {item.description}
        </p>

        {/* ── Expanded content ── */}
        {expanded && (
          <div className="mb-4 space-y-4">

            {/* Full needs + offers grid */}
            <div className="grid grid-cols-2 gap-4 rounded-md p-4" style={{ background: C.surfaceSoft, border: `1px solid ${C.lineSoft}` }}>
              {[
                { label:"Needs",  tags: item.needs },
                { label:"Offers", tags: item.offers },
              ].map(({ label, tags }) => (
                <div key={label}>
                  <p className="syn-mono mb-2 text-[9px] uppercase tracking-widest" style={{ color: C.muted }}>{label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(tags||[]).map((t,i) => (
                      <span
                        key={i}
                        className="rounded-md px-2 py-0.5 text-[10px] font-medium"
                        style={{ background: C.surface, color: C.inkSoft, border: `1px solid ${C.line}` }}
                      >{t}</span>
                    ))}
                    {(!tags||tags.length===0) && <span className="text-[10px] italic" style={{ color: C.muted }}>Not specified</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Tech stack + market */}
            {(item.tech_stack?.length > 0 || item.target_market?.length > 0) && (
              <div className="grid grid-cols-2 gap-4 px-1">
                {item.tech_stack?.length > 0 && (
                  <div>
                    <p className="syn-mono mb-1.5 text-[9px] uppercase tracking-widest" style={{ color: C.muted }}>Tech stack</p>
                    <div className="flex flex-wrap gap-1">
                      {item.tech_stack.map((t,i) => (
                        <span key={i} className="rounded-md px-2 py-0.5 text-[10px] font-medium" style={{ background: C.surfaceSoft, color: C.inkSoft, border: `1px solid ${C.line}` }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {item.target_market?.length > 0 && (
                  <div>
                    <p className="syn-mono mb-1.5 text-[9px] uppercase tracking-widest" style={{ color: C.muted }}>Market</p>
                    <div className="flex flex-wrap gap-1">
                      {item.target_market.map((t,i) => (
                        <span key={i} className="rounded-md px-2 py-0.5 text-[10px] font-medium" style={{ background: C.surfaceSoft, color: C.inkSoft, border: `1px solid ${C.line}` }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI Synergy Insight */}
            {insight ? (
              <div className="rounded-md p-4" style={{ background: C.accentSoft, border: `1px solid ${C.line}` }}>
                <p className="syn-mono mb-2 flex items-center gap-1.5 text-[9px] uppercase tracking-widest" style={{ color: C.accentText }}>
                  <Sparkles size={9} /> AI synergy insight
                </p>
                <p className="text-xs leading-relaxed" style={{ color: C.accentText }}>{insight}</p>
              </div>
            ) : onGetInsight && (
              <button
                onClick={onGetInsight} disabled={loadingInsight}
                className="flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-xs transition-colors"
                style={{ color: C.accentText, background: C.accentSoft, border: `1px solid ${C.line}` }}
              >
                {loadingInsight ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                {loadingInsight ? "Generating…" : "Generate AI synergy insight"}
              </button>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <div className={`flex items-center justify-between ${expanded ? "border-t pt-4" : "pt-0"}`} style={expanded ? { borderColor: C.lineSoft } : undefined}>
          {!expanded ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {item.offers?.slice(0,3).map((t,i) => (
                  <span key={i} className="rounded-md px-2 py-0.5 text-[10px] font-medium" style={{ background: C.surfaceSoft, color: C.inkSoft, border: `1px solid ${C.line}` }}>{t}</span>
                ))}
                {item.offers?.length > 3 && (
                  <span className="rounded-md px-2 py-0.5 text-[10px]" style={{ color: C.muted, border: `1px solid ${C.lineSoft}` }}>+{item.offers.length-3}</span>
                )}
              </div>
              {isMine ? (
                <span className="flex-shrink-0 rounded-md px-3 py-1.5 text-[10px] font-semibold" style={{ color: C.muted, background: C.surfaceSoft, border: `1px solid ${C.line}` }}>
                  Your project
                </span>
              ) : !canAct ? (
                <span className="flex-shrink-0 rounded-md px-3 py-1.5 text-[10px]" style={{ color: C.muted }}>
                  View only
                </span>
              ) : (
                <Button
                  size="sm" onClick={e => { e.stopPropagation(); onConnect() }} disabled={isSent}
                  className="flex-shrink-0 rounded-md px-5 text-xs font-semibold transition-all"
                  style={isSent
                    ? { background: C.accentSoft, color: C.accentText, border: `1px solid ${C.line}` }
                    : { background: C.accent, color: "#fff" }}
                >
                  {isSent ? <><Check size={11} className="mr-1" /> Sent</> : <>{actLabelSm} <ArrowRight size={11} className="ml-1" /></>}
                </Button>
              )}
            </>
          ) : (
            isMine ? (
              <div className="w-full rounded-md py-3 text-center text-xs font-semibold" style={{ color: C.muted, background: C.surfaceSoft, border: `1px solid ${C.line}` }}>
                This is your own project
              </div>
            ) : !canAct ? (
              <div className="w-full rounded-md py-3 text-center text-xs" style={{ color: C.muted, background: C.surfaceSoft, border: `1px solid ${C.line}` }}>
                Startups will reach out to you — no action needed here
              </div>
            ) : (
              <Button
                onClick={e => { e.stopPropagation(); onConnect() }} disabled={isSent}
                className="w-full rounded-md font-semibold transition-all"
                style={isSent
                  ? { background: C.accentSoft, color: C.accentText, border: `1px solid ${C.line}` }
                  : { background: C.accent, color: "#fff" }}
              >
                {isSent
                  ? <><Check size={14} className="mr-2" /> {sentLabel}</>
                  : <>{actLabelLg} {item.name} <ArrowRight size={14} className="ml-2" /></>}
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── TALENT CARD ────────────────────────────────────────────────────────── */
function TalentCard({ talent, canReachOut=false, isSent=false, onReachOut }) {
  return (
    <div className="rounded-lg p-6 transition-all" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3.5">
          <div
            className="syn-display flex h-11 w-11 items-center justify-center rounded-md text-lg font-bold text-white"
            style={{ background: C.ink }}
          >
            {talent.full_name?.[0]}
          </div>
          <div>
            <h4 className="syn-display text-base font-semibold leading-tight">{talent.full_name}</h4>
            <p className="mt-0.5 text-[11px]" style={{ color: C.muted }}>
              {talent.city} · {talent.level} {talent.role}
            </p>
          </div>
        </div>
        <span
          className="syn-mono rounded-md px-3 py-1 text-[10px] uppercase tracking-wider"
          style={{ background: C.accentSoft, color: C.accentText }}
        >
          {talent.role === "mentor" ? "Mentor" : "Talent"}
        </span>
      </div>
      {talent.pitch && (
        <p className="mb-4 line-clamp-2 border-l-2 pl-3 text-sm leading-relaxed" style={{ color: C.inkSoft, borderColor: C.accentSoft }}>
          {talent.pitch}
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {talent.tech_stack?.slice(0,4).map(t => (
          <span key={t} className="rounded-md px-2.5 py-0.5 text-[10px] font-medium" style={{ background: C.surfaceSoft, color: C.inkSoft, border: `1px solid ${C.line}` }}>{t}</span>
        ))}
        {talent.availability?.[0] && (
          <span className="rounded-md px-2.5 py-0.5 text-[10px] font-medium" style={{ background: C.accentSoft, color: C.accentText }}>
            {talent.availability[0]}
          </span>
        )}
      </div>
      {canReachOut && (
        <Button
          onClick={onReachOut} disabled={isSent}
          className="mt-4 w-full rounded-md font-semibold transition-all"
          style={isSent
            ? { background: C.accentSoft, color: C.accentText, border: `1px solid ${C.line}` }
            : { background: C.accent, color: "#fff" }}
        >
          {isSent ? <><Check size={14} className="mr-2" /> Request Sent</> : <>Reach Out <ArrowRight size={14} className="ml-2" /></>}
        </Button>
      )}
    </div>
  )
}

/* Font definitions. Add the Google Fonts <link> to index.html. */
function FontStyles() {
  return (
    <style>{`
      .syn-display { font-family: 'Space Grotesk', system-ui, sans-serif; }
      .syn-mono { font-family: 'JetBrains Mono', monospace; }
    `}</style>
  )
}
