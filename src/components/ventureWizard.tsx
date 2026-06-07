import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowRight, ArrowLeft, X, Plus, Check, Loader2, Zap,
  Rocket, MapPin, Tag, Users, Layers, Globe, Mail, Hash,
  Lightbulb, Wrench, Sprout, TrendingUp, AlertTriangle, type LucideIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  amber: "#9A6B2B",
};

interface WizardUser {
  id: string;
  email?: string;
}

interface VentureWizardProps {
  user: WizardUser | null;
  dbTags?: DbTags;
  onSave: (form: VentureForm) => Promise<void>;
  onCancel: () => void;
  editingData?: Partial<VentureForm> | null;
}

interface StepDef {
  id: string;
  label: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

interface TagColors {
  bg: string;
  text: string;
  dot: string;
}

/* ─── Presets ─── */
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

const STAGE_OPTIONS = [
  { value:"Idea",   icon:Lightbulb,  desc:"Pre-product, exploring the problem" },
  { value:"MVP",    icon:Wrench,     desc:"First version built and testing" },
  { value:"Seed",   icon:Sprout,     desc:"Some traction, raising funding" },
  { value:"Growth", icon:TrendingUp, desc:"Scaling users and revenue" },
];

// Earthy, low-saturation tints — distinct enough to track categories,
// quiet enough not to compete with the teal accent.
const TAG_COLORS: Record<string, TagColors> = {
  needs:         { bg:"#F2EBE6", text:"#9A5B33", dot:"#C97A45" }, // clay
  offers:        { bg:"#E8EFEC", text:"#0B5642", dot:"#1D9E75" }, // teal
  tech_stack:    { bg:"#ECEAE3", text:"#5A5246", dot:"#8A8378" }, // stone
  target_market: { bg:"#EAEEE6", text:"#4F6B2E", dot:"#7BA049" }, // sage
};

const STEPS: StepDef[] = [
  { id:"name",    label:"Name",    icon:Rocket,  title:"What's your venture called?",     subtitle:"Give it a name that sticks." },
  { id:"desc",    label:"About",   icon:Zap,     title:"Tell us what you're building.",   subtitle:"Be specific — this powers AI matching." },
  { id:"stage",   label:"Stage",   icon:Layers,  title:"Where are you right now?",        subtitle:"Pick the stage that fits best." },
  { id:"location",label:"City",    icon:MapPin,  title:"Where are you based?",            subtitle:"Helps connect you with local founders." },
  { id:"needs",   label:"Needs",   icon:Users,   title:"What do you need?",               subtitle:"Skills, roles, or resources you're looking for." },
  { id:"offers",  label:"Offers",  icon:Tag,     title:"What can you offer?",             subtitle:"Skills and expertise you bring to the table." },
  { id:"stack",   label:"Stack",   icon:Globe,   title:"Your tech stack.",                subtitle:"Tools and technologies you use." },
  { id:"market",  label:"Market",  icon:Globe,   title:"Your target market.",             subtitle:"Industry verticals and geographies." },
  { id:"contact", label:"Contact", icon:Mail,    title:"Last step — how to reach you.",   subtitle:"Your email and optional business number." },
];

const EMPTY_FORM: VentureForm = {
  name:"", description:"", stage:"Idea", location:"Astana",
  needs:[], offers:[], tech_stack:[], target_market:[],
  contact_email:"", bin_number:"",
};

/* ─── TagInput ─── */
interface TagInputProps {
  field: string;
  tags: string[];
  onAdd: (v: string) => void;
  onRemove: (i: number) => void;
  dbTags?: string[];
  placeholder: string;
}

function TagInput({ field, tags, onAdd, onRemove, dbTags = [], placeholder }: TagInputProps) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);

  const getSuggestions = useCallback((): string[] => {
    const combined = Array.from(new Set([...(PRESET_TAGS[field] ?? []), ...dbTags])).filter(t => !tags.includes(t));
    if (!input.trim()) return combined.slice(0, 8);
    const fuse = new Fuse(combined, { threshold: 0.35, ignoreLocation: true });
    const res = fuse.search(input).map(r => r.item);
    return (res.length ? res : combined.filter(t => t.toLowerCase().startsWith(input.toLowerCase()))).slice(0, 7);
  }, [input, field, tags, dbTags]);

  const suggestions = getSuggestions();
  const colors = TAG_COLORS[field] ?? TAG_COLORS.needs;

  const add = (val: string) => {
    if (!val.trim() || tags.includes(val.trim())) return;
    onAdd(val.trim());
    setInput("");
  };

  return (
    <div className="space-y-3">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t, i) => (
            <span key={i} onClick={() => onRemove(i)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all hover:opacity-60"
              style={{ background: colors.bg, color: colors.text }}>
              {t} <X size={9} />
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Input value={input}
          onChange={e => { setInput(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(input); } }}
          placeholder={placeholder}
          className="rounded-md pr-10 text-sm"
          style={{ background: C.surfaceSoft, border: `1px solid ${C.line}` }} />
        <button onClick={() => add(input)}
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md transition-colors"
          style={{ background: C.accentSoft, color: C.accentText }}>
          <Plus size={12} />
        </button>
        {open && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-lg"
            style={{ background: C.surface, border: `1px solid ${C.line}`, boxShadow: "0 12px 32px rgba(26,23,20,0.12)" }}>
            <p className="syn-mono px-3 pb-1 pt-2.5 text-[9px] uppercase tracking-widest" style={{ color: C.muted }}>
              {input.trim() ? "Suggestions" : "Popular"}
            </p>
            {suggestions.map(s => (
              <button key={s} onMouseDown={e => { e.preventDefault(); add(s); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[#FBFAF7]"
                style={{ color: C.inkSoft }}>
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: colors.dot }} />
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── StepContent ─── */
interface StepContentProps {
  step: StepDef;
  form: VentureForm;
  setForm: React.Dispatch<React.SetStateAction<VentureForm>>;
  dbTags: DbTags;
  userEmail?: string;
}

function StepContent({ step, form, setForm, dbTags, userEmail }: StepContentProps) {
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, [step.id]);

  if (step.id === "name") return (
    <Input ref={inputRef as React.RefObject<HTMLInputElement>}
      value={form.name}
      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
      className="syn-display h-16 rounded-lg px-5 text-2xl font-bold placeholder:text-xl placeholder:font-normal"
      style={{ background: C.surfaceSoft, border: `1px solid ${C.line}` }}
      placeholder="e.g. EduStream AI" />
  );

  if (step.id === "desc") return (
    <div className="space-y-3">
      <Textarea ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={form.description}
        onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
        rows={5} className="resize-none rounded-lg p-4 text-sm"
        style={{ background: C.surfaceSoft, border: `1px solid ${C.line}` }}
        placeholder="Describe what you do, who it's for, and the problem you solve." />
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: C.lineSoft }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (form.description.length / 200) * 100)}%`, background: C.accent }} />
        </div>
        <span className="syn-mono text-xs font-medium tabular-nums" style={{ color: form.description.length >= 200 ? C.accent : C.muted }}>
          {form.description.length} / 200
        </span>
        {form.description.length >= 200 && (
          <span className="flex items-center gap-1 text-xs font-medium" style={{ color: C.accent }}><Check size={11} /> Good</span>
        )}
      </div>
    </div>
  );

  if (step.id === "stage") return (
    <div className="grid grid-cols-2 gap-3">
      {STAGE_OPTIONS.map(s => {
        const Icon = s.icon;
        const active = form.stage === s.value;
        return (
          <button key={s.value} onClick={() => setForm(p => ({ ...p, stage: s.value }))}
            className="relative rounded-lg p-4 text-left transition-all duration-200"
            style={active
              ? { border: `1px solid ${C.accent}`, background: C.accentSoft }
              : { border: `1px solid ${C.line}`, background: C.surfaceSoft }}>
            {active && (
              <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full" style={{ background: C.accent }}>
                <Check size={10} className="text-white" />
              </span>
            )}
            <Icon size={22} className="mb-2" style={{ color: active ? C.accent : C.muted }} />
            <div className="syn-display text-sm font-semibold" style={{ color: C.ink }}>{s.value}</div>
            <div className="mt-0.5 text-[11px] leading-tight" style={{ color: C.muted }}>{s.desc}</div>
          </button>
        );
      })}
    </div>
  );

  if (step.id === "location") return (
    <div className="space-y-2">
      <Input ref={inputRef as React.RefObject<HTMLInputElement>}
        value={form.location}
        onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
        className="syn-display h-14 rounded-lg px-5 text-lg font-semibold"
        style={{ background: C.surfaceSoft, border: `1px solid ${C.line}` }}
        placeholder="e.g. Astana" />
      <p className="px-1 text-xs" style={{ color: C.muted }}>City or country where your startup is based.</p>
    </div>
  );

  const tagStepMap: Record<string, { field: keyof DbTags; key: keyof VentureForm; placeholder: string }> = {
    needs:  { field:"needs",         key:"needs",         placeholder:"e.g. Frontend Developer" },
    offers: { field:"offers",        key:"offers",        placeholder:"e.g. Machine Learning" },
    stack:  { field:"tech_stack",    key:"tech_stack",    placeholder:"e.g. React, Python" },
    market: { field:"target_market", key:"target_market", placeholder:"e.g. EdTech, B2B" },
  };

  const tagStep = tagStepMap[step.id];
  if (tagStep) {
    const tags = form[tagStep.key] as string[];
    return (
      <TagInput
        field={tagStep.field}
        tags={tags}
        onAdd={v => setForm(p => ({ ...p, [tagStep.key]: [...(p[tagStep.key] as string[]), v] }))}
        onRemove={i => setForm(p => ({ ...p, [tagStep.key]: (p[tagStep.key] as string[]).filter((_, j) => j !== i) }))}
        dbTags={dbTags[tagStep.field]}
        placeholder={tagStep.placeholder}
      />
    );
  }

  if (step.id === "contact") return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="syn-mono flex items-center gap-1.5 text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>
          <Mail size={10} /> Contact email
        </label>
        <Input ref={inputRef as React.RefObject<HTMLInputElement>}
          value={form.contact_email}
          onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))}
          className="rounded-md text-sm"
          style={{ background: C.surfaceSoft, border: `1px solid ${C.line}` }}
          placeholder={userEmail ?? "your@email.com"} />
      </div>
      <div className="space-y-1.5">
        <label className="syn-mono flex items-center gap-1.5 text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>
          <Hash size={10} /> BIN number <span className="ml-1 normal-case tracking-normal" style={{ color: C.line }}>(optional)</span>
        </label>
        <Input value={form.bin_number}
          onChange={e => setForm(p => ({ ...p, bin_number: e.target.value }))}
          className="rounded-md text-sm"
          style={{ background: C.surfaceSoft, border: `1px solid ${C.line}` }}
          placeholder="123456789012" maxLength={12} />
        <p className="text-[11px]" style={{ color: C.muted }}>Adds a verified ✓ badge to your project card.</p>
      </div>
    </div>
  );

  return null;
}

/* ─── Validation ─── */
function isStepValid(step: StepDef, form: VentureForm): boolean {
  if (step.id === "name")    return form.name.trim().length >= 2;
  if (step.id === "desc")    return form.description.length >= 200;
  if (step.id === "contact") return form.contact_email.includes("@");
  return true;
}

/* ─── Main Wizard ─── */
export function VentureWizard({ user, dbTags = { needs:[], offers:[], tech_stack:[], target_market:[] }, onSave, onCancel, editingData }: VentureWizardProps) {
  const [step, setStep]         = useState(0);
  const [dir, setDir]           = useState<1 | -1>(1);
  const [animating, setAnimating] = useState(false);
  const [visible, setVisible]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [form, setForm] = useState<VentureForm>(() => editingData ? {
    name:          editingData.name          ?? "",
    description:   editingData.description   ?? "",
    stage:         editingData.stage         ?? "Idea",
    location:      editingData.location      ?? "Astana",
    needs:         editingData.needs         ?? [],
    offers:        editingData.offers        ?? [],
    tech_stack:    editingData.tech_stack    ?? [],
    target_market: editingData.target_market ?? [],
    contact_email: editingData.contact_email ?? user?.email ?? "",
    bin_number:    editingData.bin_number    ?? "",
  } : { ...EMPTY_FORM, contact_email: user?.email ?? "" });

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const valid = isStepValid(currentStep, form);

  const go = (nextStep: number, direction: 1 | -1) => {
    if (animating) return;
    setSaveError(null);
    setAnimating(true);
    setDir(direction);
    setTimeout(() => { setStep(nextStep); setAnimating(false); }, 280);
  };

  const next = () => { if (valid && step < STEPS.length - 1) go(step + 1, 1); };
  const back = () => { if (step > 0) go(step - 1, -1); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && currentStep.id !== "desc") {
      e.preventDefault();
      if (valid && !isLast) next();
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(form);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setSaveError(
        msg.includes("Embedding") || msg.includes("embedding")
          ? "AI service is warming up — please try again in a moment."
          : "Could not save. Please check your connection and try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;
  const SKIP_STEPS = ["needs","offers","stack","market"];

  return (
    <div
      onKeyDown={handleKeyDown}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
        background: C.surface,
        border: `1px solid ${C.line}`,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
      className="relative flex flex-col rounded-lg shadow-xl"
    >
      <style>{`
        .syn-display { font-family: 'Space Grotesk', system-ui, sans-serif; }
        .syn-mono { font-family: 'JetBrains Mono', monospace; }
      `}</style>

      {/* Progress bar */}
      <div className="relative h-1.5 w-full flex-shrink-0 overflow-hidden rounded-t-lg" style={{ background: C.lineSoft }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%`, background: C.accent }}
        />
      </div>

      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between px-6 pb-0 pt-5">
        <div className="flex gap-1">
          {STEPS.map((s, i) => (
            <button key={s.id}
              onClick={() => i < step && go(i, -1)}
              className="h-1.5 rounded-full transition-all duration-300"
              style={
                i === step ? { width: "1.5rem", background: C.accent } :
                i < step   ? { width: "0.75rem", background: C.accentSoft, cursor: "pointer" } :
                             { width: "0.375rem", background: C.lineSoft }
              }
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="syn-mono text-[10px] tabular-nums" style={{ color: C.muted }}>{step + 1} / {STEPS.length}</span>
          <button onClick={onCancel}
            className="flex h-6 w-6 items-center justify-center rounded-md transition-colors"
            style={{ background: C.surfaceSoft, color: C.muted, border: `1px solid ${C.line}` }}>
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Step body */}
      <div className="flex-1 px-6 py-6">
        <div
          key={step}
          style={{
            opacity: animating ? 0 : 1,
            transform: animating ? `translateX(${dir > 0 ? "20px" : "-20px"})` : "translateX(0)",
            transition: "opacity 0.25s ease, transform 0.25s ease",
          }}
        >
          <div className="mb-5">
            <div className="syn-mono mb-3 inline-flex items-center gap-2 rounded-md px-3 py-1 text-[11px] uppercase tracking-[0.12em]"
              style={{ color: C.accentText, background: C.accentSoft, border: `1px solid ${C.line}` }}>
              {(() => { const Icon = currentStep.icon; return <Icon size={11} />; })()}
              {currentStep.label}
            </div>
            <h2 className="syn-display mb-1.5 text-xl font-bold leading-tight" style={{ color: C.ink }}>{currentStep.title}</h2>
            <p className="text-sm" style={{ color: C.muted }}>{currentStep.subtitle}</p>
          </div>

          <StepContent step={currentStep} form={form} setForm={setForm} dbTags={dbTags} userEmail={user?.email} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 space-y-2 px-6 pb-6 pt-2">
        {/* Inline validation hints */}
        {!valid && currentStep.id === "name" && form.name.length > 0 && (
          <p className="text-xs font-medium" style={{ color: C.amber }}>Name must be at least 2 characters.</p>
        )}
        {!valid && currentStep.id === "desc" && form.description.length > 0 && (
          <p className="text-xs font-medium" style={{ color: C.amber }}>Need {200 - form.description.length} more characters.</p>
        )}
        {!valid && currentStep.id === "contact" && form.contact_email.length > 0 && (
          <p className="text-xs font-medium" style={{ color: C.amber }}>Enter a valid email address.</p>
        )}

        {/* Save error with retry */}
        {saveError && (
          <div className="flex items-start gap-2 rounded-md px-3 py-2.5" style={{ background: "#F3E7E5", border: "1px solid #E4C9C5" }}>
            <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" style={{ color: "#B23B3B" }} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium" style={{ color: "#9A3B3B" }}>{saveError}</p>
              <button onClick={handleSave} className="mt-0.5 text-xs underline hover:opacity-70" style={{ color: "#B23B3B" }}>
                Try again
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2.5">
          {step > 0 && (
            <button onClick={back}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md transition-all"
              style={{ border: `1px solid ${C.line}`, color: C.inkSoft }}>
              <ArrowLeft size={16} />
            </button>
          )}

          {isLast ? (
            <button onClick={handleSave} disabled={saving || !valid}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md text-sm font-semibold text-white transition-all hover:scale-[1.01] disabled:scale-100 disabled:opacity-40"
              style={{ background: C.accent }}>
              {saving
                ? <><Loader2 size={15} className="animate-spin" /> Launching…</>
                : <><Rocket size={15} /> Launch venture</>}
            </button>
          ) : (
            <button onClick={next} disabled={!valid}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md text-sm font-semibold transition-all disabled:opacity-30"
              style={valid
                ? { background: C.accent, color: "white" }
                : { background: C.lineSoft, color: C.muted }}>
              Continue <ArrowRight size={15} />
            </button>
          )}
        </div>

        {SKIP_STEPS.includes(currentStep.id) && (
          <button onClick={next} className="w-full pt-0.5 text-center text-xs transition-colors hover:opacity-70" style={{ color: C.muted }}>
            Skip for now →
          </button>
        )}
      </div>
    </div>
  );
}
