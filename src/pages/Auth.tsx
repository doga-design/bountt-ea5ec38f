import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/contexts/AppContext";
import { Loader2 } from "lucide-react";

type Mode = "signup" | "signin";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, authLoading, userGroups, groupsLoading, fetchGroups } = useApp();
  const redirectTo = (location.state as { from?: string })?.from;
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  // FIX 6: Confirmation email resend state
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);

  // If already logged in, redirect smartly
  useEffect(() => {
    if (authLoading || !user) return;
    // Wait for groups to load
    if (groupsLoading) return;

    if (redirectTo) {
      navigate(redirectTo, { replace: true });
    } else if (userGroups.length > 0) {
      navigate(`/dashboard/${userGroups[0].id}`, { replace: true });
    } else {
      navigate("/groups/empty", { replace: true });
    }
  }, [user, authLoading, userGroups, groupsLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setNeedsConfirmation(false);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;

        // Check if it's a fake signup (user already exists but unconfirmed re-signup)
        if (data.user && !data.session) {
          setNeedsConfirmation(true);
          setConfirmationEmail(email);
          toast({
            title: "Check your email!",
            description: "We sent you a confirmation link to verify your account.",
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Redirect handled by useEffect above once user state updates
        await fetchGroups();
      }
    } catch (err) {
      toast({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/`,
    });
    if (error) {
      toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;

    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: "Check your email!", description: "We sent you a password reset link." });
      setShowForgot(false);
    } catch (err) {
      toast({
        title: "Failed to send reset email",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setForgotLoading(false);
    }
  };

  // FIX 6: Resend confirmation email
  const handleResendConfirmation = async () => {
    if (!confirmationEmail) return;
    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: confirmationEmail,
      });
      if (error) throw error;
      toast({ title: "Confirmation email resent!", description: "Check your inbox." });
    } catch (err) {
      toast({
        title: "Failed to resend",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setResendLoading(false);
    }
  };

  // Don't render auth form if already logged in
  if (user && !authLoading) return null;

  return (
    <div className="screen-container bg-background">
      <div className="flex flex-col items-center pt-16 pb-8 px-6">
        <h1 className="bountt-wordmark text-4xl text-foreground mb-8">
          bountt<span className="text-primary">.</span>
        </h1>

        <div className="bg-secondary text-secondary-foreground rounded-full px-5 py-2.5 text-sm font-semibold mb-8">
          {showForgot ? "Reset your password 🔑" : mode === "signup" ? "Let's get you started ↙" : "Welcome back ↙"}
        </div>

        {showForgot ? (
          <form onSubmit={handleForgotPassword} className="w-full space-y-3">
            <div className="bg-card rounded-2xl px-4 py-3.5 shadow-sm">
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full text-base text-foreground bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </div>

            <button
              type="submit"
              disabled={forgotLoading}
              className="w-full bg-primary text-primary-foreground rounded-full py-4 font-bold text-base flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
            >
              {forgotLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              Send Reset Link →
            </button>

            <button
              type="button"
              onClick={() => setShowForgot(false)}
              className="w-full text-sm text-muted-foreground font-medium mt-2"
            >
              ← Back to sign in
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="w-full space-y-3">
              <div className="bg-card rounded-2xl px-4 py-3.5 shadow-sm">
                <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full text-base text-foreground bg-transparent outline-none placeholder:text-muted-foreground"
                />
              </div>

              <div className="bg-card rounded-2xl px-4 py-3.5 shadow-sm">
                <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="w-full text-base text-foreground bg-transparent outline-none placeholder:text-muted-foreground"
                />
              </div>

              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => {
                    setShowForgot(true);
                    setForgotEmail(email);
                  }}
                  className="text-sm text-primary font-medium"
                >
                  Forgot password?
                </button>
              )}

              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                className="w-full bg-card rounded-2xl px-4 py-3.5 shadow-sm flex items-center gap-3 font-semibold text-foreground text-sm"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </button>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground rounded-full py-4 font-bold text-base flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {mode === "signup" ? "Continue →" : "Sign In →"}
              </button>
            </form>

            {/* FIX 6: Resend confirmation email button — only after unconfirmed signup */}
            {needsConfirmation && (
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resendLoading}
                className="mt-4 text-sm text-primary font-semibold flex items-center gap-2"
              >
                {resendLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Resend confirmation email →
              </button>
            )}

            <button
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setNeedsConfirmation(false);
              }}
              className="mt-4 text-sm text-muted-foreground font-medium"
            >
              {mode === "signup" ? "Already have an account? Sign in →" : "Need an account? Sign up →"}
            </button>

            <Link to="/join" className="mt-3 text-sm text-foreground font-semibold underline-offset-2">
              I have a group invite code →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
