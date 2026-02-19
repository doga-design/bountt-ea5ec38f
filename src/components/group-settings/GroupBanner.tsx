import { useState } from "react";
import { Group } from "@/types";
import { useApp } from "@/contexts/AppContext";
import GradientPicker from "./GradientPicker";

const GRADIENTS: Record<string, string> = {
  "orange-red": "from-[hsl(15,90%,55%)] to-[hsl(0,85%,50%)]",
  "blue-purple": "from-[hsl(220,80%,55%)] to-[hsl(270,70%,55%)]",
  "green-teal": "from-[hsl(150,60%,45%)] to-[hsl(180,70%,45%)]",
  "pink-orange": "from-[hsl(330,80%,60%)] to-[hsl(25,90%,55%)]",
  "gray-black": "from-[hsl(0,0%,40%)] to-[hsl(0,0%,15%)]",
};

interface GroupBannerProps {
  group: Group;
}

export default function GroupBanner({ group }: GroupBannerProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [showPicker, setShowPicker] = useState(false);
  const { updateGroup } = useApp();

  const gradientClass = GRADIENTS[group.banner_gradient] ?? GRADIENTS["orange-red"];

  const handleNameSave = async () => {
    setEditing(false);
    if (name.trim() && name.trim() !== group.name) {
      await updateGroup(group.id, { name: name.trim() });
    }
  };

  return (
    <>
      <div
        className={`relative h-[200px] bg-gradient-to-br ${gradientClass} flex flex-col items-center justify-center cursor-pointer`}
        onClick={() => !editing && setShowPicker(true)}
      >
        <span className="text-5xl mb-3">{group.emoji}</span>
        {editing ? (
          <input
            className="text-2xl font-bold text-primary-foreground bg-transparent border-b-2 border-primary-foreground/50 text-center outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h1
            className="text-2xl font-bold text-primary-foreground cursor-text"
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          >
            {group.name}
          </h1>
        )}
      </div>

      <GradientPicker
        open={showPicker}
        onOpenChange={setShowPicker}
        current={group.banner_gradient}
        onSelect={async (gradient) => {
          await updateGroup(group.id, { banner_gradient: gradient });
          setShowPicker(false);
        }}
      />
    </>
  );
}
