import type { StoryTemplate } from "../../types";
import { Button } from "../ui/Button";

export function TemplatePicker({
  templates,
  onCreateBlank,
  onCreateFromTemplate,
}: {
  templates: StoryTemplate[];
  onCreateBlank: () => void;
  onCreateFromTemplate: (templateId: string) => void;
}) {
  return (
    <>
      <div className="section-head">
        <h2>开始记录</h2>
        <Button onClick={onCreateBlank}>新建空白故事</Button>
      </div>
      <div className="template-list">
        {templates.map((template) => (
          <button
            key={template.id}
            className={`template-card accent-${template.accent}`}
            onClick={() => onCreateFromTemplate(template.id)}
          >
            <strong>{template.name}</strong>
            <span>{template.description}</span>
          </button>
        ))}
      </div>
    </>
  );
}
