import type { StoryDocument, StoryMedia } from "@/types";
import type { SelectOption } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SelectField } from "@/components/ui/SelectField";
import { AiButton } from "@/components/ui/AiButton";
import { polishTitle, polishSummary } from "@/lib/ai";
import { MediaField } from "./MediaField";

export function StoryInfoStep({ draft, sceneOptions, onNext, onPatchStory, onSetCover }: {
  draft: StoryDocument; sceneOptions: SelectOption[]; onNext: () => void;
  onPatchStory: (patch: Partial<StoryDocument>) => void; onSetCover: (media?: StoryMedia) => void;
}) {
  return (
    <section className="grid gap-4">
      <div className="flex justify-between items-center gap-4 p-3 rounded-[20px] bg-secondary border border-primary/10">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-xl font-semibold">1. 基本信息</h2>
          {draft.templateName ? (
            <Badge variant="secondary">{draft.templateName}</Badge>
          ) : null}
        </div>
        <Button onClick={onNext}>下一步</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="grid gap-2">
          <Label>宠物名字</Label>
          <Input value={draft.petName} onChange={(e) => onPatchStory({ petName: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <div className="flex justify-between items-center">
            <Label>故事标题</Label>
            <AiButton label="标题" onApply={async () => { const r = await polishTitle(draft.petName, draft.title); onPatchStory({ title: r }); return r; }} />
          </div>
          <Input value={draft.title} onChange={(e) => onPatchStory({ title: e.target.value })} />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <div className="flex justify-between items-center">
            <Label>一句话摘要</Label>
            <AiButton label="摘要" onApply={async () => { const r = await polishSummary(draft.petName, draft.title, draft.summary ?? ""); onPatchStory({ summary: r }); return r; }} />
          </div>
          <Textarea value={draft.summary ?? ""} onChange={(e) => onPatchStory({ summary: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label>起始片段</Label>
          <SelectField value={draft.startSceneId} options={sceneOptions} placeholder="选择作为开场的片段" onValueChange={(value) => onPatchStory({ startSceneId: value })} />
        </div>
      </div>
      <MediaField label="封面图片 / 视频链接" media={draft.cover} onChange={onSetCover} hint="图片会跟随导出文件一起走；视频请使用可公开访问的链接。" usage="cover" />
    </section>
  );
}
