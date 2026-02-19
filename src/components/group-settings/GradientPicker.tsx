import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const GRADIENT_OPTIONS = [
  { id: "solid-orange", from: "hsl(18,89%,47%)", to: "hsl(18,89%,47%)" },
  { id: "orange-red", from: "hsl(15,90%,55%)", to: "hsl(0,85%,50%)" },
  { id: "blue-purple", from: "hsl(220,80%,55%)", to: "hsl(270,70%,55%)" },
  { id: "green-teal", from: "hsl(150,60%,45%)", to: "hsl(180,70%,45%)" },
  { id: "pink-orange", from: "hsl(330,80%,60%)", to: "hsl(25,90%,55%)" },
  { id: "gray-black", from: "hsl(0,0%,40%)", to: "hsl(0,0%,15%)" },
];

interface GradientPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: string;
  onSelect: (gradient: string) => void;
}

export default function GradientPicker({ open, onOpenChange, current, onSelect }: GradientPickerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[350px]">
        <DialogHeader>
          <DialogTitle>Choose a banner</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3 py-4">
          {GRADIENT_OPTIONS.map((g) => (
            <button
              key={g.id}
              onClick={() => onSelect(g.id)}
              className={`w-full aspect-square rounded-xl border-2 transition-all ${
                current === g.id ? "border-primary scale-105" : "border-transparent"
              }`}
              style={{
                background: `linear-gradient(135deg, ${g.from}, ${g.to})`,
              }}
              aria-label={g.id}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
