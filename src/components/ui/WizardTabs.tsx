import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type WizardTabItem = {
  id: string;
  label: string;
  hint: string;
  content: ReactNode;
};

export function WizardTabs({ value, onValueChange, items }: { value: string; onValueChange: (value: string) => void; items: WizardTabItem[] }) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className="grid gap-4">
      <TabsList className="!grid !h-auto !w-full grid-cols-3 gap-3 bg-transparent p-0">
        {items.map((item, index) => (
          <TabsTrigger
            key={item.id}
            value={item.id}
            className="!grid !h-auto !min-h-0 !w-full !flex-none gap-1.5 p-3.5 text-left whitespace-normal rounded-2xl border border-transparent bg-white/88 data-[state=active]:border-primary/30 data-[state=active]:bg-gradient-to-b data-[state=active]:from-white data-[state=active]:to-amber-50/96 data-[state=active]:shadow-lg transition-all"
          >
            <span className="inline-grid w-7 h-7 place-items-center rounded-full bg-primary/12 text-accent-foreground text-xs data-[state=active]:bg-gradient-to-b data-[state=active]:from-amber-400 data-[state=active]:to-orange-500 data-[state=active]:text-white">
              {index + 1}
            </span>
            <strong className="text-sm font-semibold text-foreground">{item.label}</strong>
            <small className="text-xs text-muted-foreground leading-snug">{item.hint}</small>
          </TabsTrigger>
        ))}
      </TabsList>
      {items.map((item) => (
        <TabsContent key={item.id} value={item.id} className="grid gap-4 mt-0">
          {item.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
