import { Button } from "@/components/ui/button"
import {
  ArrowRight, ArrowUpRight, Brain, ShieldCheck, MapPin,
  Search, Zap, Check
} from "lucide-react"
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
}

const features = [
  {
    icon: Brain,
    code: "01 / MATCH",
    title: "Semantic matching",
    desc: "A multilingual transformer reads what your venture actually needs against what others offer — beyond keyword overlap.",
  },
  {
    icon: ShieldCheck,
    code: "02 / TRUST",
    title: "Private handshake",
    desc: "Contact details stay sealed until both sides accept. Mutual interest is confirmed before anything is exposed.",
  },
  {
    icon: MapPin,
    code: "03 / LOCAL",
    title: "KZ-native infrastructure",
    desc: "BIN verification, local-market filters, coverage across Astana, Almaty and Shymkent. Built for the KZ ecosystem.",
  },
]

const steps = [
  { n: "01", title: "Define your profile", desc: "List what your venture needs and what it offers. The engine handles representation." },
  { n: "02", title: "Receive ranked matches", desc: "Composite scoring blends semantic similarity with stage, market and stack alignment." },
  { n: "03", title: "Connect on mutual accept", desc: "Send a request. On acceptance, contacts unlock for both parties. Build together." },
]

const metrics = [
  { value: "300+", label: "VERIFIED FOUNDERS" },
  { value: "87%", label: "AVG MATCH PRECISION" },
  { value: "20", label: "KZ VENTURES INDEXED" },
  { value: "3", label: "CITIES COVERED" },
]

