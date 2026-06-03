import { useState } from "react";
import type { StoryChoice, StoryDocument, StoryScene } from "@/types";
import type { SelectOption } from "@/types";
import { getLinearNextSceneId } from "@/lib/player";
import { polishSceneTitle, polishSceneText, polishSceneBackground, polishChoiceLabel } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { ChevronUpIcon, ChevronDownIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { SelectField } from "@/components/ui/SelectField";
import { AiButton } from "@/components/ui/AiButton";
import { MediaField } from "./MediaField";
import { FlowThumbnail } from "./FlowThumbnail";

export function ScenesStep({ story, scenes, sceneOptions, onBack, onNext, onAddScene, onUpdateScene, onMoveScene, onRemoveScene }: {
  story: StoryDocument;
  scenes: StoryScene[];
  sceneOptions: SelectOption[];
  onBack: () => void;
  onNext: () => void;
  onAddScene: () => void;
  onUpdateScene: (sceneId: string, updater: (scene: StoryScene) => StoryScene) => void;
  onMoveScene: (sceneId: string, direction: -1 | 1) => void;
  onRemoveScene: (sceneId: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="grid gap-4">
      <div className="flex justify-between items-center gap-4 p-3 rounded-[20px] bg-secondary border border-primary/10">
        <h2 className="font-serif text-xl font-semibold">2. 编辑片段</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={onBack}>上一步</Button>
          <Button variant="outline" onClick={onAddScene}>添加片段</Button>
          <Button onClick={onNext}>下一步</Button>
        </div>
      </div>

      <FlowThumbnail
        story={story}
        activeSceneId={openId}
        onSceneClick={(id) => setOpenId(id)}
      />

      <Accordion
        value={openId ? [openId] : []}
        onValueChange={(values: string[]) => setOpenId(values.length ? values[values.length - 1] : null)}
      >
        {scenes.map((scene, index) => (
          <AccordionItem key={scene.id} value={scene.id} className="border border-border rounded-2xl mb-3 overflow-hidden bg-card shadow-[0_18px_50px_rgba(104,75,54,0.12)]">
            <AccordionTrigger className="w-full flex items-center justify-between gap-3 px-[18px] py-3 text-left bg-gradient-to-b from-white/98 to-orange-50/92 hover:bg-gradient-to-b hover:from-white hover:to-orange-50/96 transition-colors rounded-2xl">
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{index + 1}</Badge>
                <strong className="text-foreground text-sm">{scene.title || "未命名片段"}</strong>
                {scene.background ? <span className="text-xs text-muted-foreground">{scene.background}</span> : null}
                {scene.choices.length ? <Badge variant="outline">{scene.choices.length} 个选择</Badge> : null}
              </div>
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <span
                  role="button"
                  tabIndex={0}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-foreground transition-colors cursor-pointer inline-flex items-center justify-center"
                  onClick={() => onMoveScene(scene.id, -1)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onMoveScene(scene.id, -1); }}
                  title="上移"
                >
                  <ChevronUpIcon className="h-4 w-4" />
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-foreground transition-colors cursor-pointer inline-flex items-center justify-center"
                  onClick={() => onMoveScene(scene.id, 1)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onMoveScene(scene.id, 1); }}
                  title="下移"
                >
                  <ChevronDownIcon className="h-4 w-4" />
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer inline-flex items-center justify-center"
                  onClick={() => onRemoveScene(scene.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onRemoveScene(scene.id); }}
                  title="删除"
                >
                  <XIcon className="h-4 w-4" />
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-[18px] pb-4">
              <Card>
                <CardContent className="grid gap-4 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="grid gap-2">
                      <div className="flex justify-between items-center">
                        <Label>标题</Label>
                        <AiButton label="片段标题" fetchOptions={() => polishSceneTitle(story.title, scene.title, scene.text, story.petId)} onSelect={(r) => onUpdateScene(scene.id, (c) => ({ ...c, title: r }))} />
                      </div>
                      <Input value={scene.title} onChange={(e) => onUpdateScene(scene.id, (c) => ({ ...c, title: e.target.value }))} />
                    </div>
                    <div className="grid gap-2">
                      <div className="flex justify-between items-center">
                        <Label>场景氛围</Label>
                        <AiButton label="场景氛围" fetchOptions={() => polishSceneBackground(story.petName, story.title, scene.title, scene.background ?? "", scene.text, story.petId)} onSelect={(r) => onUpdateScene(scene.id, (c) => ({ ...c, background: r }))} />
                      </div>
                      <Input value={scene.background ?? ""} onChange={(e) => onUpdateScene(scene.id, (c) => ({ ...c, background: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <div className="flex justify-between items-center">
                      <Label>文案</Label>
                      <AiButton label="片段文案" fetchOptions={() => polishSceneText(story.title, scene.title, scene.text, story.petId)} onSelect={(r) => onUpdateScene(scene.id, (c) => ({ ...c, text: r }))} />
                    </div>
                    <Textarea value={scene.text} onChange={(e) => onUpdateScene(scene.id, (c) => ({ ...c, text: e.target.value }))} />
                  </div>
                  <MediaField label="片段媒体" media={scene.media} onChange={(media) => onUpdateScene(scene.id, (c) => ({ ...c, media }))} hint="图片或视频，让片段更生动。" usage="scene" />

                  <Separator />

                  <BranchEditor story={story} scene={scene} sceneOptions={sceneOptions} onUpdateScene={onUpdateScene} />
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

function BranchEditor({ story, scene, sceneOptions, onUpdateScene }: {
  story: StoryDocument;
  scene: StoryScene;
  sceneOptions: SelectOption[];
  onUpdateScene: (sceneId: string, updater: (scene: StoryScene) => StoryScene) => void;
}) {
  const linearNext = getLinearNextSceneId(story, scene.id);

  function patchChoices(nextChoices: StoryChoice[]) {
    onUpdateScene(scene.id, (current) => ({
      ...current,
      layout: nextChoices.length ? "choice-gate" : "moment",
      choices: nextChoices.slice(0, 2),
    }));
  }

  return (
    <div className="grid gap-3">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-foreground">互动选择</h3>
        {scene.choices.length < 2 ? (
          <Button size="sm" variant="outline" onClick={() =>
            patchChoices([...scene.choices, { id: crypto.randomUUID(), label: "继续看", coverText: "", nextSceneId: linearNext ?? story.scenes[0]?.id ?? scene.id }])
          }>添加选择</Button>
        ) : null}
      </div>
      {scene.choices.length ? scene.choices.map((choice) => (
        <div key={choice.id} className="grid grid-cols-1 sm:grid-cols-[1.5fr_1.5fr_auto] gap-3 p-3.5 rounded-[18px] bg-secondary/50 border border-primary/12">
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
          <div className="flex flex-col gap-1 justify-end">
            <span className="text-[10px] text-muted-foreground font-medium px-1 mb-1 sm:block hidden">跳转到</span>
            <SelectField value={choice.nextSceneId} options={sceneOptions} placeholder="跳转到" onValueChange={(value) => patchChoices(scene.choices.map((c) => c.id === choice.id ? { ...c, nextSceneId: value } : c))} />
          </div>
          <div className="flex flex-col justify-end">
            <Button size="sm" variant="destructive" onClick={() => patchChoices(scene.choices.filter((c) => c.id !== choice.id))}>删除</Button>
          </div>
        </div>
      )) : (
        <p className="text-sm text-muted-foreground">
          暂时不加分支也没关系，当前会继续到{" "}
          {linearNext ? (
            <strong className="text-foreground">「{story.scenes.find((item) => item.id === linearNext)?.title || "下一段"}」</strong>
          ) : (
            "故事结尾"
          )}。
        </p>
      )}
    </div>
  );
}
