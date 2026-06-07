import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Loader2, Plus, Edit2, ArrowRight, Trash2, Globe,
  Zap, ChevronLeft, ChevronRight, Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { VentureWizard } from "@/components/ventureWizard";
import { EditVentureModal } from "@/components/EditVentureModal";
import type { VentureForm, DbTags } from "@/venture";

/**
 * SynapseKZ — Dashboard
 *
 * Design system: "serious infrastructure", light.
 *   Base   : warm stone  #F5F2ED  (page)
 *   Surface: #FFFFFF / #FBFAF7 (cards)
 *   Ink    : #1A1714  (primary text / primary buttons)
 *   Accent : deep teal #0F6E56  (single signal color — actions, scores, active)
 *   Line   : #E4DFD5  (hairline borders)
 *   Mono   : JetBrains Mono for metrics + labels (add font link to index.html)
 *
 * NOTE: All data logic (embedding generation, pagination, role handling,
 * delete-confirm, wizard/edit modals) is unchanged from the original.
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
};

interface Startup {
  id: string;
  name: string;
  description: string;
  stage: string;
  location: string;
  needs: string[];
  offers: string[];
  tech_stack: string[];
  target_market: string[];
  contact_email: string;
  bin_number: string;
  created_at: string;
  created_by: string;
}

interface User {
  id: string;
  email?: string;
}

const PER_PAGE = 9;

// Stage colors — muted, on-stone palette. Each stage keeps an identity but
// stays in the warm/earthy family so nothing competes with the teal accent.
const STAGE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Idea:   { bg: "#F0EBE2", text: "#8A6D3B", dot: "#C9A05B" },
  MVP:    { bg: "#E8EFEC", text: "#0B5642", dot: "#1D9E75" },
  Seed:   { bg: "#EAEEE6", text: "#4F6B2E", dot: "#7BA049" },
  Growth: { bg: "#F2EBE6", text: "#9A5B33", dot: "#C97A45" },
};

function stageStyle(stage: string) {
  return STAGE_COLORS[stage] ?? STAGE_COLORS.Idea;
}

async function generateEmbedding(text: string, retries = 3): Promise<number[]> {
  let lastError: Error = new Error("Unknown error");
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-embedding`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ text: text.trim() }),
        }
      );
      if (!res.ok) {
        const body = await res.text();
        throw Object.assign(new Error(`HTTP ${res.status}: ${body.slice(0, 120)}`), { status: res.status });
      }
      const { embedding } = await res.json();
      if (!Array.isArray(embedding) || embedding.length !== 384) throw new Error(`Invalid shape: ${embedding?.length}`);
      return embedding as number[];
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) await new Promise(r => setTimeout(r, 1000 * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser]                     = useState<User | null>(null);
  const [entities, setEntities]             = useState<Startup[]>([]);
  const [loading, setLoading]               = useState(true);
  const [deletingId, setDeletingId]         = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null);
  const [page, setPage]                     = useState(1);
  const [dbTags, setDbTags]                 = useState<DbTags>({ needs:[], offers:[], tech_stack:[], target_market:[] });
  const [role, setRole]                     = useState<string>("founder");
  const [myInterests, setMyInterests]       = useState<any[]>([]);
  const [myTalentProfile, setMyTalentProfile] = useState<any>(null);
  const [talentRequests, setTalentRequests] = useState<any[]>([]);

  // Modal state
  const [showWizard, setShowWizard]         = useState(false);
  const [editingEntity, setEditingEntity]   = useState<Startup | null>(null); // null = new, set = edit

  const loadEntities = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("startups").select("*").eq("created_by", userId)
      .order("created_at", { ascending: false });
    if (error) toast.error("Error loading projects");
    else setEntities((data ?? []) as Startup[]);
  }, []);

  const loadDbTags = useCallback(async () => {
    const fields: (keyof DbTags)[] = ["needs", "offers", "tech_stack", "target_market"];
    const result = {} as DbTags;
    for (const f of fields) {
      const { data } = await supabase.rpc("get_distinct_tags", { field_name: f });
      result[f] = (data ?? []) as string[];
    }
    setDbTags(result);
  }, []);

  const loadMyInterests = useCallback(async (userId: string) => {
    const { data: reqs } = await supabase
      .from("investment_requests")
      .select("id, status, type, message, created_at, to_startup_id")
      .eq("from_user_id", userId)
      .order("created_at", { ascending: false });
    if (!reqs?.length) { setMyInterests([]); return; }

    const ids = [...new Set(reqs.map((r: any) => r.to_startup_id))];
    const { data: startups } = await supabase
      .from("startups_public")
      .select("id, name, description, location, stage")
      .in("id", ids);
    const map = Object.fromEntries((startups || []).map((s: any) => [s.id, s]));
    setMyInterests(reqs.map((r: any) => ({ ...r, startup: map[r.to_startup_id] || null })));
  }, []);

  const loadTalentProfile = useCallback(async (userId: string) => {
    const { data: profile } = await supabase
      .from("talent_profiles")
      .select("id, full_name, role, level, city")
      .eq("user_id", userId)
      .maybeSingle();
    setMyTalentProfile(profile ?? null);
    if (!profile) { setTalentRequests([]); return; }

    // pending incoming requests from startups to this talent profile
    const { data: reqs } = await supabase
      .from("talent_requests")
      .select("id, status, message, created_at, from_startup_id")
      .eq("to_talent_profile_id", profile.id)
      .order("created_at", { ascending: false });
    if (!reqs?.length) { setTalentRequests([]); return; }

    const ids = [...new Set(reqs.map((r: any) => r.from_startup_id))];
    const { data: startups } = await supabase
      .from("startups_public")
      .select("id, name, location")
      .in("id", ids);
    const map = Object.fromEntries((startups || []).map((s: any) => [s.id, s]));
    setTalentRequests(reqs.map((r: any) => ({ ...r, startup: map[r.from_startup_id] || null })));
  }, []);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (mounted) navigate("/login", { replace: true }); return; }
      if (mounted) {
        setUser(user as User);
        setRole((user.user_metadata?.role || "founder").toLowerCase());
        await loadEntities(user.id);
        await loadDbTags();
        await loadMyInterests(user.id);
        await loadTalentProfile(user.id);
        setLoading(false);
      }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") navigate("/login", { replace: true });
      else if (session?.user && mounted) { setUser(session.user as User); loadEntities(session.user.id); }
    });
    init();
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [navigate, loadEntities, loadDbTags, loadMyInterests, loadTalentProfile]);

  /* ── Save (create via wizard) ── */
  const handleWizardSave = async (form: VentureForm): Promise<void> => {
    // Save immediately without embedding
    const { data: saved, error } = await supabase
      .from("startups")
      .insert({ ...form, needs_embedding: null, offers_embedding: null, created_by: user!.id })
      .select("id").single();

    if (error) throw new Error(error.message);

    toast.success("Venture launched!");
    setShowWizard(false);
    await loadEntities(user!.id);
    await loadDbTags();

    // Embeddings in background
    const recordId = saved?.id;
    if (!recordId) return;
    (async () => {
      try {
        const [needsE, offersE] = await Promise.all([
          generateEmbedding(form.needs.join(" ") + " " + form.description),
          generateEmbedding(form.offers.join(" ") + " " + form.description),
        ]);
        await supabase.from("startups").update({ needs_embedding: needsE, offers_embedding: offersE }).eq("id", recordId);
      } catch (err) {
        console.error("Background embedding failed:", err);
      }
    })();
  };

  /* ── Save (edit via modal) ── */
  const handleEditSave = async (form: VentureForm): Promise<void> => {
    if (!editingEntity) return;

    const { error } = await supabase
      .from("startups")
      .update({ ...form, needs_embedding: null, offers_embedding: null })
      .eq("id", editingEntity.id);

    if (error) throw new Error(error.message);

    toast.success("Project updated!");
    setEditingEntity(null);
    await loadEntities(user!.id);
    await loadDbTags();

    // Re-generate embeddings in background
    (async () => {
      try {
        const [needsE, offersE] = await Promise.all([
          generateEmbedding(form.needs.join(" ") + " " + form.description),
          generateEmbedding(form.offers.join(" ") + " " + form.description),
        ]);
        await supabase.from("startups").update({ needs_embedding: needsE, offers_embedding: offersE }).eq("id", editingEntity.id);
      } catch (err) {
        console.error("Background embedding failed:", err);
      }
    })();
  };

  const respondToTalentRequest = async (reqId: string, status: "accepted" | "declined") => {
    const { error } = await supabase
      .from("talent_requests").update({ status }).eq("id", reqId);
    if (error) { toast.error("Failed to update request"); return; }
    toast.success(status === "accepted" ? "Accepted — you can now exchange contacts." : "Request declined");
    if (user) loadTalentProfile(user.id);
  };

  // Investor/mentor side: reveal the founder's email after their interest was accepted.
  const revealFounderEmail = async (reqId: string, startupName?: string) => {
    const { data: email, error } = await supabase.rpc("get_founder_email_for_investor", {
      request_id: reqId,
    });
    if (error || !email) { toast.error("Could not retrieve email"); return; }
    toast.info("Opening email client…");
    window.location.href = `mailto:${email}?subject=Interest in ${startupName ?? "your startup"}`;
  };

  const deleteEntity = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from("startups").delete().eq("id", id);
    if (!error) { setEntities(p => p.filter(e => e.id !== id)); toast.success("Deleted"); }
    setDeletingId(null);
    setDeleteCandidate(null);
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center" style={{ background: C.base }}>
      <div className="flex flex-col items-center gap-4">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-lg animate-pulse"
          style={{ background: C.accent }}
        >
          <Zap className="h-6 w-6 text-white" />
        </div>
        <p className="syn-mono text-xs uppercase tracking-widest" style={{ color: C.muted }}>
          Loading workspace
        </p>
      </div>
      <FontStyles />
    </div>
  );

  const totalPages = Math.ceil(entities.length / PER_PAGE);
  const paged      = entities.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="min-h-dvh" style={{ background: C.base, color: C.ink, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <FontStyles />

      {/* ── MAIN CONTENT ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <div
              className="syn-mono mb-3 inline-flex items-center gap-2 rounded-md px-3 py-1 text-[11px] uppercase tracking-[0.14em]"
              style={{ color: C.accentText, background: C.accentSoft, border: `1px solid ${C.line}` }}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: C.accent }} />
              My workspace
            </div>
            <h1 className="syn-display text-3xl font-bold leading-tight tracking-tight">
              {entities.length > 0 ? "Your workspace" : "Welcome to SynapseKZ"}
            </h1>
            <p className="mt-1.5 text-sm" style={{ color: C.muted }}>
              Everything you're working on across the ecosystem.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {entities.length > 0 && (
              <Badge
                variant="outline"
                className="syn-mono hidden px-3 py-1.5 text-xs sm:flex"
                style={{ color: C.inkSoft, background: C.surface, borderColor: C.line }}
              >
                {entities.length} {entities.length === 1 ? "project" : "projects"}
              </Badge>
            )}
            <Button
              onClick={() => setShowWizard(true)}
              className="h-10 gap-2 rounded-md px-5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
              style={{ background: C.accent }}
            >
              <Plus size={15} /> New venture
            </Button>
          </div>
        </div>

        {/* Investment / mentorship interest section — shown whenever the user
            has expressed any interest, regardless of role */}
        {myInterests.length > 0 && (
          <div className="mb-12">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="syn-mono text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: C.inkSoft }}>
                My investment & mentorship interest
              </h2>
              <span
                className="syn-mono rounded-md px-2 py-0.5 text-xs"
                style={{ color: C.accentText, background: C.accentSoft }}
              >
                {myInterests.length}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {myInterests.map((r) => {
                  const ss = stageStyle(r.startup?.stage);
                  const statusStyle =
                    r.status === "accepted" ? { color: C.accentText, bg: C.accentSoft }
                    : r.status === "declined" ? { color: "#9A3B3B", bg: "#F3E7E5" }
                    : { color: "#8A6D3B", bg: "#F0EBE2" };
                  return (
                    <div
                      key={r.id}
                      className="rounded-lg p-5"
                      style={{ background: C.surface, border: `1px solid ${C.line}` }}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className="syn-display flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md text-base font-bold text-white"
                            style={{ background: C.ink }}
                          >
                            {r.startup?.name?.charAt(0) ?? "?"}
                          </div>
                          <div className="min-w-0">
                            <h3 className="syn-display truncate text-base font-semibold leading-tight">
                              {r.startup?.name ?? "Unknown startup"}
                            </h3>
                            <div className="mt-0.5 flex items-center gap-1 text-xs" style={{ color: C.muted }}>
                              <Globe size={10} /><span className="truncate">{r.startup?.location}</span>
                            </div>
                          </div>
                        </div>
                        <span
                          className="syn-mono flex-shrink-0 rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wider"
                          style={{ color: statusStyle.color, background: statusStyle.bg }}
                        >
                          {r.status}
                        </span>
                      </div>
                      <p
                        className="mb-3 line-clamp-2 border-l-2 pl-3 text-xs leading-relaxed"
                        style={{ color: C.inkSoft, borderColor: C.accentSoft }}
                      >
                        {r.startup?.description}
                      </p>
                      <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: C.lineSoft }}>
                        <span
                          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-medium"
                          style={{ background: ss.bg, color: ss.text }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: ss.dot }} />{r.startup?.stage}
                        </span>
                        {r.status === "accepted" ? (
                          <Button
                            size="sm"
                            onClick={() => revealFounderEmail(r.id, r.startup?.name)}
                            className="h-8 gap-1.5 rounded-md text-xs font-semibold text-white"
                            style={{ background: C.accent }}
                          >
                            <Mail size={12} /> Contact
                          </Button>
                        ) : (
                          <span className="syn-mono text-[10px] uppercase capitalize" style={{ color: C.muted }}>{r.type}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
          </div>
        )}

        {/* Ventures grid */}
        {entities.length > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <h2 className="syn-mono text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: C.inkSoft }}>
              My projects
            </h2>
            <span className="syn-mono rounded-md px-2 py-0.5 text-xs" style={{ color: C.accentText, background: C.accentSoft }}>
              {entities.length}
            </span>
          </div>
        )}
        {entities.length === 0 ? (
          // If the user already has interests or a talent profile, keep this
          // prompt compact — they're clearly here for something else.
          (myInterests.length > 0 || myTalentProfile) ? (
            <div
              className="flex flex-col items-center gap-4 rounded-lg p-8 text-center sm:flex-row sm:justify-between sm:text-left"
              style={{ border: `1px dashed ${C.line}`, background: C.surfaceSoft }}
            >
              <div>
                <h3 className="syn-display text-base font-semibold" style={{ color: C.ink }}>Have a project of your own?</h3>
                <p className="mt-1 text-sm" style={{ color: C.muted }}>
                  Create a startup to unlock AI-powered partner matching.
                </p>
              </div>
              <Button
                onClick={() => setShowWizard(true)}
                className="h-10 flex-shrink-0 gap-2 rounded-md px-6 text-sm font-semibold text-white"
                style={{ background: C.accent }}
              >
                <Plus size={14} /> Create project
              </Button>
            </div>
          ) : (
          <div
            className="mx-auto max-w-lg rounded-lg p-16 text-center"
            style={{ border: `1px dashed ${C.line}`, background: C.surfaceSoft }}
          >
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg"
              style={{ background: C.accentSoft, border: `1px solid ${C.line}` }}
            >
              <Plus className="h-7 w-7" style={{ color: C.accent }} />
            </div>
            <h3 className="syn-display mb-1.5 text-xl font-bold" style={{ color: C.ink }}>Have a project of your own?</h3>
            <p className="mx-auto mb-5 max-w-xs text-sm" style={{ color: C.muted }}>
              Create a startup to unlock AI-powered partner matching and receive collaboration requests.
            </p>
            <Button
              onClick={() => setShowWizard(true)}
              className="h-10 gap-2 rounded-md px-6 text-sm font-semibold text-white"
              style={{ background: C.accent }}
            >
              <Plus size={14} /> Create project
            </Button>
          </div>
          )
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {paged.map(entity => {
                const ss = stageStyle(entity.stage);
                return (
                  <div
                    key={entity.id}
                    className="group relative rounded-lg p-5 transition-all duration-200 hover:-translate-y-0.5"
                    style={{ background: C.surface, border: `1px solid ${C.line}` }}
                  >
                    {/* Header */}
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className="syn-display flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md text-base font-bold text-white"
                          style={{ background: C.ink }}
                        >
                          {entity.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="syn-display truncate text-base font-semibold leading-tight">{entity.name}</h3>
                          <div className="mt-0.5 flex items-center gap-1 text-xs" style={{ color: C.muted }}>
                            <Globe size={10} /><span className="truncate">{entity.location}</span>
                          </div>
                        </div>
                      </div>
                      <div className="ml-2 flex flex-shrink-0 items-center gap-1.5">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-medium"
                          style={{ background: ss.bg, color: ss.text }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: ss.dot }} />{entity.stage}
                        </span>
                        {entity.bin_number && (
                          <span
                            className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
                            style={{ background: C.accentSoft, color: C.accentText }}
                            title="Verified"
                          >✓</span>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <p
                      className="mb-4 line-clamp-2 border-l-2 pl-3 text-xs leading-relaxed"
                      style={{ color: C.inkSoft, borderColor: C.accentSoft }}
                    >
                      {entity.description}
                    </p>

                    {/* Tags */}
                    <div className="mb-4 grid grid-cols-2 gap-3">
                      {[
                        { label: "Needs",  tags: entity.needs },
                        { label: "Offers", tags: entity.offers },
                      ].map(({ label, tags }) => (
                        <div key={label}>
                          <p className="syn-mono mb-1.5 text-[9px] uppercase tracking-[0.14em]" style={{ color: C.muted }}>{label}</p>
                          <div className="flex flex-wrap gap-1">
                            {(tags ?? []).slice(0, 3).map((t, i) => (
                              <span
                                key={i}
                                className="rounded-md px-2 py-0.5 text-[10px] font-medium"
                                style={{ background: C.surfaceSoft, color: C.inkSoft, border: `1px solid ${C.line}` }}
                              >{t}</span>
                            ))}
                            {(tags ?? []).length > 3 && (
                              <span className="rounded-md px-2 py-0.5 text-[10px] font-medium" style={{ color: C.muted, border: `1px solid ${C.lineSoft}` }}>+{tags.length - 3}</span>
                            )}
                            {(tags ?? []).length === 0 && <span className="text-[10px]" style={{ color: C.muted }}>—</span>}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 border-t pt-3" style={{ borderColor: C.lineSoft }}>
                      <Button
                        onClick={() => navigate(`/manage/${entity.id}`)}
                        size="sm"
                        className="h-8 flex-1 rounded-md text-xs font-semibold text-white"
                        style={{ background: C.accent }}
                      >
                        Manage <ArrowRight className="ml-1.5 h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setEditingEntity(entity)}
                        className="h-8 w-8 rounded-md"
                        style={{ borderColor: C.line, color: C.inkSoft }}
                      >
                        <Edit2 size={13} />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setDeleteCandidate(entity.id)}
                        disabled={deletingId === entity.id}
                        className="h-8 w-8 rounded-md"
                        style={{ borderColor: C.line, color: C.inkSoft }}
                      >
                        {deletingId === entity.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 size={13} />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <Button
                  variant="outline" size="icon"
                  onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="h-9 w-9 rounded-md" style={{ borderColor: C.line }}
                ><ChevronLeft size={14} /></Button>
                <span className="syn-mono text-sm" style={{ color: C.muted }}>{page} / {totalPages}</span>
                <Button
                  variant="outline" size="icon"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="h-9 w-9 rounded-md" style={{ borderColor: C.line }}
                ><ChevronRight size={14} /></Button>
              </div>
            )}
          </>
        )}

        {/* ── TALENT PROFILE SECTION — shown when the user has a talent profile ── */}
        {myTalentProfile && (
          <div className="mt-12">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="syn-mono text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: C.inkSoft }}>
                  My specialist profile
                </h2>
                {talentRequests.filter(r => r.status === "pending").length > 0 && (
                  <span className="syn-mono rounded-md px-2 py-0.5 text-xs" style={{ color: C.accentText, background: C.accentSoft }}>
                    {talentRequests.filter(r => r.status === "pending").length} new
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => navigate("/talent-profile")}
                className="h-9 gap-1.5 rounded-md text-xs"
                style={{ borderColor: C.line, color: C.inkSoft }}
              >
                Edit profile <ArrowRight size={13} />
              </Button>
            </div>

            <div className="rounded-lg p-5" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
              {/* profile summary row */}
              <div className="mb-4 flex items-center gap-3 border-b pb-4" style={{ borderColor: C.lineSoft }}>
                <div
                  className="syn-display flex h-10 w-10 items-center justify-center rounded-md text-base font-bold text-white"
                  style={{ background: C.ink }}
                >
                  {myTalentProfile.full_name?.charAt(0) ?? "?"}
                </div>
                <div>
                  <h3 className="syn-display text-base font-semibold leading-tight">{myTalentProfile.full_name}</h3>
                  <p className="text-xs capitalize" style={{ color: C.muted }}>
                    {myTalentProfile.level} {myTalentProfile.role} · {myTalentProfile.city}
                  </p>
                </div>
              </div>

              {/* incoming requests */}
              {talentRequests.length === 0 ? (
                <p className="py-2 text-sm" style={{ color: C.muted }}>
                  No requests from startups yet. A complete profile gets discovered faster.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="syn-mono text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>
                    Requests from startups
                  </p>
                  {talentRequests.map(r => (
                    <div key={r.id} className="flex items-center justify-between gap-3 rounded-md p-3" style={{ border: `1px solid ${C.line}` }}>
                      <div className="min-w-0">
                        <p className="syn-display truncate text-sm font-semibold">{r.startup?.name ?? "A startup"}</p>
                        {r.message && <p className="truncate text-xs" style={{ color: C.muted }}>{r.message}</p>}
                      </div>
                      {r.status === "pending" ? (
                        <div className="flex flex-shrink-0 gap-2">
                          <Button
                            size="sm"
                            onClick={() => respondToTalentRequest(r.id, "accepted")}
                            className="h-8 rounded-md text-xs font-semibold text-white"
                            style={{ background: C.accent }}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm" variant="outline"
                            onClick={() => respondToTalentRequest(r.id, "declined")}
                            className="h-8 rounded-md text-xs"
                            style={{ borderColor: C.line, color: C.inkSoft }}
                          >
                            Decline
                          </Button>
                        </div>
                      ) : (
                        <span
                          className="syn-mono flex-shrink-0 rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wider"
                          style={r.status === "accepted"
                            ? { color: C.accentText, background: C.accentSoft }
                            : { color: "#9A3B3B", background: "#F3E7E5" }}
                        >
                          {r.status}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── WIZARD OVERLAY (create) ── */}
      {showWizard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(26,23,20,0.55)", backdropFilter: "blur(6px)" }}
        >
          <div className="w-full max-w-md">
            <VentureWizard
              user={user}
              dbTags={dbTags}
              onSave={handleWizardSave}
              onCancel={() => setShowWizard(false)}
            />
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {editingEntity && (
        <EditVentureModal
          initialData={{
            name:          editingEntity.name,
            description:   editingEntity.description,
            stage:         editingEntity.stage,
            location:      editingEntity.location,
            needs:         editingEntity.needs ?? [],
            offers:        editingEntity.offers ?? [],
            tech_stack:    editingEntity.tech_stack ?? [],
            target_market: editingEntity.target_market ?? [],
            contact_email: editingEntity.contact_email ?? "",
            bin_number:    editingEntity.bin_number ?? "",
          }}
          dbTags={dbTags}
          onSave={handleEditSave}
          onCancel={() => setEditingEntity(null)}
        />
      )}

      {/* ── DELETE CONFIRM ── */}
      <Dialog open={!!deleteCandidate} onOpenChange={open => { if (!open) setDeleteCandidate(null); }}>
        <DialogContent className="rounded-lg sm:max-w-sm" style={{ background: C.surface, color: C.ink, borderColor: C.line }}>
          <DialogHeader>
            <DialogTitle className="syn-display text-lg font-bold">Delete project?</DialogTitle>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: C.muted }}>
              This cannot be undone. All collaboration requests for this project will also be removed.
            </p>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" className="rounded-md" style={{ borderColor: C.line }} onClick={() => setDeleteCandidate(null)}>Cancel</Button>
            <Button
              className="rounded-md text-white"
              style={{ background: "#B23B3B" }}
              disabled={!!deletingId}
              onClick={() => deleteCandidate && deleteEntity(deleteCandidate)}
            >
              {deletingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* Font + shared class definitions. Add the Google Fonts <link> to index.html:
   Space Grotesk (display), JetBrains Mono (mono), Inter (body). */
function FontStyles() {
  return (
    <style>{`
      .syn-display { font-family: 'Space Grotesk', system-ui, sans-serif; }
      .syn-mono { font-family: 'JetBrains Mono', monospace; }
    `}</style>
  );
}
