import { useState } from "react";
import { Sparkles, Loader2, X } from "lucide-react";
import { isAiConfigured, getActiveAiProfile } from "@/lib/ai";

export function AiButton({ fetchOptions, onSelect, label }: {
  fetchOptions: () => Promise<string[]>;
  onSelect: (value: string) => void;
  label: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [options, setOptions] = useState<string[] | null>(null);

  const configured = isAiConfigured();
  const activeProfile = getActiveAiProfile();

  async function handleClick() {
    if (!configured) {
      setError("请先在右上角“设置”中配置 AI");
      // Auto-clear helper message after 4s
      setTimeout(() => setError(""), 4000);
      return;
    }
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

  const buttonTitle = configured
    ? `使用 ${activeProfile?.name || "AI"} 润色${label}`
    : "AI 未配置，请点击右上角设置图标进行配置";

  return (
    <div className="relative flex items-center gap-2">
      <button
        type="button"
        disabled={loading}
        onClick={options ? handleClose : () => void handleClick()}
        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors disabled:opacity-50 ${
          configured
            ? "text-accent-foreground hover:text-foreground hover:bg-primary/10"
            : "text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5"
        }`}
        title={buttonTitle}
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
        {options ? "关闭" : "润色"}
      </button>

      {error && (
        <span className={`text-[11px] px-1.5 py-0.5 rounded ${configured ? "text-destructive bg-destructive/5" : "text-amber-700 bg-amber-50 border border-amber-200 animate-pulse"}`}>
          {error}
        </span>
      )}

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
