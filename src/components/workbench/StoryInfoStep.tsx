import type { StoryDocument, StoryMedia } from "../../types";
import type { SelectOption } from "../ui/SelectField";
import { Button } from "../ui/Button";
import { SelectField } from "../ui/SelectField";
import { MediaField } from "./MediaField";

export function StoryInfoStep({
  draft,
  sceneOptions,
  onBack,
  onNext,
  onPatchStory,
  onSetCover,
}: {
  draft: StoryDocument;
  sceneOptions: SelectOption[];
  onBack: () => void;
  onNext: () => void;
  onPatchStory: (patch: Partial<StoryDocument>) => void;
  onSetCover: (media?: StoryMedia) => void;
}) {
  return (
    <section className="step-panel">
      <div className="section-head">
        <h2>2. 故事信息</h2>
        <div className="inline-actions">
          <Button onClick={onBack}>上一步</Button>
          <Button variant="primary" onClick={onNext}>
            下一步
          </Button>
        </div>
      </div>
      <div className="meta-grid">
        <label>
          宠物名字
          <input value={draft.petName} onChange={(event) => onPatchStory({ petName: event.target.value })} />
        </label>
        <label>
          故事标题
          <input value={draft.title} onChange={(event) => onPatchStory({ title: event.target.value })} />
        </label>
        <label className="full-span">
          一句话摘要
          <textarea value={draft.summary ?? ""} onChange={(event) => onPatchStory({ summary: event.target.value })} />
        </label>
        <label>
          起始片段
          <SelectField
            value={draft.startSceneId}
            options={sceneOptions}
            placeholder="选择作为开场的片段"
            onValueChange={(value) => onPatchStory({ startSceneId: value })}
          />
        </label>
      </div>
      <MediaField
        label="封面图片 / 视频链接"
        media={draft.cover}
        onChange={onSetCover}
        hint="图片会跟随导出文件一起走；视频请使用可公开访问的链接。"
      />
    </section>
  );
}
