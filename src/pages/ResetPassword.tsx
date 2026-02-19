import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    // Check if we already have a recovery session from the hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast({ title: "Password too short", description: "Must be at least 8 characters.", variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({ title: "Password updated!", description: "You can now sign in with your new password." });
      navigate("/auth");
    } catch (err) {
      toast({
        title: "Failed to update password",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="screen-container bg-background items-center justify-center">
        <div className="text-center px-8">
          <h1 className="bountt-wordmark text-4xl text-foreground mb-2">
            bountt<span className="text-primary">.</span>
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            Loading recovery session...
          </p>
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="screen-container bg-background">
      <div className="flex flex-col items-center pt-16 pb-8 px-6">
        <h1 className="bountt-wordmark text-4xl text-foreground mb-8">
          bountt<span className="text-primary">.</span>
        </h1>

        <div className="bg-secondary text-secondary-foreground rounded-full px-5 py-2.5 text-sm font-semibold mb-8">
          Set a new password 🔑
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-3">
          <div className="bg-card rounded-2xl px-4 py-3.5 shadow-sm">
            <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className="w-full text-base text-foreground bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="bg-card rounded-2xl px-4 py-3.5 shadow-sm">
            <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className="w-full text-base text-foreground bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded-full py-4 font-bold text-base flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            Update Password →
          </button>
        </form>
      </div>
    </div>
  );
}
