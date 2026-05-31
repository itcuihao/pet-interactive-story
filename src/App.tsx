import { useEffect, useMemo, useState } from "react";
import { PreviewStep } from "./components/workbench/PreviewStep";
import { AppShell } from "./components/workbench/AppShell";
import { BranchesStep } from "./components/workbench/BranchesStep";
import { RecentStoriesList } from "./components/workbench/RecentStoriesList";
import { ScenesStep } from "./components/workbench/ScenesStep";
import { SidebarPanel } from "./components/workbench/SidebarPanel";
import { StoryInfoStep } from "./components/workbench/StoryInfoStep";
import { StoryPlayer } from "./components/workbench/StoryPlayer";
import { TemplatePicker } from "./components/workbench/TemplatePicker";
import { WorkspaceHeader } from "./components/workbench/WorkspaceHeader";
import { Button } from "./components/ui/Button";
import { ConfirmDialog } from "./components/ui/Dialog";
import { PanelCard } from "./components/ui/PanelCard";
import type { SelectOption } from "./components/ui/SelectField";
import { WizardTabs } from "./components/ui/WizardTabs";
import { createBlankStory, createScene, createStoryFromTemplate, getTemplates, normalizeStory } from "./lib/story";
import { deleteStory, getStory, listStories, saveStory } from "./lib/idb";
import { downloadStoryAsHtml, downloadStoryAsJson, importStoryFromJson, validateStoryForExport } from "./lib/export";
import type { StoryDocument, StoryMedia, StoryScene } from "./types";

type Route =
  | { kind: "home" }
  | { kind: "preview"; id: string }
  | { kind: "share"; id: string };

type WizardStep = "template" | "story" | "scenes" | "branches" | "preview";

const STEP_LABELS: Array<{ id: WizardStep; label: string; hint: string }> = [
  { id: "template", label: "选择模板", hint: "确认这份故事从哪里开始" },
  { id: "story", label: "故事信息", hint: "写下名字、标题和封面" },
  { id: "scenes", label: "回忆片段", hint: "按顺序把日常片段放进去" },
  { id: "branches", label: "互动分支", hint: "最后再轻轻补上选择" },
  { id: "preview", label: "预览导出", hint: "检查并生成分享页" },
];

