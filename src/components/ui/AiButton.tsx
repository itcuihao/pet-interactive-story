import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { isAiConfigured } from "@/lib/ai";

export function AiButton({ onApply, label }: { onApply: () => Promise<string>; label: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isAiConfigured()) return null;

  async function handleClick() {
    setLoading(true);
    setError("");
    try {
      const result = await onApply();
      // onApply returns the polished text, caller handles patching
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI 调用失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleClick()}
        className="inline-flex items-center gap-1 text-xs text-accent-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-primary/10 transition-colors disabled:opacity-50"
        title={`AI 润色${label}`}
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
        润色
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
