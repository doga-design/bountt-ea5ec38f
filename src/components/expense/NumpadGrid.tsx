import { Delete } from "lucide-react";

const SUB_LETTERS: Record<string, string> = {
  "2": "ABC",
  "3": "DEF",
  "4": "GHI",
  "5": "JKL",
  "6": "MNO",
  "7": "PQRS",
  "8": "TUV",
  "9": "WXYZ",
};

interface NumpadGridProps {
  onKey: (key: string) => void;
}

export default function NumpadGrid({ onKey }: NumpadGridProps) {
  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [".", "0", "del"],
  ];

  return (
    <div
      className="grid grid-cols-3"
      style={{ gap: "1px", backgroundColor: "#DDDDD9", borderTop: "1px solid #DDDDD9", marginTop: "4px" }}
    >
      {keys.flat().map((key) => {
        const isFunction = key === "." || key === "del";
        return (
          <button
            key={key}
            onClick={() => onKey(key)}
            className="flex flex-col items-center justify-center font-sora transition-colors active:bg-[#EAEAE6] min-h-[72px]"
            style={{
              backgroundColor: isFunction ? "#EEEEE9" : "#F5F5F1",
            }}
            aria-label={key === "del" ? "Delete" : key}
          >
            {key === "del" ? (
              <Delete className="w-7 h-7 text-foreground" />
            ) : (
              <>
                <span className="text-[36px] font-semibold text-foreground leading-tight">
                  {key}
                </span>
                {SUB_LETTERS[key] && (
                  <span
                    className="text-[9px] font-bold leading-none mt-0.5"
                    style={{ color: "#C8C8C4" }}
                  >
                    {SUB_LETTERS[key]}
                  </span>
                )}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