export default function Landing() {
  const year = new Date().getFullYear()

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: C.base, color: C.ink, fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <style>{`
        .syn-display { font-family: 'Space Grotesk', system-ui, sans-serif; }
        .syn-mono { font-family: 'JetBrains Mono', monospace; }
        .syn-grid-bg {
          background-image:
            linear-gradient(${C.line} 1px, transparent 1px),
            linear-gradient(90deg, ${C.line} 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, #000 35%, transparent 100%);
          -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, #000 35%, transparent 100%);
          opacity: 0.7;
        }
        @keyframes syn-rise {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .syn-rise { animation: syn-rise 0.6s cubic-bezier(0.22,1,0.36,1) both; }
        .syn-link-underline { position: relative; }
        .syn-link-underline::after {
          content: ""; position: absolute; left: 0; bottom: -2px;
          width: 0; height: 1px; background: ${C.accent}; transition: width 0.25s ease;
        }
        .syn-link-underline:hover::after { width: 100%; }
      `}</style>

      {/* NAVBAR */}
      <header
        className="sticky top-0 z-50 w-full backdrop-blur-md"
        style={{ borderBottom: `1px solid ${C.line}`, background: "rgba(245,242,237,0.82)" }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md" style={{ background: C.accent }}>
              <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="syn-display text-lg font-bold tracking-tight">SynektaKz</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {[
              { label: "Platform", href: "#features" },
              { label: "Process", href: "#how-it-works" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="syn-link-underline syn-mono text-xs uppercase tracking-widest transition-colors"
                style={{ color: C.muted }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="hidden sm:flex" style={{ color: C.inkSoft }}>
              <Link to="/login" className="syn-mono text-xs uppercase tracking-wider">Log in</Link>
            </Button>
            <Button
              size="sm"
              asChild
              className="rounded-md px-4 font-semibold text-white transition-transform hover:scale-[1.02]"
              style={{ background: C.accent }}
            >
              <Link to="/register" className="gap-1.5">
                Join <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="syn-grid-bg pointer-events-none absolute inset-0" />

          <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-24 md:pt-28">
            {/* Eyebrow */}
            <div
              className="syn-rise mb-8 inline-flex items-center gap-2 rounded-md px-3 py-1.5"
              style={{ border: `1px solid ${C.line}`, background: C.surface, animationDelay: "0ms" }}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: C.accent }} />
              <span className="syn-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: C.accentText }}>
                Infrastructure for KZ tech
              </span>
            </div>

            {/* Headline */}
            <h1
              className="syn-display syn-rise max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl"
              style={{ animationDelay: "60ms" }}
            >
              The matching layer for Kazakhstan&apos;s{" "}
              <span style={{ color: C.accent }}>startup ecosystem.</span>
            </h1>

            <p
              className="syn-rise mt-6 max-w-xl text-base leading-relaxed md:text-lg"
              style={{ color: C.muted, animationDelay: "120ms" }}
            >
              Semantic matching connects ventures by real resource needs and offers —
              not keywords. Built on verified BIN data and a private handshake protocol.
            </p>

            {/* CTAs */}
            <div className="syn-rise mt-10 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "180ms" }}>
              <Button
                size="lg"
                asChild
                className="rounded-md px-7 text-base font-semibold text-white transition-transform hover:scale-[1.02]"
                style={{ background: C.accent }}
              >
                <Link to="/register">
                  Create profile <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="rounded-md bg-transparent px-7 text-base"
                style={{ border: `1px solid ${C.line}`, color: C.inkSoft }}
              >
                <Link to="/discover">
                  <Search className="mr-2 h-4 w-4" /> Browse ventures
                </Link>
              </Button>
            </div>

            {/* Metrics */}
            <div
              className="syn-rise mt-16 grid grid-cols-2 overflow-hidden rounded-lg md:grid-cols-4"
              style={{ border: `1px solid ${C.line}`, background: C.surface, animationDelay: "240ms" }}
            >
              {metrics.map((m, i) => (
                <div
                  key={m.label}
                  className="p-5"
                  style={{
                    borderRight: i < metrics.length - 1 ? `1px solid ${C.line}` : "none",
                    borderBottom: i < 2 ? `1px solid ${C.line}` : "none",
                  }}
                >
                  <div className="syn-mono text-3xl font-medium tracking-tight">{m.value}</div>
                  <div className="syn-mono mt-2 text-[10px] uppercase tracking-[0.12em]" style={{ color: C.muted }}>
                    {m.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="border-t" style={{ borderColor: C.line }}>
          <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
            <div className="mb-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <span className="syn-mono text-xs uppercase tracking-[0.18em]" style={{ color: C.accentText }}>
                  // Capabilities
                </span>
                <h2 className="syn-display mt-3 max-w-md text-3xl font-bold tracking-tight md:text-4xl">
                  Built for the realities of KZ founders
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-relaxed" style={{ color: C.muted }}>
                Every component is designed around the actual pain points of building
                an IT startup inside the Kazakhstan ecosystem.
              </p>
            </div>

            <div className="grid gap-px overflow-hidden rounded-lg md:grid-cols-3" style={{ background: C.line, border: `1px solid ${C.line}` }}>
              {features.map((f) => {
                const Icon = f.icon
                return (
                  <div key={f.title} className="p-7" style={{ background: C.surface }}>
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-md" style={{ border: `1px solid ${C.line}`, background: C.surfaceSoft }}>
                        <Icon className="h-5 w-5" style={{ color: C.accent }} />
                      </div>
                      <span className="syn-mono text-[10px] tracking-[0.12em]" style={{ color: C.muted }}>
                        {f.code}
                      </span>
                    </div>
                    <h3 className="syn-display mt-5 text-lg font-semibold">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: C.muted }}>{f.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="border-t" style={{ borderColor: C.line, background: C.surfaceSoft }}>
          <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
            <div className="mb-14">
              <span className="syn-mono text-xs uppercase tracking-[0.18em]" style={{ color: C.accentText }}>
                // Process
              </span>
              <h2 className="syn-display mt-3 text-3xl font-bold tracking-tight md:text-4xl">
                Three steps to a verified partner
              </h2>
            </div>

            <div className="grid gap-px overflow-hidden rounded-lg md:grid-cols-3" style={{ background: C.line, border: `1px solid ${C.line}` }}>
              {steps.map((s) => (
                <div key={s.n} className="p-7" style={{ background: C.surface }}>
                  <div className="syn-mono text-5xl font-bold leading-none" style={{ color: C.lineSoft, WebkitTextStroke: `1px ${C.muted}` }}>
                    {s.n}
                  </div>
                  <h3 className="syn-display mt-6 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: C.muted }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t" style={{ borderColor: C.line }}>
          <div className="mx-auto max-w-6xl px-5 py-24">
            <div className="relative overflow-hidden rounded-lg p-10 md:p-16" style={{ background: C.ink }}>
              <div className="relative z-10 max-w-2xl">
                <span className="syn-mono text-xs uppercase tracking-[0.18em]" style={{ color: "#9FE1CB" }}>
                  // Get started
                </span>
                <h2 className="syn-display mt-4 text-3xl font-bold leading-tight tracking-tight md:text-5xl" style={{ color: "#F5F2ED" }}>
                  Ready to find your next partner?
                </h2>
                <p className="mt-5 max-w-lg text-base md:text-lg" style={{ color: "#B8B0A4" }}>
                  Join Kazakhstan&apos;s intelligent startup collaboration platform —
                  verified, private, and built for the local market.
                </p>

                <Link to="/register" className="mt-9 inline-block">
                  <Button
                    size="lg"
                    className="rounded-md px-8 text-base font-semibold transition-transform hover:scale-[1.03]"
                    style={{ background: C.accent, color: "#fff" }}
                  >
                    Get started free <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>

                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
                  {["No credit card", "Free to start", "KZ-focused"].map((item) => (
                    <span key={item} className="syn-mono flex items-center gap-1.5 text-xs uppercase tracking-wider" style={{ color: "#9FE1CB" }}>
                      <Check className="h-3.5 w-3.5" /> {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t" style={{ borderColor: C.line }}>
        <div className="mx-auto max-w-6xl px-5 py-12">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: C.accent }}>
                <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="syn-display font-bold">SynektaKz</span>
            </Link>

            <nav className="flex gap-8">
              {["Privacy", "Terms", "Contact"].map((l) => (
                <a key={l} href="#" className="syn-mono text-xs uppercase tracking-wider transition-colors hover:opacity-70" style={{ color: C.muted }}>
                  {l}
                </a>
              ))}
            </nav>

            <div className="syn-mono text-xs" style={{ color: C.muted }}>
              © {year} SynektaKz
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
