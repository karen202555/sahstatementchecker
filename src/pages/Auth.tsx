import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import authBg from "@/assets/auth-bg.jpeg";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Mode = "login" | "signup" | "forgot";

const BETA_CODE = "BETA2026";

const getAppURL = () => {
  if (window.location.hostname === "localhost") return window.location.origin;
  return "https://sahstatementchecker.lovable.app";
};

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", displayName: "", inviteCode: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
          redirectTo: `${getAppURL()}/reset-password`
        });
        if (error) throw error;
        setSent(true);
      } else if (mode === "signup") {
        if (form.inviteCode.trim().toUpperCase() !== BETA_CODE) {
          toast({ title: "Invalid invite code", description: "Please enter a valid beta invite code. Email admin@statementchecker.au to request access.", variant: "destructive" });
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: { display_name: form.displayName },
            emailRedirectTo: getAppURL()
          }
        });
        if (error) throw error;
        toast({
          title: "Check your email",
          description: "We sent you a confirmation link to activate your account."
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password
        });
        if (error) throw error;
        navigate("/");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const subtitle =
  mode === "login" ?
  "Sign in to reconcile your providers statements" :
  mode === "signup" ?
  "Create an account to get started" :
  "Reset your password";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 overflow-hidden">
      <img src={authBg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
      {/* Logo — top left */}
      <img alt="Statement Checker" className="absolute top-6 left-6 h-40 w-auto z-10" src="/lovable-uploads/263f22f8-fe64-4aeb-8063-b91884509880.png" />
      <div className="relative w-full max-w-sm space-y-8">
      {/* Subtitle */}
        <div className="flex flex-col items-center">
          <p className="text-base font-semibold text-foreground text-center">{subtitle}</p>
        </div>

        {/* Forgot password — sent state */}
        {mode === "forgot" && sent ?
        <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              We've sent a password reset link to <strong>{form.email}</strong>. Check your inbox and follow the link to set a new password.
            </p>
            <Button
            variant="ghost"
            className="gap-2"
            onClick={() => {setSent(false);setMode("login");}}>

              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Button>
          </div> :

        <>
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" &&
            <>
                  <div className="space-y-1.5">
                    <Label htmlFor="displayName">Display name</Label>
                    <Input
                  id="displayName"
                  placeholder="Jane Smith"
                  value={form.displayName}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  required />

                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="inviteCode">Beta invite code</Label>
                    <Input
                  id="inviteCode"
                  placeholder="Enter your invite code"
                  value={form.inviteCode}
                  onChange={(e) => setForm((f) => ({ ...f, inviteCode: e.target.value }))}
                  required />

                    <p className="text-xs text-muted-foreground">
                      Don't have a code? Email{" "}
                      <a href="mailto:admin@statementchecker.au" className="text-primary underline-offset-4 hover:underline">
                        admin@statementchecker.au
                      </a>{" "}
                      to request access.
                    </p>
                  </div>
                </>
            }
              <div className="space-y-1.5">
                <Label htmlFor="email" className="font-bold">Email</Label>
                <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required />

              </div>
              {mode !== "forgot" &&
            <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="font-bold">Password</Label>
                    {mode === "login" &&
                <button
                  type="button"
                  className="text-sm font-bold text-foreground underline-offset-4 hover:underline"
                  onClick={() => {setMode("forgot");setSent(false);}}>

                        Forgot password?
                      </button>
                }
                  </div>
                  <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
                minLength={6} />

                </div>
            }
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "login" ?
              "Sign in" :
              mode === "signup" ?
              "Create account" :
              "Send reset link"}
              </Button>
            </form>

            {mode === "forgot" ?
          <p className="text-center text-base font-medium text-foreground">
                <button
              type="button"
              className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline"
              onClick={() => setMode("login")}>

                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to sign in
                </button>
              </p> :

           <p className="text-center text-base font-bold text-foreground">
                {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                <button
              type="button"
              className="font-semibold text-primary underline-offset-4 hover:underline"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}>

                  {mode === "login" ? "Sign up" : "Sign in"}
                </button>
              </p>
          }
          </>
        }
      </div>
    </div>);

};

export default Auth;