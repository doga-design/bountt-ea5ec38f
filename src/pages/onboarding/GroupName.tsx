import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const SUGGESTIONS = [
  { label: "Lake House", emoji: "😊" },
  { label: "The Condo", emoji: "⭐" },
  { label: "Planners", emoji: "🗂️" },
  { label: "Road Trip", emoji: "🚗" },
  { label: "Foodies", emoji: "🍕" },
  { label: "The Squad", emoji: "👥" },
  { label: "Beach Trip", emoji: "🏖️" },
  { label: "Ski Trip", emoji: "⛷️" },
];

const EMOJIS = ["🏅", "🏠", "🚗", "🍕", "🌴", "⭐", "🎉", "💫", "🔥", "❤️", "🎸", "🌊"];

export default function GroupName() {
  const navigate = useNavigate();
  const { createGroup, user } = useApp();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🏅");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!name.trim()) {
      toast({ title: "Give your group a name first!", variant: "destructive" });
      return;
    }
    if (!user) {
      navigate("/auth");
      return;
    }

    setLoading(true);
    const group = await createGroup(name.trim(), emoji);
    setLoading(false);

    if (group) {
      navigate("/onboarding/invite", { state: { group } });
    } else {
      toast({ title: "Failed to create group", description: "Please try again.", variant: "destructive" });
    }
  };

  const selectSuggestion = (s: { label: string; emoji: string }) => {
    setName(s.label);
    setEmoji(s.emoji);
  };

  return (
    <div className="screen-container bg-background">
      {/* Orange header with curved bottom */}
      <div
        className="bg-primary px-6 pt-12 pb-10 relative"
        style={{ borderBottomLeftRadius: "40px", borderBottomRightRadius: "40px" }}
      >
        {/* bountt. wordmark */}
        <h1 className="bountt-wordmark text-3xl text-primary-foreground text-center mb-6">
          bountt<span className="opacity-70">.</span>
        </h1>

        {/* Progress dots — step 1 of 2 */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-8 h-2 bg-primary-foreground rounded-full" />
          <div className="w-2 h-2 bg-primary-foreground/40 rounded-full" />
        </div>

        {/* Nav arrows */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => navigate("/auth")}
            className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-primary-foreground" />
          </button>
          <button
            onClick={handleContinue}
            disabled={loading || !name.trim()}
            className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
            ) : (
              <ChevronRight className="w-5 h-5 text-primary-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-6 pt-8">
        {/* Header pill */}
        <div className="flex justify-center mb-2">
          <span className="bg-secondary text-secondary-foreground rounded-full px-5 py-2.5 text-sm font-bold">
            Name your group 🏅
          </span>
        </div>
        <p className="text-center text-muted-foreground text-sm mb-8">
          This is what everyone will see
        </p>

        {/* Group name input */}
        <div className="bg-card rounded-2xl px-4 py-3.5 shadow-sm flex items-center gap-3 mb-4">
          {/* Emoji picker button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker((p) => !p)}
            className="text-2xl flex-shrink-0"
          >
            {emoji}
          </button>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name..."
            maxLength={50}
            className="flex-1 text-base text-foreground bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Emoji picker */}
        {showEmojiPicker && (
          <div className="bg-card rounded-2xl p-4 shadow-sm mb-4 animate-fade-in">
            <div className="grid grid-cols-6 gap-3">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => { setEmoji(e); setShowEmojiPicker(false); }}
                  className={`text-2xl p-1 rounded-xl transition-all ${emoji === e ? "bg-primary/10 scale-110" : "hover:bg-muted"}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Suggestion chips — horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto chip-scroll pb-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => selectSuggestion(s)}
              className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-semibold border transition-all ${
                name === s.label
                  ? "bg-secondary text-secondary-foreground border-secondary"
                  : "bg-card text-foreground border-border"
              }`}
            >
              {s.label} {s.emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="px-6 pb-10 pt-6">
        <button
          onClick={handleContinue}
          disabled={loading || !name.trim()}
          className="w-full bg-muted text-foreground rounded-full py-4 font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          Continue →
        </button>
      </div>
    </div>
  );
}
