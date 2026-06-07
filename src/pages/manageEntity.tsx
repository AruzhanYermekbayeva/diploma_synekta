import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Loader2, ArrowLeft, Inbox, Check, X, Zap, Globe, Mail, HandshakeIcon
} from "lucide-react"


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
  amberSoft: "#F0EBE2",
  danger: "#B23B3B",
  dangerSoft: "#F3E7E5",
}

interface CollaborationRequest {
  id: string
  status: string
  message: string
  created_at: string
  from_startup_id?: string
  from_entity: {
    id: string
    name: string
    type?: string
    description: string
    location: string
    contact_email?: string
  } | null
}

interface ActivePartner {
  requestId: string
  collabId?: string
  collabStatus?: string
  partner: {
    id: string
    name: string
    description?: string
    location?: string
  }
}

const OUTCOME_OPTIONS = [
  { value: "partnership", label: "Formal Partnership", desc: "Signed agreement or MOU" },
  { value: "product", label: "Joint Product", desc: "Co-developed product or feature" },
  { value: "grant", label: "Shared Grant", desc: "Joint application or funding" },
  { value: "none", label: "Didn't Work Out", desc: "No concrete result" },
]

// shared status pill styles
function statusPill(status: string) {
  if (status === "accepted") return { background: C.accentSoft, color: C.accentText }
  if (status === "declined") return { background: C.dangerSoft, color: C.danger }
  return { background: C.amberSoft, color: C.amber }
}

