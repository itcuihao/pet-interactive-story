import type { ReactNode } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDownIcon } from "@radix-ui/react-icons";

export type CollapsibleSectionProps = {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  summary?: string;
  children: ReactNode;
};

export function CollapsibleSection({
  title,
  description,
  defaultOpen,
  summary,
  children,
}: CollapsibleSectionProps) {
  return (
    <Collapsible.Root className="collapsible-section" defaultOpen={defaultOpen}>
      <Collapsible.Trigger className="collapsible-section__trigger">
        <div className="collapsible-section__copy">
          <strong>{title}</strong>
          {description ? <span>{description}</span> : null}
        </div>
        <div className="collapsible-section__meta">
          {summary ? <small>{summary}</small> : null}
          <ChevronDownIcon className="collapsible-section__chevron" />
        </div>
      </Collapsible.Trigger>
      <Collapsible.Content className="collapsible-section__content">{children}</Collapsible.Content>
    </Collapsible.Root>
  );
}
