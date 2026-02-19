import { Plus } from "lucide-react";

interface AddExpensePromptProps {
  memberName: string;
  onAddExpense: () => void;
}

export default function AddExpensePrompt({ memberName, onAddExpense }: AddExpensePromptProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
      <h2 className="text-xl font-bold text-foreground text-center mb-2">
        Cool, you added <span className="text-primary">{memberName}</span>!
        {" "}Let's bring your group to life.
      </h2>
      <p className="text-sm text-muted-foreground text-center mb-8">
        What's the last thing you and <span className="text-primary font-medium">{memberName}</span> paid for together?
      </p>

      <button
        onClick={onAddExpense}
        className="w-full bg-gradient-to-r from-primary to-bountt-orange-light text-primary-foreground font-semibold rounded-full py-4 px-6 flex items-center justify-center gap-2 text-base active:scale-[0.97] transition-transform"
      >
        Add a quick <span className="font-bold">shared expense</span>
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
}
