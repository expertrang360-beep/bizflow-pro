import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Lock, Mail, User, Eye, EyeOff, ArrowRight, Phone } from "lucide-react";

type Mode = "login" | "signup" | "forgot";
type SignupMethod = "email" | "phone";
type LoginMethod = "email" | "phone";

/** Generate a deterministic placeholder email from a phone number */
const phoneToEmail = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return `phone_${digits}@bizkit.local`;
};

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [signupMethod, setSignupMethod] = useState<SignupMethod>("email");
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loginPhone, setLoginPhone] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signup") {
        const signupEmail = signupMethod === "phone" ? phoneToEmail(phone) : email;
        const { error } = await supabase.auth.signUp({
          email: signupEmail,
          password,
          options: {
            data: { name, phone: signupMethod === "phone" ? phone : (phone || undefined) },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({ title: "Account created!", description: "You can now sign in." });
      } else if (mode === "login") {
        const loginEmail = loginMethod === "phone" ? phoneToEmail(loginPhone) : email;
        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: "Reset link sent!", description: "Check your email for the password reset link." });
        setMode("login");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="gradient-hero text-primary-foreground px-6 pt-16 pb-12 flex-shrink-0">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary-foreground/20 rounded-2xl flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">BizKit</h1>
            <p className="text-primary-foreground/70 text-sm">Business Management Suite</p>
          </div>
        </div>
        <h2 className="text-3xl font-bold mb-1">
          {mode === "login" ? "Welcome back" : mode === "signup" ? "Create account" : "Reset password"}
        </h2>
        <p className="text-primary-foreground/70">
          {mode === "login" ? "Sign in to your business" : mode === "signup" ? "Start managing your business" : "We'll send you a reset link"}
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">

          {/* Signup method toggle */}
          {mode === "signup" && (
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setSignupMethod("email")}
                className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  signupMethod === "email"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Mail className="w-4 h-4" /> Email
              </button>
              <button
                type="button"
                onClick={() => setSignupMethod("phone")}
                className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  signupMethod === "phone"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Phone className="w-4 h-4" /> Phone
              </button>
            </div>
          )}

          {/* Login method toggle */}
          {mode === "login" && (
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setLoginMethod("email")}
                className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  loginMethod === "email"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Mail className="w-4 h-4" /> Email
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod("phone")}
                className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  loginMethod === "phone"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Phone className="w-4 h-4" /> Phone
              </button>
            </div>
          )}

          {/* Name field (signup only) */}
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>
          )}

          {/* Phone field for phone signup */}
          {mode === "signup" && signupMethod === "phone" && (
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+234 800 000 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>
          )}

          {/* Email field for email signup / email login / forgot */}
          {((mode === "signup" && signupMethod === "email") || (mode === "login" && loginMethod === "email") || mode === "forgot") && (
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>
          )}

          {/* Phone field for phone login */}
          {mode === "login" && loginMethod === "phone" && (
            <div className="space-y-1.5">
              <Label htmlFor="loginPhone" className="text-sm font-medium">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="loginPhone"
                  type="tel"
                  placeholder="+234 800 000 0000"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>
          )}

          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === "login" && loginMethod === "email" && (
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="text-sm text-primary hover:underline"
            >
              Forgot password?
            </button>
          )}

          <Button
            type="submit"
            className="w-full h-11 bg-primary text-primary-foreground shadow-primary-btn font-semibold gap-2 mt-2"
            disabled={loading}
          >
            {loading ? "Please wait..." : (
              <>
                {mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground pt-2">
            {mode === "login" ? (
              <>Don't have an account?{" "}
                <button type="button" onClick={() => setMode("signup")} className="text-primary font-medium hover:underline">
                  Sign up
                </button>
              </>
            ) : (
              <>Already have an account?{" "}
                <button type="button" onClick={() => setMode("login")} className="text-primary font-medium hover:underline">
                  Sign in
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
