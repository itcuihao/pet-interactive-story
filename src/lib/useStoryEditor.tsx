import { useEffect, useState } from "react";
import type { SelectOption, StoryDocument, StoryMedia, StoryScene } from "@/types";
import { createScene } from "@/lib/story";
import { downloadStoryAsHtml, downloadStoryAsJson, validateStoryForExport } from "@/lib/export";
import { StoryInfoStep } from "@/components/workbench/StoryInfoStep";
import { ScenesStep } from "@/components/workbench/ScenesStep";
import { PreviewStep } from "@/components/workbench/PreviewStep";

export type WizardStep = "story" | "scenes" | "preview";

export const STEP_LABELS: Array<{ id: WizardStep; label: string; hint: string }> = [
  { id: "story", label: "基本信息", hint: "写下名字、标题和封面" },
  { id: "scenes", label: "编辑片段", hint: "按顺序编辑每个片段" },
  { id: "preview", label: "分享导出", hint: "预览并生成分享页" },
];

export function useStoryEditor(
  story: StoryDocument,
  onChange: (story: StoryDocument) => Promise<void>,
  onPreview: () => void,
  onSharePreview: () => void,
  onDone: () => void,
) {
  const [draft, setDraft] = useState(story);
  const [step, setStep] = useState<WizardStep>("story");
  const [exportIssues, setExportIssues] = useState<ReturnType<typeof validateStoryForExport>["issues"]>([]);

  useEffect(() => {
    setDraft(story);
    setExportIssues([]);
  }, [story]);

  async function update(next: StoryDocument) {
    setDraft(next);
    await onChange(next);
  }

  function patchStory(patch: Partial<StoryDocument>) {
    void update({ ...draft, ...patch, updatedAt: new Date().toISOString() });
  }

  function updateScene(sceneId: string, updater: (scene: StoryScene) => StoryScene) {
    void update({
      ...draft,
      scenes: draft.scenes.map((scene) => (scene.id === sceneId ? updater(scene) : scene)),
      updatedAt: new Date().toISOString(),
    });
  }

  function addScene() {
    const scene = createScene();
    void update({ ...draft, scenes: [...draft.scenes, scene], updatedAt: new Date().toISOString() });
  }

  function removeScene(sceneId: string) {
    if (draft.scenes.length <= 1) return;
    const scenes = draft.scenes.filter((scene) => scene.id !== sceneId);
    const nextSceneId = draft.startSceneId === sceneId ? scenes[0].id : draft.startSceneId;
    const repairedScenes = scenes.map((scene) => ({
      ...scene,
      choices: scene.choices.filter((choice) => choice.nextSceneId !== sceneId),
    }));
    void update({ ...draft, scenes: repairedScenes, startSceneId: nextSceneId, updatedAt: new Date().toISOString() });
  }

  function moveScene(sceneId: string, direction: -1 | 1) {
    const index = draft.scenes.findIndex((scene) => scene.id === sceneId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= draft.scenes.length) return;
    const scenes = [...draft.scenes];
    [scenes[index], scenes[target]] = [scenes[target], scenes[index]];
    void update({ ...draft, scenes, updatedAt: new Date().toISOString() });
  }

  function setCover(media?: StoryMedia) {
    void update({ ...draft, cover: media, updatedAt: new Date().toISOString() });
  }

  function handleExportHtml() {
    const result = validateStoryForExport(draft);
    setExportIssues(result.issues);
    if (!result.ok) return;
    downloadStoryAsHtml(draft);
  }

  function goPrevStep() {
    const index = STEP_LABELS.findIndex((item) => item.id === step);
    if (index > 0) setStep(STEP_LABELS[index - 1].id);
  }

  function goNextStep() {
    const index = STEP_LABELS.findIndex((item) => item.id === step);
    if (index < STEP_LABELS.length - 1) setStep(STEP_LABELS[index + 1].id);
  }

  const sceneOptions: SelectOption[] = draft.scenes.map((scene) => ({
    value: scene.id,
    label: scene.title || "未命名片段",
    description: scene.background || undefined,
  }));

  const items = STEP_LABELS.map((item) => ({
    ...item,
    content:
      item.id === "story" ? (
        <StoryInfoStep draft={draft} sceneOptions={sceneOptions} onNext={goNextStep} onPatchStory={patchStory} onSetCover={setCover} />
      ) : item.id === "scenes" ? (
        <ScenesStep story={draft} scenes={draft.scenes} sceneOptions={sceneOptions} onBack={goPrevStep} onNext={goNextStep} onAddScene={addScene} onUpdateScene={updateScene} onMoveScene={moveScene} onRemoveScene={removeScene} />
      ) : (
        <PreviewStep draft={draft} onBack={goPrevStep} onPreview={onPreview} onSharePreview={onSharePreview} onExportJson={() => downloadStoryAsJson(draft)} onExportHtml={handleExportHtml} onDone={onDone} exportIssues={exportIssues} />
      ),
  }));

  return { draft, step, setStep, items };
}
