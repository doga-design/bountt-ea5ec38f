import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Share2, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Group } from "@/types";
import { generateJoinUrl } from "@/lib/bountt-utils";

export default function Invite() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentGroup } = useApp();
  const { toast } = useToast();

  // Get group from router state or context
  const group: Group | null = location.state?.group ?? currentGroup;

  const [joinUrl, setJoinUrl] = useState("");

  useEffect(() => {
    if (!group) {
      navigate("/onboarding/group-name");
      return;
    }
    setJoinUrl(generateJoinUrl(group.invite_code));
  }, [group, navigate]);

  const handleShare = async () => {
    if (!group) return;
    const shareData = {
      title: `Join ${group.name} on bountt`,
      text: `Use code ${group.invite_code} to join our group on bountt!`,
      url: joinUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(joinUrl);
      toast({ title: "Link copied!", description: "Share it with your friends." });
    }
  };

  const handleCopyCode = async () => {
    if (!group) return;
    await navigator.clipboard.writeText(group.invite_code);
    toast({ title: "Code copied!", description: group.invite_code });
  };

  const handleContinue = () => {
    if (group) {
      navigate(`/dashboard/${group.id}`);
    }
  };

  if (!group) return null;

  return (
    <div className="screen-container" style={{ backgroundColor: "hsl(var(--primary))" }}>
      {/* Orange header */}
      <div className="px-6 pt-12 pb-6">
        {/* bountt. wordmark */}
        <h1 className="bountt-wordmark text-3xl text-primary-foreground text-center mb-6">
          bountt<span className="opacity-70">.</span>
        </h1>

        {/* Progress dots — step 2 of 2 */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-2 h-2 bg-primary-foreground/40 rounded-full" />
          <div className="w-8 h-2 bg-primary-foreground rounded-full" />
        </div>

        {/* Nav arrows */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/onboarding/group-name")}
            className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-primary-foreground" />
          </button>
          <button
            onClick={handleContinue}
            className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center"
          >
            <ChevronRight className="w-5 h-5 text-primary-foreground" />
          </button>
        </div>
      </div>

      {/* White bottom section */}
      <div
        className="flex-1 bg-background px-6 pt-6 pb-10 flex flex-col gap-4"
        style={{ borderTopLeftRadius: "32px", borderTopRightRadius: "32px" }}
      >
        {/* Header pill */}
        <div className="flex justify-center">
          <span className="bg-secondary text-secondary-foreground rounded-full px-5 py-2.5 text-sm font-bold">
            Invite your friends to group 🔓
          </span>
        </div>

        {/* Main invite card */}
        <div className="bg-primary rounded-3xl p-4">
          {/* Code section */}
          <div className="bg-card rounded-2xl p-4 mb-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
              Your Bountt Group Code
            </p>

            <div className="flex items-center justify-between">
              <button
                onClick={handleCopyCode}
                className="text-2xl font-black text-foreground tracking-wider"
              >
                {group.invite_code}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
                >
                  <Share2 className="w-4 h-4 text-foreground" />
                </button>
                <button
                  onClick={handleCopyCode}
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
                >
                  <ExternalLink className="w-4 h-4 text-foreground" />
                </button>
              </div>
            </div>
          </div>

          {/* QR code section */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs font-bold text-primary-foreground/80 uppercase tracking-widest">
              Or let your friends scan
            </p>
            <div className="bg-card rounded-2xl p-4">
              {joinUrl && (
                <QRCodeSVG
                  value={joinUrl}
                  size={160}
                  fgColor="hsl(18, 89%, 47%)"
                  bgColor="transparent"
                  level="M"
                />
              )}
            </div>
          </div>
        </div>

        {/* CTAs */}
        <button
          onClick={handleContinue}
          className="w-full bg-primary text-primary-foreground rounded-full py-4 font-bold text-base"
        >
          Continue →
        </button>
        <button
          onClick={handleContinue}
          className="text-center text-sm font-semibold text-foreground"
        >
          Skip invite and continue →
        </button>
      </div>
    </div>
  );
}
