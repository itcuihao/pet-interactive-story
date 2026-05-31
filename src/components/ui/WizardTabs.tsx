import type { ReactNode } from "react";
import * as Tabs from "@radix-ui/react-tabs";

export type WizardTabItem = {
  id: string;
  label: string;
  hint: string;
  content: ReactNode;
};

export function WizardTabs({
  value,
  onValueChange,
  items,
}: {
  value: string;
  onValueChange: (value: string) => void;
  items: WizardTabItem[];
}) {
  return (
    <Tabs.Root className="wizard-tabs" value={value} onValueChange={onValueChange}>
      <Tabs.List className="wizard-tabs__list" aria-label="编辑步骤">
        {items.map((item, index) => (
          <Tabs.Trigger key={item.id} value={item.id} className="wizard-tabs__trigger">
            <span>{index + 1}</span>
            <strong>{item.label}</strong>
            <small>{item.hint}</small>
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {items.map((item) => (
        <Tabs.Content key={item.id} value={item.id} className="wizard-tabs__content">
          {item.content}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
