import { useEffect, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Share2, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Group } from "@/types";
import { generateJoinUrl } from "@/lib/bountt-utils";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function Invite() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { currentGroup, setCurrentGroup, userGroups } = useApp();
  const { toast } = useToast();

  const [group, setGroup] = useState<Group | null>(location.state?.group ?? currentGroup);
  const [joinUrl, setJoinUrl] = useState("");
  const [loading, setLoading] = useState(false);

  // If no group from state/context, try to load from URL param
  useEffect(() => {
    if (group) {
      setJoinUrl(generateJoinUrl(group.invite_code));
      return;
    }

    const groupId = searchParams.get("groupId");
    if (groupId) {
      // Try to find in userGroups first
      const found = userGroups.find((g) => g.id === groupId);
      if (found) {
        setGroup(found);
        setCurrentGroup(found);
        return;
      }

      // Otherwise fetch from DB
      setLoading(true);
      supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .maybeSingle()
        .then(({ data, error }) => {
          setLoading(false);
          if (error || !data) {
            navigate("/onboarding/group-name", { replace: true });
            return;
          }
          const g = data as Group;
          setGroup(g);
          setCurrentGroup(g);
        });
    } else {
      navigate("/onboarding/group-name", { replace: true });
    }
  }, []);

  useEffect(() => {
    if (group) {
      setJoinUrl(generateJoinUrl(group.invite_code));
    }
  }, [group]);

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

  if (loading) {
    return (
      <div className="screen-container bg-background items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="screen-container relative">
      {/* Background: lighter orange*/}
        <div
        className="absolute top-0 left-1/2 -translate-x-1/2 z-0 h-[730px] w-[1000px]"
        style={{
          background: "#FF7534",
          borderBottomLeftRadius: "50%",
          borderBottomRightRadius: "50%",
        }}
        />

      {/* Orange header: wide background shape + normal-width content */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 z-10 w-[500px] h-[200px] bg-primary pt-12 pb-10"
        style={{ borderBottomLeftRadius: "50%", borderBottomRightRadius: "50%" }}
        aria-hidden />

      <div className="relative z-20 px-6 pt-12 pb-10">
        {/* Nav row: back | progress dots (step 2 of 2) | continue */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => navigate("/onboarding/group-name")}
            className="w-11 h-11 rounded-full bg-primary-foreground/20 flex items-center justify-center"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5 text-primary-foreground" />
          </button>

          <div className="flex-1 flex justify-center">
            <div
              className="flex items-center justify-center gap-2"
              role="progressbar"
              aria-label="Step 2 of 2"
              aria-valuenow={2}
              aria-valuemax={2}
            >
              <div className="w-2 h-2 bg-primary-foreground/40 rounded-full" />
              <div className="w-8 h-2 bg-primary-foreground rounded-full" />
            </div>
          </div>

          <button
            onClick={handleContinue}
            className="w-11 h-11 rounded-full bg-primary-foreground/20 flex items-center justify-center"
            aria-label="Continue"
          >
            <ChevronRight className="w-5 h-5 text-primary-foreground" />
          </button>
        </div>

        {/* bountt. wordmark */}
        <h1 className="bountt-wordmark text-3xl text-primary-foreground text-center mb-6">
          bountt<span className="opacity-70">.</span>
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center px-6 pb-8 pt-6 relative z-10">
        {/* Pill — overlapping orange header */}
        <div className="relative z-10 flex justify-center mb-6 -mt-16">
          <span className="bg-secondary text-secondary-foreground rounded-2xl px-6 py-4 text-sm font-bold">
            Invite your friends to group 🔓
          </span>
        </div>

        {/* Single card — white gradient bg, 2px white border */}
        <div
          className="rounded-3xl -rotate-[1.8deg] p-6 border-2 border-white py-12 px-6 max-w-[270px] w-full mx-auto shadow-[0_24px_48px_-12px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.06)]"
          style={{ background: "linear-gradient(to bottom, hsl(0, 0.00%, 91.80%), hsl(0,0%,100%))" }}
          > 
          {/* Label */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 text-center">
            Your Bountt group code
          </p>

          {/* Code — Sora accent font */}
          <p className="font-sora text-3xl font-black text-foreground mb-5 text-center">
            {group.invite_code}
          </p>

          {/* 2 action buttons */}
          <div className="flex gap-3 mb-6 items-center justify-center">
            <button
              onClick={handleShare}
              className="w-11 h-11 rounded-full bg-muted flex items-center justify-center border-2 border-white shadow-[0_8px_30px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)]"
              style={{
                background: "linear-gradient(to bottom, hsl(0, 0.00%, 87.10%), hsl(0, 0.00%, 87.80%))",
              }}
              aria-label="Share invite"
            >
              <Share2 className="w-4 h-4 text-foreground" />
            </button>
            <button
              onClick={handleCopyCode}
              className="w-11 h-11 rounded-full bg-muted flex items-center justify-center border-2 border-white shadow-[0_8px_30px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)]"
              style={{
                background: "linear-gradient(to bottom, hsl(0, 0.00%, 87.10%), hsl(0, 0.00%, 87.80%))",
              }}
              aria-label="Copy invite code"
            >
              <ExternalLink className="w-4 h-4 text-foreground" />
            </button>
          </div>

          {/* Small copy */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4 text-center">
            Or let your friends scan
          </p>

          {/* QR code — orange */}
          <div className="flex justify-center">
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

        {/* Continue button — below card */}
        <button
          onClick={handleContinue}
          className="mt-6 w-full max-w-[280px] mx-auto bg-primary text-primary-foreground rounded-full py-4 font-bold text-base shadow-[0_24px_48px_-12px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.06)]"
        >
          Continue to group →
        </button>
      </div>
    </div>
  );
}
