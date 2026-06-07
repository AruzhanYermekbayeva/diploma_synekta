import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Zap, Loader2, Eye, EyeOff, ShieldCheck, Brain, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

/**
 * SynapseKZ — Login
 *
 * Design system: "serious infrastructure", light.
 * Split layout: ink brand panel (left) + warm-stone form (right).
 * Accent: deep teal #0F6E56.
 * All auth logic (zod schema, sign-in, role-based redirect) is unchanged.
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
  muted: "#8A8378",
  danger: "#B23B3B",
};

const formSchema = z.object({
  email: z.string()
    .min(1, "Enter your email")
    .email("Invalid email format")
    .trim(),

  password: z.string()
    .min(1, "Enter your password")
    .min(6, "Password must be at least 6 characters"),
});

type FormValues = z.infer<typeof formSchema>;

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const { error } = await supabase.auth.signInWithPassword(values);

      if (error) {
        toast.error("Login failed", {
          description: "Invalid email or password",
        });
        return;
      }

      toast.success("Welcome back");

      const { data: { user } } = await supabase.auth.getUser();
      const role = (user?.user_metadata?.role || "founder").toLowerCase();
      const dest =
        role === "investor" ? "/discover" :
        role === "talent" ? "/talent-profile" :
        "/dashboard";

      setTimeout(() => {
        navigate(dest, { replace: true });
      }, 600);
    } catch {
      toast.error("Something went wrong");
    }
  };

  return (
    <div
      className="grid min-h-screen lg:grid-cols-2"
      style={{ background: C.base, color: C.ink, fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <style>{`
        .syn-display { font-family: 'Space Grotesk', system-ui, sans-serif; }
        .syn-mono { font-family: 'JetBrains Mono', monospace; }
      `}</style>

      {/* ── LEFT: brand panel (hidden on mobile) ── */}
      <BrandPanel />

      {/* ── RIGHT: form ── */}
      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo (panel is hidden on small screens) */}
          <Link to="/" className="mb-8 inline-flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-md" style={{ background: C.accent }}>
              <Zap className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="syn-display text-xl font-bold tracking-tight">SynapseKZ</span>
          </Link>

          <div className="mb-8">
            <span className="syn-mono text-xs uppercase tracking-[0.18em]" style={{ color: C.accentText }}>
              // Sign in
            </span>
            <h1 className="syn-display mt-3 text-3xl font-bold tracking-tight">Welcome back</h1>
            <p className="mt-1.5 text-sm" style={{ color: C.muted }}>Sign in to continue to your workspace.</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="syn-mono text-[11px] uppercase tracking-widest" style={{ color: C.muted }}>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="you@example.com"
                        className="h-12 rounded-md"
                        style={{ background: C.surface, border: `1px solid ${C.line}` }}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="mt-1 text-xs" style={{ color: C.danger }} />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="syn-mono text-[11px] uppercase tracking-widest" style={{ color: C.muted }}>Password</FormLabel>
                      <Link to="/forgot-password" className="text-xs hover:underline" style={{ color: C.accent }}>
                        Forgot?
                      </Link>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter password"
                          className="h-12 rounded-md pr-11"
                          style={{ background: C.surface, border: `1px solid ${C.line}` }}
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2"
                          style={{ color: C.muted }}
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="mt-1 text-xs" style={{ color: C.danger }} />
                  </FormItem>
                )}
              />

              {/* Button */}
              <Button
                type="submit"
                className="mt-2 h-12 w-full rounded-md font-semibold text-white"
                style={{ background: C.accent }}
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>

              {/* Footer */}
              <p className="text-center text-sm" style={{ color: C.muted }}>
                Don&apos;t have an account?{" "}
                <Link to="/register" className="font-medium hover:underline" style={{ color: C.accent }}>
                  Create account
                </Link>
              </p>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}

/* ── Shared brand panel (ink, hidden under lg) ── */
function BrandPanel() {
  const points = [
    { icon: Brain, text: "Semantic matching on real needs and offers" },
    { icon: ShieldCheck, text: "Private handshake — contacts stay sealed until mutual accept" },
    { icon: MapPin, text: "Built for the Kazakhstan tech ecosystem" },
  ];
  return (
    <div className="relative hidden flex-col justify-between p-12 lg:flex" style={{ background: C.ink, color: "#F5F2ED" }}>
      <Link to="/" className="inline-flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md" style={{ background: C.accent }}>
          <Zap className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
        <span className="syn-display text-xl font-bold tracking-tight">SynapseKZ</span>
      </Link>

      <div>
        <span className="syn-mono text-xs uppercase tracking-[0.18em]" style={{ color: "#9FE1CB" }}>
          // The matching layer
        </span>
        <h2 className="syn-display mt-4 max-w-sm text-3xl font-bold leading-tight">
          Infrastructure for Kazakhstan&apos;s startup ecosystem.
        </h2>
        <div className="mt-8 space-y-4">
          {points.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md" style={{ background: "rgba(29,158,117,0.18)" }}>
                <Icon className="h-4 w-4" style={{ color: "#9FE1CB" }} />
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#B8B0A4" }}>{text}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="syn-mono text-[11px]" style={{ color: "#6E665B" }}>
        © {new Date().getFullYear()} SynapseKZ
      </p>
    </div>
  );
}
