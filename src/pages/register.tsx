import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, Eye, EyeOff, Check, Zap, Loader2, ShieldCheck, Brain, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";

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
  fullName: z.string()
    .min(2, "Enter your full name")
    .max(100, "Name is too long")
    .trim(),

  email: z.string()
    .min(1, "Enter your email")
    .email("Invalid email format")
    .trim()
    .toLowerCase(),

  password: z.string()
    .min(8, "Minimum 8 characters")
    .regex(/[A-Z]/, "Add one uppercase letter")
    .regex(/[a-z]/, "Add one lowercase letter")
    .regex(/[0-9]/, "Add one number"),

  confirmPassword: z.string(),

  role: z.string().min(1, "Select your role"),

  location: z.string().min(1, "Select your city"),

  acceptTerms: z.boolean().refine(val => val === true, {
    message: "Please accept the terms",
  }),
})
.refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

// Password strength checks
const passwordChecks = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
];

export default function Register() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      location: "",
      role: "",
      acceptTerms: false,
    },
  });

  const passwordValue = form.watch("password");

  async function onSubmit(values: FormValues) {
    try {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
            role: values.role,
            city: values.location,
          },
        },
      });

      if (error) {
        toast.error("Registration failed", {
          description: error.message || "Something went wrong",
        });
        return;
      }

      toast.success("Account created successfully!", {
        description: `Welcome, ${values.fullName.split(" ")[0]}! Please check your email to confirm your account.`,
        duration: 7000,
        action: {
          label: "Go to Login",
          onClick: () => navigate("/login"),
        },
      });
    } catch (err) {
      toast.error("Something went wrong", {
        description: "Please try again later.",
      });
    }
  }

 

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
          {/* Mobile logo */}
          <Link to="/" className="mb-8 inline-flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-md" style={{ background: C.accent }}>
              <Zap className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="syn-display text-xl font-bold tracking-tight">SynektaKZ</span>
          </Link>

          <div className="mb-7">
            <span className="syn-mono text-xs uppercase tracking-[0.18em]" style={{ color: C.accentText }}>
              // Create account
            </span>
            <h1 className="syn-display mt-3 text-3xl font-bold tracking-tight">Join the ecosystem</h1>
            <p className="mt-1.5 text-sm" style={{ color: C.muted }}>Kazakhstan&apos;s intelligent startup platform.</p>
          </div>

          {/* Google Button */}
         
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1" style={{ background: C.line }} />
            <span className="syn-mono text-xs uppercase tracking-widest" style={{ color: C.muted }}>or</span>
            <div className="h-px flex-1" style={{ background: C.line }} />
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="syn-mono text-[11px] uppercase tracking-widest" style={{ color: C.muted }}>Full name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Aruzhan Yermekbayeva" className="h-12 rounded-md" style={{ background: C.surface, border: `1px solid ${C.line}` }} {...field} />
                    </FormControl>
                    <FormMessage className="mt-1 text-xs" style={{ color: C.danger }} />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="syn-mono text-[11px] uppercase tracking-widest" style={{ color: C.muted }}>Email address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
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

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="syn-mono text-[11px] uppercase tracking-widest" style={{ color: C.muted }}>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Create strong password"
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

                    {passwordValue && (
                      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                        {passwordChecks.map((check, i) => {
                          const passed = check.test(passwordValue);
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <div
                                className="flex h-4 w-4 items-center justify-center rounded-full transition-all"
                                style={{ background: passed ? C.accent : C.line }}
                              >
                                {passed && <Check size={10} className="text-white" strokeWidth={4} />}
                              </div>
                              <span style={{ color: passed ? C.accentText : C.muted }}>{check.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <FormMessage className="mt-1 text-xs" style={{ color: C.danger }} />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="syn-mono text-[11px] uppercase tracking-widest" style={{ color: C.muted }}>Confirm password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirm ? "text" : "password"}
                          placeholder="Repeat password"
                          className="h-12 rounded-md pr-11"
                          style={{ background: C.surface, border: `1px solid ${C.line}` }}
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-4 top-1/2 -translate-y-1/2"
                          style={{ color: C.muted }}
                        >
                          {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="mt-1 text-xs" style={{ color: C.danger }} />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="syn-mono text-[11px] uppercase tracking-widest" style={{ color: C.muted }}>City</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value||""}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-md" style={{ background: C.surface, border: `1px solid ${C.line}`, color: C.ink }}>
                            <SelectValue placeholder="Select city" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent style={{ background: C.surface, color: C.ink }}>
                          <SelectItem value="Astana">Astana</SelectItem>
                          <SelectItem value="Almaty">Almaty</SelectItem>
                          <SelectItem value="Shymkent">Shymkent</SelectItem>
                          <SelectItem value="Other-KZ">Other-KZ</SelectItem>
                          <SelectItem value="International">International</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="mt-1 text-xs" style={{ color: C.danger }} />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="syn-mono text-[11px] uppercase tracking-widest" style={{ color: C.muted }}>I am a...</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-md" style={{ background: C.surface, border: `1px solid ${C.line}`, color: C.ink }}>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent style={{ background: C.surface, color: C.ink }}>
                          <SelectItem value="Founder">Founder</SelectItem>
                          <SelectItem value="Talent">Talent / Specialist</SelectItem>
                          <SelectItem value="Investor">Investor</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="mt-1 text-xs" style={{ color: C.danger }} />
                    </FormItem>
                  )}
                />
              </div>

              {/* Terms Checkbox */}
              <FormField
                control={form.control}
                name="acceptTerms"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-start space-x-3">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="text-sm leading-snug" style={{ color: C.inkSoft }}>
                        I agree to the{" "}
                        <Link to="/terms" className="hover:underline" style={{ color: C.accent }}>
                          Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link to="/privacy" className="hover:underline" style={{ color: C.accent }}>
                          Privacy Policy
                        </Link>
                      </div>
                    </div>
                    <FormMessage className="mt-1 text-xs" style={{ color: C.danger }} />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="mt-2 h-12 w-full rounded-md text-base font-semibold text-white"
                style={{ background: C.accent }}
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create account <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-center text-sm" style={{ color: C.muted }}>
                Already have an account?{" "}
                <Link to="/login" className="font-medium hover:underline" style={{ color: C.accent }}>
                  Log in
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
        <span className="syn-display text-xl font-bold tracking-tight">SynektaKZ</span>
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
        © {new Date().getFullYear()} SynektaKZ
      </p>
    </div>
  );
}