export default function ManageEntity() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [entity, setEntity] = useState<any>(null)
  const [requests, setRequests] = useState<CollaborationRequest[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([])
  const [investmentReqs, setInvestmentReqs] = useState<any[]>([])
  const [activePartners, setActivePartners] = useState<ActivePartner[]>([])

  // lifecycle dialog state
  const [endingPartner, setEndingPartner] = useState<ActivePartner | null>(null)
  const [selectedOutcome, setSelectedOutcome] = useState<string>("")
  const [isEnding, setIsEnding] = useState(false)

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)

    const { data: ent } = await supabase
      .from("startups")
      .select("*")
      .eq("id", id)
      .single()
    setEntity(ent)

    const { data: reqsRaw, error } = await supabase
      .from("collaboration_requests")
      .select("id, status, message, created_at, from_startup_id")
      .eq("to_startup_id", id)
      .order("created_at", { ascending: false })

    const { data: outRaw } = await supabase
      .from("collaboration_requests")
      .select("id, status, message, created_at, to_startup_id")
      .eq("from_startup_id", id)
      .order("created_at", { ascending: false })

    const partnerIds = [
      ...(reqsRaw || []).map((r: any) => r.from_startup_id),
      ...(outRaw || []).map((r: any) => r.to_startup_id),
    ].filter(Boolean)

    let partnersMap: Record<string, any> = {}
    if (partnerIds.length > 0) {
      const { data: partners } = await supabase
        .from("startups_public")
        .select("id, name, description, location")
        .in("id", partnerIds)
      partnersMap = Object.fromEntries((partners || []).map((p: any) => [p.id, p]))
    }

    const reqs = (reqsRaw || []).map((r: any) => ({
      ...r,
      from_entity: partnersMap[r.from_startup_id] || null,
    }))
    const outgoing = (outRaw || []).map((r: any) => ({
      ...r,
      to_entity: partnersMap[r.to_startup_id] || null,
    }))

    // Подтягиваем lifecycle-статусы коллабораций
    const acceptedRequestIds = [
      ...reqs.filter((r: any) => r.status === "accepted"),
      ...outgoing.filter((r: any) => r.status === "accepted"),
    ].map((r: any) => r.id)

    let collabsMap: Record<string, any> = {}
    if (acceptedRequestIds.length > 0) {
      const { data: collabs } = await supabase
        .from("collaborations")
        .select("id, request_id, status, outcome_type")
        .in("request_id", acceptedRequestIds)
      collabsMap = Object.fromEntries(
        (collabs || []).map((c: any) => [c.request_id, c])
      )
    }

    const acceptedIn = reqs
      .filter((r: any) => r.status === "accepted" && r.from_entity)
      .map((r: any) => ({
        requestId: r.id,
        collabId: collabsMap[r.id]?.id,
        collabStatus: collabsMap[r.id]?.status ?? "active",
        partner: r.from_entity,
      }))

    const acceptedOut = outgoing
      .filter((r: any) => r.status === "accepted" && r.to_entity)
      .map((r: any) => ({
        requestId: r.id,
        collabId: collabsMap[r.id]?.id,
        collabStatus: collabsMap[r.id]?.status ?? "active",
        partner: r.to_entity,
      }))

    const seen = new Set<string>()
    const partners = [...acceptedIn, ...acceptedOut].filter((p) => {
      if (seen.has(p.partner.id)) return false
      seen.add(p.partner.id)
      return true
    })

    if (!error) setRequests(reqs as any)
    setOutgoingRequests(outgoing as any)
    setActivePartners(partners as any)

    // investor / mentor interest in this startup
    const { data: invRaw } = await supabase
      .from("investment_requests")
      .select("id, status, message, type, created_at, from_user_id")
      .eq("to_startup_id", id)
      .order("created_at", { ascending: false })
    setInvestmentReqs(invRaw || [])

    setLoading(false)
  }

  const handleAction = async (requestId: string, newStatus: "accepted" | "declined") => {
    const { error } = await supabase
      .from("collaboration_requests")
      .update({ status: newStatus })
      .eq("id", requestId)

    if (error) {
      toast.error("Failed to update status")
    } else {
      toast.success(newStatus === "accepted" ? "Collaboration accepted!" : "Request declined")
      loadData()
    }
  }

  // ── investor / mentor requests ───────────────────────────────────
  const handleInvestmentAction = async (
    reqId: string,
    newStatus: "accepted" | "declined"
  ) => {
    const { error } = await supabase
      .from("investment_requests")
      .update({ status: newStatus })
      .eq("id", reqId)
    if (error) {
      toast.error("Failed to update request")
    } else {
      toast.success(newStatus === "accepted" ? "Accepted! You can now exchange contacts." : "Request declined")
      loadData()
    }
  }

  const revealInvestorEmail = async (reqId: string, type: string) => {
    const { data: email, error } = await supabase.rpc("get_investor_email", {
      request_id: reqId,
    })
    if (error || !email) {
      toast.error("Could not retrieve email")
      return
    }
    toast.info("Opening email client...")
    const subj = type === "mentorship" ? "Mentorship" : "Investment"
    window.location.href = `mailto:${email}?subject=${subj}: ${entity?.name}`
  }


  const contactPartner = async (partnerId: string, partnerName: string) => {
    const { data: email, error } = await supabase.rpc("get_partner_email", {
      my_startup_id: id,
      partner_startup_id: partnerId,
    })
    if (error || !email) {
      toast.error("Could not retrieve partner email")
      return
    }
    toast.info("Opening email client...")
    window.location.href = `mailto:${email}?subject=Collaboration: ${entity?.name} & ${partnerName}`
  }

  const handleEndCollaboration = async () => {
    if (!endingPartner?.collabId || !selectedOutcome) return

    if (!endingPartner?.collabId || !selectedOutcome) return
    setIsEnding(true)
    try {
      const { data: success, error } = await supabase.rpc("end_collaboration", {
        collab_id: endingPartner.collabId,
        p_outcome_type: selectedOutcome,
      })
      if (error || !success) {
        toast.error("Failed to end collaboration")
        return
      }
      toast.success("Collaboration ended", {
        description:
          selectedOutcome === "none"
            ? "Recorded as no concrete outcome."
            : `Outcome recorded: ${OUTCOME_OPTIONS.find((o) => o.value === selectedOutcome)?.label}`,
      })
      setEndingPartner(null)
      setSelectedOutcome("")
      loadData()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setIsEnding(false)
    }
  }

  if (loading)
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4" style={{ background: C.base }}>
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: C.accent }} />
        <p className="syn-mono text-xs uppercase tracking-widest" style={{ color: C.muted }}>Loading workspace</p>
        <FontStyles />
      </div>
    )

  const pendingRequests = requests.filter((r) => r.status === "pending" && r.from_entity)
  const pendingInvest = investmentReqs.filter((r) => r.status === "pending")
  const activeCount = activePartners.filter((p) => p.collabStatus === "active").length

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

  return (
    <div className="min-h-screen pb-20" style={{ background: C.base, color: C.ink, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <FontStyles />
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 gap-2"
          style={{ color: C.muted }}
        >
          <ArrowLeft size={16} /> Back to dashboard
        </Button>

        {/* Entity header */}
        <div className="mb-10 flex flex-col items-start justify-between gap-6 rounded-lg p-8 md:flex-row md:items-center"
          style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg text-white" style={{ background: C.ink }}>
              <Zap size={30} />
            </div>
            <div>
              <h1 className="syn-display text-3xl font-bold tracking-tight">{entity?.name}</h1>
              <div className="mt-1 flex items-center gap-3">
                <span className="flex items-center gap-1 text-sm" style={{ color: C.muted }}>
                  <Globe size={14} /> {entity?.location}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start rounded-md px-4 py-2 md:items-end"
            style={{ background: C.surfaceSoft, border: `1px solid ${C.line}` }}>
            <p className="syn-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: C.muted }}>Management mode</p>
            <p className="syn-display text-lg font-bold" style={{ color: C.accent }}>Active node</p>
          </div>
        </div>

        <Tabs defaultValue="pending" className="space-y-8">
          <TabsList className="w-full rounded-md p-1 md:w-auto" style={{ background: C.lineSoft }}>
            {[
              { v: "pending", label: `New requests (${pendingRequests.length})` },
              { v: "active", label: `Active partners (${activeCount})` },
              { v: "investors", label: `Investors & mentors (${pendingInvest.length})` },
              { v: "outgoing", label: `Sent (${outgoingRequests.length})` },
            ].map((t) => (
              <TabsTrigger
                key={t.v}
                value={t.v}
                className="rounded-md px-6 py-2 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* NEW REQUESTS */}
          <TabsContent value="pending" className="space-y-4 animate-in fade-in duration-500">
            {pendingRequests.map((req) => (
              <div key={req.id} className="rounded-lg p-6" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                <div className="flex flex-col justify-between gap-6 md:flex-row">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <p className="syn-display text-lg font-semibold">{req.from_entity!.name}</p>
                      {req.from_entity!.type && (
                        <span className="syn-mono rounded-md px-2 py-0.5 text-[10px] uppercase" style={{ color: C.accentText, background: C.accentSoft }}>
                          {req.from_entity!.type}
                        </span>
                      )}
                    </div>
                    <p className="rounded-md border-l-2 p-4 text-sm leading-relaxed" style={{ color: C.inkSoft, background: C.surfaceSoft, borderColor: C.accent }}>
                      {req.message || "No custom message provided."}
                    </p>
                    <p className="syn-mono text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>
                      Received: {fmtDate(req.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 md:items-start">
                    <Button
                      variant="outline"
                      className="rounded-md px-6"
                      style={{ borderColor: C.line, color: C.inkSoft }}
                      onClick={() => handleAction(req.id, "declined")}
                    >
                      <X size={18} className="mr-2" /> Decline
                    </Button>
                    <Button
                      className="rounded-md px-6 text-white transition-transform active:scale-95"
                      style={{ background: C.accent }}
                      onClick={() => handleAction(req.id, "accepted")}
                    >
                      <Check size={18} className="mr-2" /> Accept
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {pendingRequests.length === 0 && (
              <div className="rounded-lg py-20 text-center" style={{ background: C.surfaceSoft, border: `1px dashed ${C.line}` }}>
                <Inbox className="mx-auto mb-4 h-12 w-12" style={{ color: C.line }} />
                <p className="font-medium" style={{ color: C.muted }}>No pending requests at the moment.</p>
                <p className="mx-auto mt-1 max-w-xs text-xs" style={{ color: C.muted }}>
                  Try updating your project description in the Dashboard for better AI matching.
                </p>
              </div>
            )}
          </TabsContent>

          {/* ACTIVE PARTNERS */}
          <TabsContent value="active" className="animate-in fade-in duration-500">
            <div className="grid gap-4">
              {activePartners.map((ap) => {
                const isEnded = ap.collabStatus === "ended"
                return (
                  <div
                    key={ap.requestId}
                    className={`rounded-lg p-6 ${isEnded ? "opacity-60" : ""}`}
                    style={{ background: C.surface, border: `1px solid ${C.line}` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div
                          className="syn-display flex h-12 w-12 items-center justify-center rounded-md text-xl font-bold"
                          style={isEnded
                            ? { background: C.lineSoft, color: C.muted }
                            : { background: C.ink, color: "#fff" }}
                        >
                          {ap.partner.name?.[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="syn-display text-lg font-semibold leading-tight">{ap.partner.name}</p>
                            <span
                              className="syn-mono rounded-md px-2 py-0.5 text-[10px] uppercase"
                              style={isEnded ? { background: C.lineSoft, color: C.muted } : { background: C.accentSoft, color: C.accentText }}
                            >
                              {isEnded ? "Ended" : "Active"}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-xs" style={{ color: C.muted }}>Partnered connection</span>
                            <span style={{ color: C.line }}>•</span>
                            <span className="text-xs" style={{ color: C.muted }}>{ap.partner.location}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {!isEnded ? (
                          <>
                            <Button
                              className="gap-2 rounded-md text-white"
                              style={{ background: C.accent }}
                              onClick={() => contactPartner(ap.partner.id, ap.partner.name)}
                            >
                              <Mail size={16} /> Contact
                            </Button>
                            <Button
                              variant="outline"
                              className="gap-2 rounded-md"
                              style={{ borderColor: C.line, color: C.inkSoft }}
                              onClick={() => {
                                setEndingPartner(ap)
                                setSelectedOutcome("")
                              }}
                            >
                              <HandshakeIcon size={16} /> End
                            </Button>
                          </>
                        ) : (
                          <Button variant="ghost" className="gap-2 rounded-md" style={{ color: C.line }} disabled>
                            <Mail size={16} /> Contact
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {activePartners.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-sm" style={{ color: C.muted }}>No active collaborations yet.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* INVESTORS & MENTORS */}
          <TabsContent value="investors" className="space-y-4 animate-in fade-in duration-500">
            {investmentReqs.map((req) => (
              <div key={req.id} className="rounded-lg p-6" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                <div className="flex flex-col justify-between gap-6 md:flex-row">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <p className="syn-display text-lg font-semibold">
                        {req.type === "mentorship" ? "Mentorship interest" : "Investment interest"}
                      </p>
                      <span className="syn-mono rounded-md px-2 py-0.5 text-[10px] uppercase" style={{ color: C.accentText, background: C.accentSoft }}>
                        {req.type}
                      </span>
                      <span className="syn-mono rounded-md px-2 py-0.5 text-[10px] uppercase" style={statusPill(req.status)}>
                        {req.status}
                      </span>
                    </div>
                    <p className="rounded-md border-l-2 p-4 text-sm leading-relaxed" style={{ color: C.inkSoft, background: C.surfaceSoft, borderColor: C.accent }}>
                      {req.message || "No custom message provided."}
                    </p>
                    <p className="syn-mono text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>
                      Received: {fmtDate(req.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 md:items-start">
                    {req.status === "pending" && (
                      <>
                        <Button
                          variant="outline"
                          className="rounded-md px-6"
                          style={{ borderColor: C.line, color: C.inkSoft }}
                          onClick={() => handleInvestmentAction(req.id, "declined")}
                        >
                          <X size={18} className="mr-2" /> Decline
                        </Button>
                        <Button
                          className="rounded-md px-6 text-white transition-transform active:scale-95"
                          style={{ background: C.accent }}
                          onClick={() => handleInvestmentAction(req.id, "accepted")}
                        >
                          <Check size={18} className="mr-2" /> Accept
                        </Button>
                      </>
                    )}
                    {req.status === "accepted" && (
                      <Button
                        className="gap-2 rounded-md px-6 text-white"
                        style={{ background: C.ink }}
                        onClick={() => revealInvestorEmail(req.id, req.type)}
                      >
                        <Mail size={16} /> Get contact email
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {investmentReqs.length === 0 && (
              <div className="rounded-lg py-20 text-center" style={{ background: C.surfaceSoft, border: `1px dashed ${C.line}` }}>
                <Inbox className="mx-auto mb-4 h-12 w-12" style={{ color: C.line }} />
                <p className="font-medium" style={{ color: C.muted }}>No investor or mentor interest yet.</p>
                <p className="mx-auto mt-1 max-w-xs text-xs" style={{ color: C.muted }}>
                  Make sure your startup lists funding or mentorship in its needs.
                </p>
              </div>
            )}
          </TabsContent>

          {/* SENT */}
          <TabsContent value="outgoing" className="animate-in fade-in duration-500">
            <div className="grid gap-4">
              {outgoingRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between rounded-lg p-6" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                  <div className="flex items-center gap-5">
                    <div className="syn-display flex h-12 w-12 items-center justify-center rounded-md text-xl font-bold text-white" style={{ background: C.ink }}>
                      {req.to_entity?.name?.[0]}
                    </div>
                    <div>
                      <p className="syn-display text-lg font-semibold">{req.to_entity?.name ?? "Unknown"}</p>
                      <p className="text-xs" style={{ color: C.muted }}>{req.to_entity?.location}</p>
                      <p className="mt-1 text-[10px]" style={{ color: C.muted }}>{req.message}</p>
                    </div>
                  </div>
                  <span className="syn-mono rounded-md px-2.5 py-0.5 text-[10px] uppercase tracking-wider" style={statusPill(req.status)}>
                    {req.status}
                  </span>
                </div>
              ))}

              {outgoingRequests.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-sm" style={{ color: C.muted }}>No sent requests yet.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* END COLLABORATION DIALOG */}
      <Dialog
        open={!!endingPartner}
        onOpenChange={(open) => {
          if (!open) {
            setEndingPartner(null)
            setSelectedOutcome("")
          }
        }}
      >
        <DialogContent className="rounded-lg sm:max-w-md" style={{ background: C.surface, color: C.ink, borderColor: C.line }}>
          <DialogHeader>
            <DialogTitle className="syn-display text-xl font-bold">
              End collaboration with {endingPartner?.partner.name}?
            </DialogTitle>
            <p className="mt-1 text-sm" style={{ color: C.muted }}>
              Tell us what came out of this partnership. This helps improve future matches.
            </p>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            {OUTCOME_OPTIONS.map((option) => {
              const on = selectedOutcome === option.value
              return (
                <button
                  key={option.value}
                  onClick={() => setSelectedOutcome(option.value)}
                  className="w-full rounded-md p-4 text-left transition-all"
                  style={on
                    ? { border: `1px solid ${C.accent}`, background: C.accentSoft }
                    : { border: `1px solid ${C.line}`, background: C.surface }}
                >
                  <p className="syn-display text-sm font-semibold" style={{ color: on ? C.accentText : C.ink }}>
                    {option.label}
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: C.muted }}>{option.desc}</p>
                </button>
              )
            })}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-md"
              style={{ borderColor: C.line }}
              onClick={() => {
                setEndingPartner(null)
                setSelectedOutcome("")
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!selectedOutcome || isEnding}
              className="rounded-md text-white"
              style={{ background: C.accent }}
              onClick={handleEndCollaboration}
            >
              {isEnding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm & end
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
