import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Loader2, Save, Edit3, MapPin, X, Plus, Zap,
  Sparkles, ArrowLeft, CheckCircle2, AlertCircle,
  Inbox, Mail
} from "lucide-react"
import Fuse from "fuse.js"
import { Link } from "react-router-dom"


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
  amber: "#9A6B2B",
  danger: "#B23B3B",
}

const TECH_OPTIONS = [
  "React","Vue","Angular","Next.js","TypeScript","JavaScript",
  "Node.js","Python","Go","Rust","Java","Kotlin","Swift",
  "Flutter","React Native","PostgreSQL","MongoDB","Redis",
  "AWS","GCP","Azure","Docker","Kubernetes",
  "TensorFlow","PyTorch","scikit-learn","Hugging Face",
  "Figma","Tailwind CSS","GraphQL","REST API",
]
const COLLAB_TYPES = ["Equity","Salary","Barter","Mentorship","Freelance"]
const AVAILABILITY  = ["Full-time","Part-time","Weekend-only","Remote only"]
const LEVELS        = ["Junior","Middle","Senior","Lead"]

function calcScore(form) {
  let s = 0
  if (form.full_name)                       s += 15
  if (form.city)                            s += 5
  if (form.pitch && form.pitch.length > 80) s += 25
  if (form.tech_stack.length >= 3)          s += 25
  else if (form.tech_stack.length > 0)      s += 10
  if (form.collaboration_types.length > 0)  s += 15
  if (form.availability.length > 0)         s += 15
  return Math.min(s, 100)
}

