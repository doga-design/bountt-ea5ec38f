import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import confetti from "canvas-confetti";
import { useToast } from "@/hooks/use-toast";

export default function EmptyState() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { currentGroup, addPlaceholderMember } = useApp();
  const { toast } = useToast();
  const hasText = name.trim().length > 0;

  const handleSubmit = async () => {
    if (!hasText || !currentGroup || loading) return;
    setLoading(true);

    const member = await addPlaceholderMember(currentGroup.id, name.trim());
    if (member) {
      // Small confetti burst
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#E8480A", "#FFFFFF"],
      });
      setName("");
    } else {
      toast({ title: "Couldn't add member", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
      <h2 className="text-xl font-bold text-foreground text-center mb-2">
        Who've you been splitting costs with?
      </h2>
      <p className="text-sm text-muted-foreground text-center mb-8">
        Type your friend's name to get started!
      </p>

      <div
        className={`w-full flex items-center gap-2 bg-card rounded-2xl px-4 py-3 border-2 transition-colors ${
          hasText ? "border-primary" : "border-transparent"
        }`}
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="e.g. Kyle, Sarah..."
          className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-base"
          maxLength={50}
          aria-label="Friend's name"
        />
        <button
          onClick={handleSubmit}
          disabled={!hasText || loading}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            hasText
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
          aria-label="Add member"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
