import type { StoryDocument } from "../../types";
import type { ExportValidationIssue } from "../../lib/export";
import { Button } from "../ui/Button";
import { StoryPlayer } from "./StoryPlayer";

export function PreviewStep({
  draft,
  onBack,
  onPreview,
  onSharePreview,
  onExportJson,
  onExportHtml,
  exportIssues,
}: {
  draft: StoryDocument;
  onBack: () => void;
  onPreview: () => void;
  onSharePreview: () => void;
  onExportJson: () => void;
  onExportHtml: () => void;
  exportIssues: ExportValidationIssue[];
}) {
  return (
    <section className="step-panel">
      <div className="section-head">
        <h2>5. 预览与导出</h2>
        <Button onClick={onBack}>上一步</Button>
      </div>
      <div className="preview-actions">
        <Button onClick={onPreview}>工作台预览</Button>
        <Button onClick={onSharePreview}>单页分享预览</Button>
        <Button onClick={onExportJson}>导出 JSON</Button>
        <Button variant="primary" onClick={onExportHtml}>
          导出分享页
        </Button>
      </div>
      {exportIssues.length ? (
        <div className="export-issues">
          <strong>导出检查</strong>
          <ul>
            {exportIssues.map((issue) => (
              <li key={`${issue.code}-${issue.path}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <StoryPlayer story={draft} />
    </section>
  );
}
