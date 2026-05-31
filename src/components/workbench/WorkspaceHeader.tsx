import { PanelCard } from "../ui/PanelCard";

export function WorkspaceHeader({ message }: { message: string }) {
  return (
    <PanelCard className="workspace-banner" tone="soft">
      <div className="eyebrow">温柔整理中</div>
      <strong>{message}</strong>
    </PanelCard>
  );
}