export default function TalentProfile() {
  const navigate = useNavigate()
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [user, setUser]           = useState(null)
  const [hasProfile, setHasProfile] = useState(false)
  const [aiLoading, setAiLoading]   = useState(false)
  const [aiTips, setAiTips]         = useState([])
  const [tipsOpen, setTipsOpen]     = useState(false)
  const [profileId, setProfileId]   = useState(null)
  const [incoming, setIncoming]     = useState([])

  const [form, setForm] = useState({
    full_name:"", city:"Astana", role:"talent", level:"Middle",
    tech_stack:[], pitch:"", availability:[], collaboration_types:[], contact_email:"",
  })
  const [techInput, setTechInput]         = useState("")
  const [techSuggestions, setTechSuggestions] = useState([])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate("/login"); return }
      setUser(user)
      const meta = user.user_metadata || {}
      const { data: profile } = await supabase
        .from("talent_profiles").select("*").eq("user_id", user.id).maybeSingle()
      if (profile) {
        setHasProfile(true)
        setProfileId(profile.id)
        loadIncoming(profile.id)
        setForm({
          full_name: profile.full_name || meta.full_name || "",
          city: profile.city || meta.city || "Astana",
          role: profile.role || meta.role || "talent",
          level: profile.level || "Middle",
          tech_stack: profile.tech_stack || [],
          pitch: profile.pitch || "",
          availability: profile.availability || [],
          collaboration_types: profile.collaboration_types || [],
          contact_email: profile.contact_email || user.email || "",
        })
      } else {
        setIsEditing(true)
        setForm(p => ({
          ...p, full_name: meta.full_name || "", city: meta.city || "Astana",
          role: meta.role === "mentor" ? "mentor" : "talent", contact_email: user.email || "",
        }))
      }
      setLoading(false)
    }
    load()
  }, [navigate])

  const getTechSuggestions = (input) => {
    if (!input.trim()) { setTechSuggestions([]); return }
    const available = TECH_OPTIONS.filter(t => !form.tech_stack.includes(t))
    const fuse = new Fuse(available, { threshold:0.35, ignoreLocation:true })
    const results = fuse.search(input).map(r => r.item)
    setTechSuggestions((results.length ? results : available.filter(t => t.toLowerCase().startsWith(input.toLowerCase()))).slice(0,6))
  }

  const addTech = (tech) => {
    if (!tech.trim() || form.tech_stack.includes(tech)) return
    setForm(p => ({ ...p, tech_stack: [...p.tech_stack, tech] }))
    setTechInput(""); setTechSuggestions([])
  }

  const removeTech = (tech) => setForm(p => ({ ...p, tech_stack: p.tech_stack.filter(t => t !== tech) }))

  const toggleArray = (field, value) => {
    setForm(p => ({
      ...p, [field]: p[field].includes(value) ? p[field].filter(v => v !== value) : [...p[field], value],
    }))
  }

  const handleSave = async () => {
    if (!form.full_name.trim()) return toast.error("Please enter your name")
    setSaving(true)
    try {
      const payload = { ...form, user_id: user.id, updated_at: new Date().toISOString() }
      const { error } = hasProfile
        ? await supabase.from("talent_profiles").update(payload).eq("user_id", user.id)
        : await supabase.from("talent_profiles").insert(payload)
      if (error) throw error
      setHasProfile(true); setIsEditing(false)
      toast.success("Profile saved!")
    } catch { toast.error("Failed to save profile") }
    finally { setSaving(false) }
  }

  // ── Incoming requests (startups reaching out to this talent) ──────
  const loadIncoming = async (pid) => {
    const { data: reqs } = await supabase
      .from("talent_requests")
      .select("id, status, message, created_at, from_startup_id")
      .eq("to_talent_profile_id", pid)
      .order("created_at", { ascending: false })
    if (!reqs?.length) { setIncoming([]); return }

    const ids = [...new Set(reqs.map(r => r.from_startup_id))]
    const { data: startups } = await supabase
      .from("startups_public")
      .select("id, name, description, location")
      .in("id", ids)
    const map = Object.fromEntries((startups || []).map(s => [s.id, s]))
    setIncoming(reqs.map(r => ({ ...r, startup: map[r.from_startup_id] || null })))
  }

  const respondToRequest = async (req, status) => {
    const { error } = await supabase
      .from("talent_requests").update({ status }).eq("id", req.id)
    if (error) return toast.error("Failed to update request")
    toast.success(status === "accepted" ? "Accepted — you can now exchange contacts." : "Request declined")
    if (profileId) loadIncoming(profileId)
  }

  const revealStartupEmail = async (req) => {
    const { data: email, error } = await supabase.rpc(
      "get_startup_email_for_talent", { request_id: req.id })
    if (error || !email) return toast.error("Could not retrieve email")
    toast.info("Opening email client…")
    window.location.href = `mailto:${email}?subject=Re: your request — ${form.full_name}`
  }

  const generateAiTips = async () => {
    setAiLoading(true); setTipsOpen(true); setAiTips([])
    try {
      const prompt = `You are a startup ecosystem advisor. A user has a talent profile on a Kazakhstan IT startup matchmaking platform. Analyze their profile and give exactly 3 short, specific, actionable tips to improve their chances of being found and matched by startups. Be concrete, not generic. Reply ONLY with a JSON array of 3 strings, no markdown, no preamble.

Profile:
- Name: ${form.full_name || "not set"}
- Role: ${form.role} (${form.level})
- City: ${form.city || "not set"}
- Tech stack: ${form.tech_stack.length ? form.tech_stack.join(", ") : "empty"}
- Pitch: ${form.pitch ? `"${form.pitch.slice(0,200)}"` : "empty"}
- Availability: ${form.availability.join(", ") || "not set"}
- Collaboration types: ${form.collaboration_types.join(", ") || "not set"}`

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || "[]"
      const clean = text.replace(/```json|```/g, "").trim()
      setAiTips(JSON.parse(clean))
    } catch {
      setAiTips(["Add at least 3 technologies to your stack so startups can find you by skill.", "Write a pitch of 80+ characters describing what problem you love solving.", "Select your availability so founders know when you can start."])
    }
    finally { setAiLoading(false) }
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center" style={{ background: C.base }}>
      <div className="flex h-12 w-12 items-center justify-center rounded-lg animate-pulse" style={{ background: C.accent }}>
        <Zap className="h-6 w-6 text-white" />
      </div>
      <FontStyles />
    </div>
  )

  const score = calcScore(form)
  const scoreColor  = score < 50 ? C.amber : score < 80 ? C.accent : C.accent
  const scoreStroke = score < 50 ? "#C9A05B" : C.accent

  const hints = [
    { ok: !!form.full_name,                        label: "Full name set" },
    { ok: !!form.pitch && form.pitch.length >= 80,  label: "Pitch 80+ chars" },
    { ok: form.tech_stack.length >= 3,              label: "3+ technologies" },
    { ok: form.collaboration_types.length > 0,      label: "Collaboration type" },
    { ok: form.availability.length > 0,             label: "Availability set" },
  ]

  return (
    <div className="min-h-screen" style={{ background: C.base, color: C.ink, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <FontStyles />

      {/* PAGE HEADER */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md" style={{ borderBottom: `1px solid ${C.line}`, background: "rgba(245,242,237,0.82)" }}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="group flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md transition-transform group-hover:scale-105" style={{ background: C.accent }}>
              <Zap className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="syn-display text-xl font-bold tracking-tight">SynektaKZ</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="gap-1.5 text-sm" style={{ color: C.muted }}>
                <ArrowLeft size={14} /> Dashboard
              </Button>
            </Link>
            <Button
              onClick={() => isEditing ? handleSave() : setIsEditing(true)} disabled={saving}
              className="gap-2 rounded-md px-5 text-sm font-semibold text-white transition-all"
              style={{ background: C.accent }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : isEditing ? <Save size={14} /> : <Edit3 size={14} />}
              {isEditing ? "Save profile" : "Edit profile"}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">

        {/* HERO HEADER */}
        <div className="mb-8 rounded-lg p-8" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="flex items-center gap-6">
            <div
              className="syn-display flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg text-4xl font-bold text-white"
              style={{ background: C.ink }}
            >
              {form.full_name?.[0] || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="syn-mono mb-2 inline-flex items-center gap-2 rounded-md px-3 py-1 text-[11px] uppercase tracking-[0.12em]"
                style={{ color: C.accentText, background: C.accentSoft, border: `1px solid ${C.line}` }}
              >
                <Sparkles className="h-3 w-3" />
                {form.role === "mentor" ? "Mentor / Advisor" : "Talent profile"}
              </div>
              <h1 className="syn-display truncate text-3xl font-bold leading-tight">
                {form.full_name || "Your Name"}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm" style={{ color: C.muted }}>
                <span className="flex items-center gap-1"><MapPin size={12} />{form.city}</span>
                <span style={{ color: C.line }}>·</span>
                <span className="font-medium capitalize" style={{ color: C.inkSoft }}>{form.level} {form.role}</span>
                {form.availability[0] && (
                  <>
                    <span style={{ color: C.line }}>·</span>
                    <span className="font-medium" style={{ color: C.accent }}>{form.availability[0]}</span>
                  </>
                )}
              </div>
            </div>

            {/* Score ring */}
            <div className="flex flex-shrink-0 flex-col items-center gap-1">
              <div className="relative h-20 w-20">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke={C.lineSoft} strokeWidth="3.5" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke={scoreStroke} strokeWidth="3.5"
                    strokeDasharray={`${score}, 100`} strokeLinecap="round" style={{ transition:"stroke-dasharray 0.6s ease" }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="syn-mono text-xl font-medium" style={{ color: scoreColor }}>{score}%</span>
                </div>
              </div>
              <p className="syn-mono text-[10px] uppercase tracking-wide" style={{ color: C.muted }}>Profile</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

          {/* ── LEFT: main fields ── */}
          <div className="space-y-6 lg:col-span-2">

            {/* Incoming Requests */}
            <div className="rounded-lg p-7" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="syn-mono flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
                  <Inbox size={15} style={{ color: C.accent }} /> Incoming requests
                </h2>
                {incoming.length > 0 && (
                  <span className="syn-mono rounded-md px-2.5 py-0.5 text-xs" style={{ background: C.accentSoft, color: C.accentText }}>
                    {incoming.filter(r => r.status === "pending").length} new
                  </span>
                )}
              </div>

              {incoming.length === 0 && (
                <p className="text-sm" style={{ color: C.muted }}>
                  No requests yet. Complete your profile so startups can find you.
                </p>
              )}

              <div className="space-y-3">
                {incoming.map(req => (
                  <div key={req.id} className="rounded-md p-4" style={{ border: `1px solid ${C.line}` }}>
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="syn-display truncate font-semibold">
                          {req.startup?.name || "A startup"}
                        </p>
                        <p className="text-[11px]" style={{ color: C.muted }}>{req.startup?.location}</p>
                      </div>
                      <span
                        className="syn-mono flex-shrink-0 rounded-md px-2.5 py-0.5 text-[10px] uppercase tracking-wider"
                        style={
                          req.status === "accepted" ? { background: C.accentSoft, color: C.accentText }
                          : req.status === "declined" ? { background: "#F3E7E5", color: C.danger }
                          : { background: "#F0EBE2", color: C.amber }
                        }
                      >
                        {req.status}
                      </span>
                    </div>
                    {req.message && (
                      <p className="mb-3 border-l-2 pl-3 text-sm" style={{ color: C.inkSoft, borderColor: C.accentSoft }}>
                        {req.message}
                      </p>
                    )}

                    {req.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => respondToRequest(req, "accepted")}
                          className="rounded-md px-4 text-sm text-white"
                          style={{ background: C.accent }}
                        >
                          <CheckCircle2 size={14} className="mr-1.5" /> Accept
                        </Button>
                        <Button
                          onClick={() => respondToRequest(req, "declined")}
                          variant="outline"
                          className="rounded-md px-4 text-sm"
                          style={{ color: C.inkSoft, borderColor: C.line }}
                        >
                          <X size={14} className="mr-1.5" /> Decline
                        </Button>
                      </div>
                    )}

                    {req.status === "accepted" && (
                      <Button
                        onClick={() => revealStartupEmail(req)}
                        className="rounded-md px-4 text-sm text-white"
                        style={{ background: C.ink }}
                      >
                        <Mail size={14} className="mr-1.5" /> Get contact email
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Basic info */}
            <div className="rounded-lg p-7" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
              <h2 className="syn-mono mb-5 text-xs font-semibold uppercase tracking-[0.14em]">Basic information</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label:"Full name",      field:"full_name",     col:"col-span-1" },
                  { label:"City",           field:"city",          col:"col-span-1" },
                  { label:"Contact email",  field:"contact_email", col:"col-span-2" },
                ].map(({ label, field, col }) => (
                  <div key={field} className={`space-y-1.5 ${col}`}>
                    <Label className="syn-mono text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>{label}</Label>
                    <Input
                      value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                      disabled={!isEditing}
                      className="rounded-md text-sm disabled:opacity-60"
                      style={{ background: C.surfaceSoft, border: `1px solid ${C.line}` }}
                    />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <Label className="syn-mono text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>Role</Label>
                  <select
                    value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                    disabled={!isEditing}
                    className="h-9 w-full rounded-md px-3 text-sm focus:outline-none disabled:opacity-60"
                    style={{ background: C.surfaceSoft, border: `1px solid ${C.line}`, color: C.ink }}
                  >
                    <option value="talent">Talent / Specialist</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="syn-mono text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>Level</Label>
                  <select
                    value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))}
                    disabled={!isEditing}
                    className="h-9 w-full rounded-md px-3 text-sm focus:outline-none disabled:opacity-60"
                    style={{ background: C.surfaceSoft, border: `1px solid ${C.line}`, color: C.ink }}
                  >
                    {LEVELS.map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Pitch */}
            <div className="rounded-lg p-7" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="syn-mono text-xs font-semibold uppercase tracking-[0.14em]">Your pitch</h2>
                <span className="syn-mono text-xs tabular-nums" style={{ color: form.pitch.length >= 80 ? C.accent : C.muted }}>
                  {form.pitch.length} / 80
                </span>
              </div>
              <Textarea
                value={form.pitch} onChange={e => setForm(p => ({ ...p, pitch: e.target.value }))}
                disabled={!isEditing} rows={4}
                className="resize-none rounded-md text-sm disabled:opacity-60"
                style={{ background: C.surfaceSoft, border: `1px solid ${C.line}` }}
                placeholder="What do you do, what problems do you love solving, and what kind of startup would you join?" />
              {isEditing && form.pitch.length < 80 && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px]" style={{ color: C.amber }}>
                  <AlertCircle size={11} /> Add at least 80 characters to stand out in search
                </p>
              )}
            </div>

            {/* Tech Stack */}
            <div className="rounded-lg p-7" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
              <h2 className="syn-mono mb-4 text-xs font-semibold uppercase tracking-[0.14em]">Tech stack</h2>
              {isEditing && (
                <div className="relative mb-4">
                  <div className="flex gap-2">
                    <Input
                      value={techInput}
                      onChange={e => { setTechInput(e.target.value); getTechSuggestions(e.target.value) }}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTech(techInput) } }}
                      placeholder="Type or choose a technology…"
                      className="rounded-md text-sm"
                      style={{ background: C.surfaceSoft, border: `1px solid ${C.line}` }} />
                    <button
                      onClick={() => addTech(techInput)}
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md transition-colors"
                      style={{ background: C.accentSoft, color: C.accentText }}>
                      <Plus size={15} />
                    </button>
                  </div>
                  {techSuggestions.length > 0 && (
                    <div
                      className="absolute left-0 right-10 top-full z-50 mt-1 overflow-hidden rounded-lg"
                      style={{ background: C.surface, border: `1px solid ${C.line}`, boxShadow: "0 12px 32px rgba(26,23,20,0.12)" }}>
                      {techSuggestions.map(s => (
                        <button key={s} onMouseDown={e => { e.preventDefault(); addTech(s) }}
                          className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[#FBFAF7]"
                          style={{ color: C.inkSoft }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {form.tech_stack.map(tech => (
                  <span key={tech} onClick={() => isEditing && removeTech(tech)}
                    className={`inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium ${isEditing ? "cursor-pointer transition-colors hover:opacity-60" : ""}`}
                    style={{ background: C.accentSoft, color: C.accentText }}>
                    {tech} {isEditing && <X size={10} />}
                  </span>
                ))}
                {form.tech_stack.length === 0 && (
                  <p className="text-sm" style={{ color: C.muted }}>No technologies added yet</p>
                )}
              </div>
              {isEditing && form.tech_stack.length < 3 && form.tech_stack.length > 0 && (
                <p className="mt-3 flex items-center gap-1.5 text-[11px]" style={{ color: C.amber }}>
                  <AlertCircle size={11} /> Add {3 - form.tech_stack.length} more to boost discoverability
                </p>
              )}
            </div>
          </div>

          {/* ── RIGHT: sidebar ── */}
          <div className="space-y-6">

            {/* Completeness checklist */}
            <div className="rounded-lg p-6" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
              <h2 className="syn-mono mb-4 text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>Profile completeness</h2>
              <div className="space-y-2.5">
                {hints.map(({ ok, label }) => (
                  <div key={label} className="flex items-center gap-2.5 text-sm" style={{ color: ok ? C.inkSoft : C.muted }}>
                    {ok
                      ? <CheckCircle2 size={15} className="flex-shrink-0" style={{ color: C.accent }} />
                      : <div className="h-3.5 w-3.5 flex-shrink-0 rounded-full" style={{ border: `2px solid ${C.line}` }} />}
                    <span className={ok ? "font-medium" : ""}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Tips */}
            <div className="overflow-hidden rounded-lg" style={{ background: C.ink, color: "#F5F2ED" }}>
              <div className="p-6">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" style={{ color: "#9FE1CB" }} />
                  <span className="syn-display text-sm font-semibold">AI profile tips</span>
                </div>
                <p className="mb-4 text-xs leading-relaxed" style={{ color: "#B8B0A4" }}>
                  Get personalised advice on how to improve your profile and get discovered by more startups.
                </p>
                <button
                  onClick={generateAiTips} disabled={aiLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
                  style={{ background: C.accent }}>
                  {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {aiLoading ? "Analysing profile…" : "Generate tips"}
                </button>
              </div>

              {/* Tips list */}
              {tipsOpen && (
                <div className="space-y-3 px-6 pb-6">
                  {aiLoading ? (
                    [1,2,3].map(i => (
                      <div key={i} className="h-14 animate-pulse rounded-md" style={{ background: "rgba(255,255,255,0.05)" }} />
                    ))
                  ) : aiTips.map((tip, i) => (
                    <div key={i} className="flex gap-3 rounded-md p-3.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <span
                        className="syn-mono flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                        style={{ background: "rgba(29,158,117,0.25)", color: "#9FE1CB" }}>
                        {i+1}
                      </span>
                      <p className="text-xs leading-relaxed" style={{ color: "#D8D2C8" }}>{tip}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Collaboration */}
            <div className="space-y-6 rounded-lg p-6" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
              <div>
                <h2 className="syn-mono mb-3 text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>Collaboration type</h2>
                <div className="space-y-2">
                  {COLLAB_TYPES.map(type => {
                    const on = form.collaboration_types.includes(type)
                    return (
                      <button key={type} onClick={() => isEditing && toggleArray("collaboration_types", type)}
                        className={`flex w-full items-center justify-between rounded-md px-3.5 py-2 text-left text-sm transition-all ${isEditing ? "cursor-pointer" : "cursor-default"}`}
                        style={on
                          ? { background: C.accentSoft, border: `1px solid ${C.accent}`, color: C.accentText, fontWeight: 500 }
                          : { background: C.surfaceSoft, border: `1px solid ${C.line}`, color: C.inkSoft }}>
                        {type}
                        {on && <CheckCircle2 size={13} style={{ color: C.accent }} />}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <h2 className="syn-mono mb-3 text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>Availability</h2>
                <div className="space-y-2">
                  {AVAILABILITY.map(type => {
                    const on = form.availability.includes(type)
                    return (
                      <button key={type} onClick={() => isEditing && toggleArray("availability", type)}
                        className={`flex w-full items-center justify-between rounded-md px-3.5 py-2 text-left text-sm transition-all ${isEditing ? "cursor-pointer" : "cursor-default"}`}
                        style={on
                          ? { background: C.accentSoft, border: `1px solid ${C.accent}`, color: C.accentText, fontWeight: 500 }
                          : { background: C.surfaceSoft, border: `1px solid ${C.line}`, color: C.inkSoft }}>
                        {type}
                        {on && <CheckCircle2 size={13} style={{ color: C.accent }} />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
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
