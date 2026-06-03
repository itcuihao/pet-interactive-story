import type { StoryChoice, StoryDocument, StoryScene } from "@/types";
import { getLinearNextSceneId } from "@/lib/player";
import type { SelectOption } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SelectField } from "@/components/ui/SelectField";
import { GraphView } from "./GraphView";
import { ChevronDown } from "lucide-react";
import { AiButton } from "@/components/ui/AiButton";
import { polishChoiceLabel, polishChoiceCover } from "@/lib/ai";

export function BranchesStep({ story, sceneOptions, showAdvancedGraph, onToggleAdvancedGraph, onBack, onNext, onSceneChange, onMoveScene, onRemoveScene }: {
  story: StoryDocument; sceneOptions: SelectOption[]; showAdvancedGraph: boolean; onToggleAdvancedGraph: () => void;
  onBack: () => void; onNext: () => void;
  onSceneChange: (sceneId: string, updater: (scene: StoryScene) => StoryScene) => void;
  onMoveScene: (sceneId: string, direction: -1 | 1) => void; onRemoveScene: (sceneId: string) => void;
}) {
  return (
    <section className="grid gap-4">
      <div className="flex justify-between items-center gap-4 p-3 rounded-[20px] bg-secondary border border-primary/10">
        <h2 className="font-serif text-xl font-semibold">4. 互动分支</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={onBack}>上一步</Button>
          <Button onClick={onNext}>下一步</Button>
        </div>
      </div>
      <p className="text-sm text-muted">这里的分支只负责"接下来先展开哪一段"。先让故事顺起来，再来补这一层，才不会越做越乱。</p>
      <div className="grid gap-3">
        {story.scenes.map((scene) => (
          <BranchCard key={scene.id} story={story} scene={scene} sceneOptions={sceneOptions} onSceneChange={onSceneChange} />
        ))}
      </div>
      <div className="flex justify-between items-start gap-4 p-[18px] rounded-2xl border border-primary/16 bg-gradient-to-b from-white/96 to-orange-50/90">
        <div>
          <strong className="text-foreground">需要细看关系时，再进入高级流程视图。</strong>
          <p className="text-sm text-muted mt-1">普通用户停在上面的分支卡片就够用了，流程视图只用来检查连向是否清楚。</p>
        </div>
        <Button variant={showAdvancedGraph ? "default" : "outline"} onClick={onToggleAdvancedGraph}>
          {showAdvancedGraph ? "收起高级流程视图" : "进入高级流程视图"}
        </Button>
      </div>
      {showAdvancedGraph ? <GraphView story={story} sceneOptions={sceneOptions} onSceneChange={onSceneChange} onMoveScene={onMoveScene} onRemoveScene={onRemoveScene} /> : null}
    </section>
  );
}

function BranchCard({ story, scene, sceneOptions, onSceneChange }: {
  story: StoryDocument; scene: StoryScene; sceneOptions: SelectOption[];
  onSceneChange: (sceneId: string, updater: (scene: StoryScene) => StoryScene) => void;
}) {
  const linearNext = getLinearNextSceneId(story, scene.id);

  function patchChoices(nextChoices: StoryChoice[]) {
    onSceneChange(scene.id, (current) => ({
      ...current,
      layout: nextChoices.length ? "choice-gate" : "moment",
      choices: nextChoices.slice(0, 2),
    }));
  }

  return (
    <Collapsible defaultOpen={scene.choices.length > 0} className="border border-border rounded-2xl bg-card shadow-[0_18px_50px_rgba(104,75,54,0.12)] overflow-hidden">
      <CollapsibleTrigger className="w-full flex justify-between gap-4 p-[18px] text-left bg-gradient-to-b from-white/98 to-orange-50/92 transition-colors hover:bg-gradient-to-b hover:from-white hover:to-orange-50/96">
        <div className="grid gap-1.5">
          <strong className="text-foreground">{scene.title || "未命名片段"}</strong>
          <span className="text-sm text-muted">{scene.background || "没有场景氛围描述"}</span>
        </div>
        <div className="flex items-center gap-2.5 text-accent-foreground">
          {scene.choices.length ? <small className="text-xs">{scene.choices.length} 个选择</small> : <small className="text-xs">线性继续</small>}
          <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="p-5 pt-0">
        <div className="grid gap-3.5">
          <p className="text-sm text-muted">这个片段{scene.choices.length ? "会停下来让用户选择后续" : "目前会按顺序继续到下一段"}。</p>
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold">选择按钮</h3>
            {scene.choices.length < 2 ? (
              <Button size="sm" variant="outline" onClick={() =>
                patchChoices([...scene.choices, { id: crypto.randomUUID(), label: "继续看", coverText: "", nextSceneId: linearNext ?? story.scenes[0]?.id ?? scene.id }])
              }>添加选择</Button>
            ) : null}
          </div>
          {scene.choices.length ? scene.choices.map((choice) => (
            <div key={choice.id} className="grid grid-cols-1 sm:grid-cols-[1.2fr_1.2fr_240px_auto] gap-3 p-3.5 rounded-[18px] bg-warm-soft border border-primary/12">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] text-muted-foreground font-medium">按钮文案</span>
                  <AiButton
                    label="按钮文案"
                    fetchOptions={() => polishChoiceLabel(story.title, scene.text, choice.label, story.petId)}
                    onSelect={(r) => patchChoices(scene.choices.map((c) => c.id === choice.id ? { ...c, label: r } : c))}
                  />
                </div>
                <Input value={choice.label} placeholder="按钮文案" onChange={(e) => patchChoices(scene.choices.map((c) => c.id === choice.id ? { ...c, label: e.target.value } : c))} />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] text-muted-foreground font-medium">提示小字</span>
                  <AiButton
                    label="提示小字"
                    fetchOptions={() => polishChoiceCover(story.title, scene.text, choice.label, choice.coverText ?? "", story.petId)}
                    onSelect={(r) => patchChoices(scene.choices.map((c) => c.id === choice.id ? { ...c, coverText: r } : c))}
                  />
                </div>
                <Input value={choice.coverText ?? ""} placeholder="按钮下的小提示（可选）" onChange={(e) => patchChoices(scene.choices.map((c) => c.id === choice.id ? { ...c, coverText: e.target.value } : c))} />
              </div>
              <div className="flex flex-col gap-1 justify-end">
                <span className="text-[10px] text-muted-foreground font-medium px-1 mb-1 sm:block hidden">跳转到</span>
                <SelectField value={choice.nextSceneId} options={sceneOptions} onValueChange={(value) => patchChoices(scene.choices.map((c) => c.id === choice.id ? { ...c, nextSceneId: value } : c))} />
              </div>
              <div className="flex flex-col justify-end">
                <Button size="sm" variant="destructive" onClick={() => patchChoices(scene.choices.filter((c) => c.id !== choice.id))}>删除</Button>
              </div>
            </div>
          )) : (
            <p className="text-sm text-muted">暂时不加分支也没关系，当前会继续到 <strong className="text-foreground">{linearNext ? `「${story.scenes.find((item) => item.id === linearNext)?.title || "下一段"}」` : "故事结尾"}</strong>。</p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
