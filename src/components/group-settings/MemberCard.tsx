import { useState, useRef } from "react";
import { GroupMember } from "@/types";
import { User, Shield } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MemberCardProps {
  member: GroupMember;
  currentUserId: string;
  isAdmin: boolean;
  onRemove: () => void;
  type: "active" | "placeholder" | "former";
}

export default function MemberCard({ member, currentUserId, isAdmin, onRemove, type }: MemberCardProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const startX = useRef(0);
  const isSelf = member.user_id === currentUserId;
  const canSwipe = isAdmin && !isSelf && type !== "former";

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!canSwipe) return;
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!canSwipe) return;
    const diff = e.touches[0].clientX - startX.current;
    if (diff < 0) setOffsetX(Math.max(diff, -100));
  };

  const handleTouchEnd = () => {
    if (!canSwipe) return;
    if (offsetX < -60) {
      setShowConfirm(true);
    }
    setOffsetX(0);
  };

  const statusDot = type === "active"
    ? "bg-green-500"
    : type === "placeholder"
    ? "border-2 border-dashed border-muted-foreground"
    : "bg-muted-foreground/40";

  const leftDate = member.left_at
    ? new Date(member.left_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  return (
    <>
      <div className="relative overflow-hidden rounded-xl">
        {/* Remove button behind */}
        {canSwipe && (
          <div className="absolute inset-y-0 right-0 w-24 bg-destructive flex items-center justify-center rounded-r-xl">
            <span className="text-destructive-foreground text-sm font-medium">Remove</span>
          </div>
        )}

        <div
          className={`relative bg-card rounded-xl p-3 flex items-center gap-3 transition-transform ${type === "former" ? "opacity-50" : ""}`}
          style={{ transform: `translateX(${offsetX}px)` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Avatar */}
          <div className={`relative w-10 h-10 rounded-full flex items-center justify-center ${
            type === "placeholder"
              ? "border-2 border-dashed border-muted-foreground bg-muted"
              : "bg-muted"
          }`}>
            <User className="w-5 h-5 text-muted-foreground" />
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${statusDot}`} />
          </div>

          {/* Name + role */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground text-sm truncate">
                {member.name}{isSelf ? " (You)" : ""}
              </p>
              {member.role === "admin" && (
                <span className="flex items-center gap-0.5 text-[10px] font-medium text-primary bg-primary/10 rounded px-1.5 py-0.5">
                  <Shield className="w-2.5 h-2.5" /> Admin
                </span>
              )}
            </div>
            {type === "placeholder" && (
              <p className="text-xs text-muted-foreground">Not on Bountt yet</p>
            )}
            {type === "former" && leftDate && (
              <p className="text-xs text-muted-foreground">Left on {leftDate}</p>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {member.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They'll lose access to expenses in this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onRemove} className="bg-destructive text-destructive-foreground">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
