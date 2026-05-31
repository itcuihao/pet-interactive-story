import type { StoryDocument, StoryScene } from "@/types";
import { getLinearNextSceneId, getVisibleSceneIds } from "@/lib/player";
import type { SelectOption } from "@/types";
import { Button } from "@/components/ui/button";
import { PanelCard } from "@/components/ui/PanelCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SelectField } from "@/components/ui/SelectField";

export function GraphView({ story, sceneOptions, onSceneChange, onMoveScene, onRemoveScene }: {
  story: StoryDocument; sceneOptions: SelectOption[];
  onSceneChange: (sceneId: string, updater: (scene: StoryScene) => StoryScene) => void;
  onMoveScene: (sceneId: string, direction: -1 | 1) => void; onRemoveScene: (sceneId: string) => void;
}) {
  const previewPath = getVisibleSceneIds(story, {});

  return (
    <div className="grid gap-3.5">
      <PanelCard tone="soft">
        <strong className="text-foreground">当前主线预览</strong>
        <p className="text-sm text-muted mt-2">{previewPath.map((id) => story.scenes.find((s) => s.id === id)?.title || "未命名").join(" → ")}</p>
      </PanelCard>
      <ScrollArea className="h-[min(58vh,560px)]">
        <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3.5 pr-1.5">
          {story.scenes.map((scene, index) => (
            <PanelCard key={scene.id} tone="default" className={story.startSceneId === scene.id ? "border-primary/34 shadow-[0_18px_38px_rgba(190,125,67,0.14)]" : ""}>
              <div className="grid gap-3.5">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <strong className="block text-foreground">{scene.title || `节点 ${index + 1}`}</strong>
                    <span className="text-sm text-muted">{scene.ending ? "结尾节点" : scene.background || "普通片段"}</span>
                  </div>
                  <small className="text-xs text-muted">{scene.choices.length ? `${scene.choices.length} 条连向` : "线性继续"}</small>
                </div>
                <p className="text-sm text-muted p-3.5 rounded-[18px] bg-[rgba(249,244,237,0.84)] border border-primary/10">{scene.text || "这里还没有片段文案。"}</p>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => onMoveScene(scene.id, -1)}>上移</Button>
                  <Button size="sm" variant="outline" onClick={() => onMoveScene(scene.id, 1)}>下移</Button>
                  <Button size="sm" variant="destructive" onClick={() => onRemoveScene(scene.id)}>删除</Button>
                </div>
                <div className="grid gap-2.5">
                  {scene.choices.length ? scene.choices.map((choice) => (
                    <div key={choice.id} className="grid gap-2 p-3.5 rounded-[18px] bg-orange-50/76 border border-primary/12">
                      <strong className="text-foreground text-sm">{choice.label}</strong>
                      <span className="text-xs text-muted">从「{scene.title || "当前节点"}」走向</span>
                      <SelectField value={choice.nextSceneId} options={sceneOptions} onValueChange={(value) =>
                        onSceneChange(scene.id, (c) => ({ ...c, choices: c.choices.map((item) => item.id === choice.id ? { ...item, nextSceneId: value } : item) }))
                      } />
                    </div>
                  )) : (
                    <p className="text-sm text-muted">没有显式分支时，默认会继续到 <strong className="text-foreground">{getLinearNextSceneId(story, scene.id) ? "下一段" : "结尾"}</strong>。</p>
                  )}
                </div>
              </div>
            </PanelCard>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