function parseRoute(): Route {
  const hash = window.location.hash.replace(/^#/, "") || "/";
  const [path, query] = hash.split("?");
  const search = new URLSearchParams(query ?? "");
  if (path === "/preview" && search.get("id")) return { kind: "preview", id: search.get("id")! };
  if (path.startsWith("/share/")) return { kind: "share", id: path.slice("/share/".length) };
  return { kind: "home" };
}

function pushRoute(next: Route) {
  if (next.kind === "home") window.location.hash = "/";
  if (next.kind === "preview") window.location.hash = `/preview?id=${next.id}`;
  if (next.kind === "share") window.location.hash = `/share/${next.id}`;
}

export function App() {
  const [route, setRoute] = useState<Route>(parseRoute());
  const [stories, setStories] = useState<StoryDocument[]>([]);
  const [activeStoryId, setActiveStoryId] = useState("");
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("从一个温柔模板开始。");
  const templates = useMemo(() => getTemplates(), []);

  useEffect(() => {
    const onHashChange = () => setRoute(parseRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    void refreshStories();
  }, []);

  const activeStory = useMemo(
    () => stories.find((story) => story.id === activeStoryId) ?? stories[0],
    [stories, activeStoryId],
  );

  useEffect(() => {
    if (!activeStory && stories.length) setActiveStoryId(stories[0].id);
  }, [stories, activeStory]);

  async function refreshStories(nextActiveId?: string) {
    setBusy(true);
    const items = await listStories();
    setStories(items);
    setActiveStoryId(nextActiveId ?? items[0]?.id ?? "");
    setBusy(false);
  }

  async function handleCreateFromTemplate(templateId: string) {
    const story = normalizeStory(createStoryFromTemplate(templateId));
    await saveStory(story);
    await refreshStories(story.id);
    setMessage(`已从「${story.templateName || "模板"}」开始记录。`);
  }

  async function handleCreateBlank() {
    const story = normalizeStory(createBlankStory());
    await saveStory(story);
    await refreshStories(story.id);
    setMessage("已新建空白故事。");
  }

  async function handleDeleteStory(storyId: string) {
    await deleteStory(storyId);
    await refreshStories();
    setMessage("这份本地作品已经移走。");
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const story = normalizeStory(await importStoryFromJson(file));
    await saveStory(story);
    await refreshStories(story.id);
    setMessage("导入成功，可以继续整理这份回忆了。");
    event.target.value = "";
  }

  if (route.kind !== "home") {
    return <PreviewScreen route={route} onBack={() => pushRoute({ kind: "home" })} />;
  }

  return (
    <AppShell
      sidebar={
        <>
          <SidebarPanel hero>
            <div className="eyebrow">开始记录</div>
            <h1>宠爱时光</h1>
            <p className="lede">从点滴片段开始，慢慢整理成你们的宠爱时光。</p>
          </SidebarPanel>
          <SidebarPanel>
            <TemplatePicker
              templates={templates}
              onCreateBlank={() => void handleCreateBlank()}
              onCreateFromTemplate={(templateId) => void handleCreateFromTemplate(templateId)}
            />
          </SidebarPanel>
          <SidebarPanel>
            <RecentStoriesList
              busy={busy}
              stories={stories}
              activeStoryId={activeStory?.id}
              onSelect={setActiveStoryId}
              onImport={handleImport}
            />
          </SidebarPanel>
        </>
      }
      header={<WorkspaceHeader message={message} />}
    >
      {activeStory ? (
        <StoryEditor
          key={activeStory.id}
          story={activeStory}
          onChange={async (nextStory) => {
            const normalized = normalizeStory(nextStory);
            await saveStory(normalized);
            await refreshStories(normalized.id);
            setMessage(`已保存《${normalized.title}》`);
          }}
          onDelete={() => void handleDeleteStory(activeStory.id)}
          onPreview={() => pushRoute({ kind: "preview", id: activeStory.id })}
          onSharePreview={() => pushRoute({ kind: "share", id: activeStory.id })}
        />
      ) : (
        <PanelCard className="empty-state" tone="soft">
          <h2>先选一个模板，再慢慢把今天放进去。</h2>
          <p>别急着先想复杂分支。先把片段写下来，后面的互动自然就会清楚。</p>
        </PanelCard>
      )}
    </AppShell>
  );
}

function StoryEditor({
  story,
  onChange,
  onDelete,
  onPreview,
  onSharePreview,
}: {
  story: StoryDocument;
  onChange: (story: StoryDocument) => Promise<void>;
  onDelete: () => void;
  onPreview: () => void;
  onSharePreview: () => void;
}) {
  const [draft, setDraft] = useState(story);
  const [step, setStep] = useState<WizardStep>("template");
  const [showAdvancedGraph, setShowAdvancedGraph] = useState(story.mode === "graph");
  const [exportIssues, setExportIssues] = useState<ReturnType<typeof validateStoryForExport>["issues"]>([]);
  const templates = useMemo(() => getTemplates(), []);

  useEffect(() => {
    setDraft(story);
    setShowAdvancedGraph(story.mode === "graph");
    setExportIssues([]);
  }, [story]);

  async function update(next: StoryDocument) {
    setDraft(next);
    await onChange(next);
  }

  function patchStory(patch: Partial<StoryDocument>) {
    void update({
      ...draft,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
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
    void update({
      ...draft,
      scenes: [...draft.scenes, scene],
      updatedAt: new Date().toISOString(),
    });
  }

  function removeScene(sceneId: string) {
    if (draft.scenes.length <= 1) return;
    const scenes = draft.scenes.filter((scene) => scene.id !== sceneId);
    const nextSceneId = draft.startSceneId === sceneId ? scenes[0].id : draft.startSceneId;
    const repairedScenes = scenes.map((scene) => ({
      ...scene,
      choices: scene.choices.filter((choice) => choice.nextSceneId !== sceneId),
    }));

    void update({
      ...draft,
      scenes: repairedScenes,
      startSceneId: nextSceneId,
      updatedAt: new Date().toISOString(),
    });
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

  const currentTemplate = templates.find((template) => template.id === draft.templateId);
  const sceneOptions: SelectOption[] = draft.scenes.map((scene) => ({
    value: scene.id,
    label: scene.title || "未命名片段",
    description: scene.background || undefined,
  }));

  const items = STEP_LABELS.map((item) => ({
    ...item,
    content:
      item.id === "template" ? (
        <section className="step-panel">
          <div className="section-head">
            <h2>1. 选择模板</h2>
            <Button variant="primary" onClick={goNextStep}>
              下一步
            </Button>
          </div>
          <p className="helper-text">这一步不用重新选模板。先确认这份故事是从哪种日常情绪开始的，后面才更容易往里放片段。</p>
          <PanelCard className="template-current" tone="highlight">
            <strong>{draft.templateName || "空白故事"}</strong>
            <p>{currentTemplate?.description || "这份故事没有预设模板，你可以按自己的节奏慢慢写。"}</p>
          </PanelCard>
          <div className="template-mini-grid">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`template-mini accent-${template.accent} ${draft.templateId === template.id ? "selected" : ""}`}
              >
                <strong>{template.name}</strong>
                <span>{template.description}</span>
              </div>
            ))}
          </div>
        </section>
      ) : item.id === "story" ? (
        <StoryInfoStep
          draft={draft}
          sceneOptions={sceneOptions}
          onBack={goPrevStep}
          onNext={goNextStep}
          onPatchStory={patchStory}
          onSetCover={setCover}
        />
      ) : item.id === "scenes" ? (
        <ScenesStep
          scenes={draft.scenes}
          onBack={goPrevStep}
          onNext={goNextStep}
          onAddScene={addScene}
          onUpdateScene={updateScene}
          onMoveScene={moveScene}
          onRemoveScene={removeScene}
        />
      ) : item.id === "branches" ? (
        <BranchesStep
          story={draft}
          sceneOptions={sceneOptions}
          showAdvancedGraph={showAdvancedGraph}
          onToggleAdvancedGraph={() => {
            const next = !showAdvancedGraph;
            setShowAdvancedGraph(next);
            patchStory({ mode: next ? "graph" : "template" });
          }}
          onBack={goPrevStep}
          onNext={goNextStep}
          onSceneChange={updateScene}
          onMoveScene={moveScene}
          onRemoveScene={removeScene}
        />
      ) : (
        <PreviewStep
          draft={draft}
          onBack={goPrevStep}
          onPreview={onPreview}
          onSharePreview={onSharePreview}
          onExportJson={() => downloadStoryAsJson(draft)}
          onExportHtml={handleExportHtml}
          exportIssues={exportIssues}
        />
      ),
  }));

  return (
    <div className="editor-shell">
      <PanelCard className="editor-hero" tone="default">
        <div className="section-head">
          <div>
            <div className="eyebrow">步骤向导</div>
            <h2>先顺着步骤整理，再决定要不要细调流程图。</h2>
          </div>
          <ConfirmDialog
            trigger={<Button variant="danger">删除作品</Button>}
            title="移走这份本地作品？"
            description="这会删除当前浏览器里的本地存档。已经导出的分享页和 JSON 文件不会受影响。"
            confirmLabel="确认删除"
            onConfirm={onDelete}
          />
        </div>
      </PanelCard>
      <PanelCard className="editor-card" tone="default">
        <WizardTabs value={step} onValueChange={(value) => setStep(value as WizardStep)} items={items} />
      </PanelCard>
    </div>
  );
}

function PreviewScreen({
  route,
  onBack,
}: {
  route: Extract<Route, { kind: "preview" | "share" }>;
  onBack: () => void;
}) {
  const [story, setStory] = useState<StoryDocument | null>(null);

  useEffect(() => {
    void getStory(route.id).then((item) => setStory(item ?? null));
  }, [route.id]);

  if (!story) {
    return (
      <div className="preview-shell">
        <Button className="back-floating" onClick={onBack}>
          返回工作台
        </Button>
        <PanelCard className="empty-state" tone="soft">
          <h2>这份本地作品暂时不存在。</h2>
          <p>先回去确认你要看的故事是否已经保存在本机。</p>
        </PanelCard>
      </div>
    );
  }

  return (
    <div className={`preview-shell ${route.kind === "share" ? "share-mode" : ""}`}>
      <Button className="back-floating" onClick={onBack}>
        返回工作台
      </Button>
      <StoryPlayer story={story} shareMode={route.kind === "share"} />
    </div>
  );
}
