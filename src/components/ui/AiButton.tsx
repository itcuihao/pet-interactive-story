import { useState } from "react";
import { Sparkles, Loader2, X } from "lucide-react";
import { isAiConfigured } from "@/lib/ai";

export function AiButton({ fetchOptions, onSelect, label }: {
  fetchOptions: () => Promise<string[]>;
  onSelect: (value: string) => void;
  label: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [options, setOptions] = useState<string[] | null>(null);

  if (!isAiConfigured()) return null;

  async function handleClick() {
    setLoading(true);
    setError("");
    setOptions(null);
    try {
      const results = await fetchOptions();
      if (results.length === 0) throw new Error("AI 返回了空内容");
      setOptions(results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI 调用失败");
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(opt: string) {
    setOptions(null);
    setError("");
    onSelect(opt);
  }

  function handleClose() {
    setOptions(null);
  }

  return (
    <div className="relative flex items-center gap-2">
      <button
        type="button"
        disabled={loading}
        onClick={options ? handleClose : () => void handleClick()}
        className="inline-flex items-center gap-1 text-xs text-accent-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-primary/10 transition-colors disabled:opacity-50"
        title={`AI 润色${label}`}
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
        {options ? "关闭" : "润色"}
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}

      {options && (
        <>
          <div className="fixed inset-0 z-40" onClick={handleClose} />
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[260px] max-w-[360px] bg-popover text-popover-foreground border border-border rounded-xl shadow-lg p-1.5">
            <div className="flex items-center justify-between px-2 py-1 mb-1">
              <span className="text-[11px] text-muted-foreground">选择一个方案：</span>
              <button type="button" onClick={handleClose} className="p-0.5 rounded text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </div>
            {options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(opt)}
                className="w-full text-left px-3 py-2.5 text-sm leading-relaxed rounded-lg hover:bg-primary/10 hover:text-foreground transition-colors"
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
