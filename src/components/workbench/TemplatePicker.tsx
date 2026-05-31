import type { StoryTemplate } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const accentStyles: Record<string, string> = {
  gold: "border-l-gold",
  rose: "border-l-rose",
  orange: "border-l-primary",
  teal: "border-l-teal",
  violet: "border-l-violet",
};

export function TemplatePicker({ templates, open, onOpenChange, onCreateBlank, onCreateFromTemplate }: {
  templates: StoryTemplate[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateBlank: () => void;
  onCreateFromTemplate: (templateId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>开始一份新故事</DialogTitle>
          <DialogDescription>选一个模板快速开始，或者从空白故事写起。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 -mx-1 max-h-[60vh] overflow-y-auto px-1 pb-1">
          {templates.map((template) => (
            <button
              key={template.id}
              className={`text-left rounded-2xl border border-transparent bg-secondary/60 p-3.5 grid gap-1.5 hover:border-primary/24 hover:bg-secondary transition-colors border-l-[5px] ${accentStyles[template.accent] || "border-l-primary"}`}
              onClick={() => { onOpenChange(false); onCreateFromTemplate(template.id); }}
            >
              <strong className="text-foreground text-sm">{template.name}</strong>
              <span className="text-muted text-xs leading-relaxed">{template.description}</span>
            </button>
          ))}
          <button
            className="text-left rounded-2xl border border-dashed border-primary/24 p-3.5 grid gap-1.5 hover:border-primary/40 hover:bg-secondary/50 transition-colors"
            onClick={() => { onOpenChange(false); onCreateBlank(); }}
          >
            <strong className="text-foreground text-sm">空白故事</strong>
            <span className="text-muted text-xs leading-relaxed">从零开始，按自己的节奏写。</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
