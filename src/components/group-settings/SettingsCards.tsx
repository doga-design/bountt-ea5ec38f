import { useState } from "react";
import { Group } from "@/types";
import { Copy, Share2, Pencil } from "lucide-react";
import { generateJoinUrl } from "@/lib/bountt-utils";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";

interface SettingsCardsProps {
  group: Group;
}

export default function SettingsCards({ group }: SettingsCardsProps) {
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(group.name);
  const { updateGroup } = useApp();
  const { toast } = useToast();
  const joinUrl = generateJoinUrl(group.invite_code);

  const handleNameSave = async () => {
    setEditingName(false);
    if (name.trim() && name.trim() !== group.name) {
      await updateGroup(group.id, { name: name.trim() });
      toast({ title: "Group name updated" });
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(joinUrl);
    toast({ title: "Link copied!" });
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: group.name, url: joinUrl });
    } else {
      handleCopy();
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-foreground">Settings</h2>

      {/* Group Name */}
      <div className="bg-card rounded-xl p-4 flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1">Group Name</p>
          {editingName ? (
            <input
              className="text-sm font-medium text-foreground bg-transparent border-b border-border outline-none w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
              autoFocus
            />
          ) : (
            <p className="text-sm font-medium text-foreground">{group.name}</p>
          )}
        </div>
        {!editingName && (
          <button onClick={() => setEditingName(true)} className="p-2">
            <Pencil className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Invite Link */}
      <div className="bg-card rounded-xl p-4">
        <p className="text-xs text-muted-foreground mb-1">Invite Link</p>
        <p className="text-sm font-mono text-foreground mb-3 truncate">{group.invite_code}</p>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 bg-muted rounded-lg py-2 text-sm font-medium text-foreground"
          >
            <Copy className="w-4 h-4" /> Copy
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 bg-primary rounded-lg py-2 text-sm font-medium text-primary-foreground"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>
      </div>
    </div>
  );
}
