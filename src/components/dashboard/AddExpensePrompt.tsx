import { Plus } from "lucide-react";

interface AddExpensePromptProps {
  memberName: string;
  onAddExpense: () => void;
}

export default function AddExpensePrompt({ memberName, onAddExpense }: AddExpensePromptProps) {
  return (
    <div className="flex-1 flex flex-col items-left justify-start px-6 py-10 mt-10">
      <h2 className="text-xl font-bold text-foreground text-left mb-2 tracking-tight leading-tight">
        Cool, you added <span className="text-primary">{memberName}</span>!
        {" "}Let's bring your group to life.
      </h2>
      <p className="text-sm text-muted-foreground text-left mb-8 font-medium">
        What's the last thing you and <span className="text-primary font-bold">{memberName}</span> paid for together?
      </p>

      <button
        onClick={onAddExpense}
        className="w-full bg-gradient-to-r from-primary to-bountt-orange-light text-primary-foreground font-semibold rounded-full py-4 px-6 flex items-center justify-center gap-2 text-base active:scale-[0.97] transition-transform"
      >
        Contribute a shared expense
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
}
