import { useState, useCallback } from "react";
import {
  X, Plus, Loader2, ArrowRight, Globe, Mail, Hash, Check
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Fuse from "fuse.js";
import type { VentureForm, DbTags } from "@/venture";


const C = {
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
  danger: "#B23B3B",
  dangerSoft: "#F3E7E5",
};

const PRESET_TAGS: Record<string, string[]> = {
  needs: [
    "Frontend Developer","Backend Developer","Fullstack Developer","Mobile Developer",
    "iOS Developer","Android Developer","UI/UX Designer","Graphic Designer",
    "ML Engineer","Data Scientist","DevOps Engineer","CTO","Technical Co-founder",
    "Investment","Investor","Funding","Grant","Legal Advisory","Marketing","Sales",
  ],
  offers: [
    "React","TypeScript","Next.js","Node.js","Python","Go","Flutter","React Native",
    "PostgreSQL","MongoDB","Redis","Supabase","Firebase","AWS","Docker","Kubernetes",
    "Machine Learning","NLP","Computer Vision","AI Consulting","Data Analysis",
    "UI/UX Design","Figma","Branding","B2B Sales","Marketing Strategy",
  ],
  tech_stack: [
    "React","Vue","Angular","Next.js","TypeScript","JavaScript","Node.js","Python","Go",
    "Flutter","React Native","PostgreSQL","MongoDB","Redis","AWS","GCP","Azure",
    "Docker","Kubernetes","TensorFlow","PyTorch","Supabase","Firebase","GraphQL",
  ],
  target_market: [
    "EdTech","FinTech","HealthTech","AgriTech","GreenTech","LegalTech","HRTech",
    "PropTech","SafetyTech","SmartCity","MentalHealth","DevTools","B2B","B2C","B2G",
    "Kazakhstan","Central Asia","CIS","International",
  ],
};

const STAGE_OPTIONS = ["Idea","MVP","Seed","Growth"];

// Earthy, low-saturation tints — same family as the wizard.
const TAG_STYLES: Record<string, { bg: string; text: string }> = {
  needs:         { bg: "#F2EBE6", text: "#9A5B33" }, // clay
  offers:        { bg: "#E8EFEC", text: "#0B5642" }, // teal
  tech_stack:    { bg: "#ECEAE3", text: "#5A5246" }, // stone
  target_market: { bg: "#EAEEE6", text: "#4F6B2E" }, // sage
};

interface InlineTagProps {
  field: string;
  tags: string[];
  onAdd: (v: string) => void;
  onRemove: (i: number) => void;
  dbTags?: string[];
  placeholder: string;
}

function InlineTagInput({ field, tags, onAdd, onRemove, dbTags = [], placeholder }: InlineTagProps) {
  const [input, setInput] = useState("");
  const [open, setOpen]   = useState(false);

  const suggestions = useCallback((): string[] => {
    const combined = Array.from(new Set([...(PRESET_TAGS[field] ?? []), ...dbTags])).filter(t => !tags.includes(t));
    if (!input.trim()) return combined.slice(0, 6);
    const fuse = new Fuse(combined, { threshold: 0.35, ignoreLocation: true });
    const res = fuse.search(input).map(r => r.item);
    return (res.length ? res : combined.filter(t => t.toLowerCase().startsWith(input.toLowerCase()))).slice(0, 6);
  }, [input, field, tags, dbTags])();

  const colors = TAG_STYLES[field] ?? TAG_STYLES.needs;

  const add = (val: string) => {
    if (!val.trim() || tags.includes(val.trim())) return;
    onAdd(val.trim()); setInput("");
  };

  return (
    <div className="space-y-2">
      <div className="flex min-h-[24px] flex-wrap gap-1.5">
        {tags.map((t, i) => (
          <span key={i} onClick={() => onRemove(i)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium transition-opacity hover:opacity-60"
            style={{ background: colors.bg, color: colors.text }}>
            {t} <X size={8} />
          </span>
        ))}
      </div>
      <div className="relative">
        <div className="flex gap-1.5">
          <Input value={input}
            onChange={e => { setInput(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(input); } }}
            placeholder={placeholder}
            className="h-8 flex-1 rounded-md text-xs"
            style={{ background: C.surfaceSoft, border: `1px solid ${C.line}` }} />
          <button onClick={() => add(input)}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md transition-colors"
            style={{ background: C.accentSoft, color: C.accentText }}>
            <Plus size={12} />
          </button>
        </div>
        {open && suggestions.length > 0 && (
          <div className="absolute left-0 right-8 top-full z-50 mt-1 overflow-hidden rounded-md"
            style={{ background: C.surface, border: `1px solid ${C.line}`, boxShadow: "0 12px 32px rgba(26,23,20,0.12)" }}>
            {suggestions.map(s => (
              <button key={s} onMouseDown={e => { e.preventDefault(); add(s); }}
                className="w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-[#FBFAF7]"
                style={{ color: C.inkSoft }}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface EditVentureModalProps {
  initialData: VentureForm;
  dbTags?: DbTags;
  onSave: (form: VentureForm) => Promise<void>;
  onCancel: () => void;
}

export function EditVentureModal({ initialData, dbTags = { needs:[], offers:[], tech_stack:[], target_market:[] }, onSave, onCancel }: EditVentureModalProps) {
  const [form, setForm]   = useState<VentureForm>(initialData);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.name.trim() || form.description.length < 200) return;
    setSaving(true); setError(null);
    try {
      await onSave(form);
    } catch (err) {
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const tagFields = [
    { key:"needs",         label:"Needs",         placeholder:"e.g. Frontend Developer" },
    { key:"offers",        label:"Offers",        placeholder:"e.g. Machine Learning" },
    { key:"tech_stack",    label:"Tech Stack",    placeholder:"e.g. React, Python" },
    { key:"target_market", label:"Target Market", placeholder:"e.g. EdTech, B2B" },
  ] as const;

  const valid = form.name.trim().length >= 2 && form.description.length >= 200 && form.contact_email.includes("@");

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(26,23,20,0.55)", backdropFilter: "blur(6px)", fontFamily: "'Inter', system-ui, sans-serif" }}>

      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg shadow-2xl"
        style={{ background: C.surface, border: `1px solid ${C.line}`, animation: "modalIn 0.25s cubic-bezier(0.34,1.56,0.64,1)" }}>

        <style>{`
          .syn-display { font-family: 'Space Grotesk', system-ui, sans-serif; }
          .syn-mono { font-family: 'JetBrains Mono', monospace; }
          @keyframes modalIn { from { opacity:0; transform:scale(0.96) translateY(8px) } to { opacity:1; transform:scale(1) translateY(0) } }
        `}</style>

        {/* Top bar (own clip for rounded top corners) */}
        <div className="h-1.5 w-full flex-shrink-0 overflow-hidden rounded-t-lg" style={{ background: C.accent }} />

        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b px-7 pb-4 pt-5" style={{ borderColor: C.lineSoft }}>
          <div>
            <h2 className="syn-display text-lg font-bold">Edit venture</h2>
            <p className="mt-0.5 text-xs" style={{ color: C.muted }}>Update your project details</p>
          </div>
          <button onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-md transition-colors"
            style={{ background: C.surfaceSoft, color: C.muted, border: `1px solid ${C.line}` }}>
            <X size={14} />
          </button>
        </div>

        {/* Scrollable body — note: overflow-y-auto clips horizontally too,
            but tag dropdowns open downward within this scroll area, which is fine. */}
        <div className="flex-1 space-y-5 overflow-y-auto px-7 py-5"
          style={{ scrollbarWidth:"thin" }}>

          {/* Name + Stage + City */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1 space-y-1.5">
              <Label className="syn-mono text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>Name</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="rounded-md text-sm" style={{ background: C.surfaceSoft, border: `1px solid ${C.line}` }} placeholder="Venture name" />
            </div>
            <div className="space-y-1.5">
              <Label className="syn-mono text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>Stage</Label>
              <select value={form.stage} onChange={e => setForm(p => ({ ...p, stage: e.target.value }))}
                className="h-9 w-full rounded-md px-3 text-sm focus:outline-none"
                style={{ background: C.surfaceSoft, border: `1px solid ${C.line}`, color: C.ink }}>
                {STAGE_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="syn-mono flex items-center gap-1 text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>
                <Globe size={9} /> City
              </Label>
              <Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                className="rounded-md text-sm" style={{ background: C.surfaceSoft, border: `1px solid ${C.line}` }} />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="syn-mono text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={4} className="resize-none rounded-md text-sm" style={{ background: C.surfaceSoft, border: `1px solid ${C.line}` }} />
            <div className="flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: C.lineSoft }}>
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (form.description.length / 200) * 100)}%`, background: C.accent }} />
              </div>
              <span className="syn-mono text-[11px] tabular-nums" style={{ color: form.description.length >= 200 ? C.accent : C.muted }}>
                {form.description.length} / 200
              </span>
              {form.description.length >= 200 && <Check size={11} className="flex-shrink-0" style={{ color: C.accent }} />}
            </div>
          </div>

          {/* Tags grid */}
          <div className="grid grid-cols-2 gap-5">
            {tagFields.map(f => (
              <div key={f.key} className="space-y-1.5">
                <Label className="syn-mono text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>{f.label}</Label>
                <InlineTagInput
                  field={f.key}
                  tags={form[f.key] as string[]}
                  onAdd={v => setForm(p => ({ ...p, [f.key]: [...(p[f.key] as string[]), v] }))}
                  onRemove={i => setForm(p => ({ ...p, [f.key]: (p[f.key] as string[]).filter((_,j) => j !== i) }))}
                  dbTags={dbTags[f.key === "tech_stack" ? "tech_stack" : f.key === "target_market" ? "target_market" : f.key as keyof DbTags]}
                  placeholder={f.placeholder}
                />
              </div>
            ))}
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="syn-mono flex items-center gap-1 text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>
                <Mail size={9} /> Contact email
              </Label>
              <Input value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))}
                className="rounded-md text-sm" style={{ background: C.surfaceSoft, border: `1px solid ${C.line}` }} placeholder="your@email.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="syn-mono flex items-center gap-1 text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>
                <Hash size={9} /> BIN <span className="normal-case tracking-normal" style={{ color: C.line }}>(optional)</span>
              </Label>
              <Input value={form.bin_number} onChange={e => setForm(p => ({ ...p, bin_number: e.target.value }))}
                className="rounded-md text-sm" style={{ background: C.surfaceSoft, border: `1px solid ${C.line}` }} placeholder="123456789012" maxLength={12} />
            </div>
          </div>

          {error && (
            <div className="rounded-md px-3 py-2.5 text-xs font-medium" style={{ background: C.dangerSoft, border: "1px solid #E4C9C5", color: "#9A3B3B" }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 gap-2.5 border-t px-7 py-4" style={{ borderColor: C.lineSoft }}>
          <Button variant="outline" onClick={onCancel} className="rounded-md" style={{ borderColor: C.line, color: C.inkSoft }}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !valid}
            className="h-10 flex-1 gap-2 rounded-md font-semibold text-white disabled:opacity-40"
            style={{ background: C.accent }}>
            {saving
              ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
              : <><ArrowRight size={14} /> Save changes</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
