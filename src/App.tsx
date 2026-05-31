import { useEffect, useMemo, useState } from "react";
import { PreviewStep } from "@/components/workbench/PreviewStep";
import { AppShell } from "@/components/workbench/AppShell";
import { RecentStoriesList } from "@/components/workbench/RecentStoriesList";
import { ScenesStep } from "@/components/workbench/ScenesStep";
import { SidebarPanel } from "@/components/workbench/SidebarPanel";
import { StoriesGallery } from "@/components/workbench/StoriesGallery";
import { StoryInfoStep } from "@/components/workbench/StoryInfoStep";
import { StoryPlayer } from "@/components/workbench/StoryPlayer";
import { TemplatePicker } from "@/components/workbench/TemplatePicker";
import { WorkspaceHeader } from "@/components/workbench/WorkspaceHeader";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PanelCard } from "@/components/ui/PanelCard";
import type { SelectOption } from "@/types";
import { WizardTabs } from "@/components/ui/WizardTabs";
import { createBlankStory, createScene, createStoryFromTemplate, getTemplates, normalizeStory } from "@/lib/story";
import { deleteStory, getStory, listStories, saveStory } from "@/lib/idb";
import { downloadStoryAsHtml, downloadStoryAsJson, importStoryFromJson, validateStoryForExport } from "@/lib/export";
import type { StoryDocument, StoryMedia, StoryScene } from "@/types";
import { ArrowLeftIcon } from "lucide-react";

type Route =
  | { kind: "home" }
  | { kind: "preview"; id: string }
  | { kind: "share"; id: string };

type AppView = "workbench" | "gallery" | "editor";

type WizardStep = "story" | "scenes" | "preview";

const STEP_LABELS: Array<{ id: WizardStep; label: string; hint: string }> = [
  { id: "story", label: "基本信息", hint: "写下名字、标题和封面" },
  { id: "scenes", label: "编辑片段", hint: "按顺序编辑每个片段" },
  { id: "preview", label: "分享导出", hint: "预览并生成分享页" },
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
  const [view, setView] = useState<AppView>("workbench");
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
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
    () => stories.find((story) => story.id === activeStoryId),
    [stories, activeStoryId],
  );

  async function refreshStories(nextActiveId?: string) {
    setBusy(true);
    const items = await listStories();
    setStories(items);
    if (nextActiveId) setActiveStoryId(nextActiveId);
    setBusy(false);
  }

  async function handleCreateFromTemplate(templateId: string) {
    const story = normalizeStory(createStoryFromTemplate(templateId));
    await saveStory(story);
    await refreshStories(story.id);
    setMessage(`已从「${story.templateName || "模板"}」开始记录。`);
    setTemplatePickerOpen(false);
    setView("editor");
  }

  async function handleCreateBlank() {
    const story = normalizeStory(createBlankStory());
    await saveStory(story);
    await refreshStories(story.id);
    setMessage("已新建空白故事。");
    setTemplatePickerOpen(false);
    setView("editor");
  }

  async function handleDeleteStory(storyId: string) {
    await deleteStory(storyId);
    await refreshStories();
    setMessage("这份本地作品已经移走。");
    if (activeStoryId === storyId) {
      setActiveStoryId("");
      setView("workbench");
    }
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

  function handleSelectStory(storyId: string) {
    setActiveStoryId(storyId);
    setView("editor");
  }

  // Preview / share routes
  if (route.kind !== "home") {
    return <PreviewScreen route={route} onBack={() => pushRoute({ kind: "home" })} />;
  }

  // Full-page gallery (no sidebar)
  if (view === "gallery") {
    return (
      <>
        <div className="min-h-screen">
          <div className="sticky top-0 z-20 p-4">
            <Button variant="outline" onClick={() => setView("workbench")}>返回工作台</Button>
          </div>
          <StoriesGallery
            stories={stories}
            onSelect={handleSelectStory}
            onCreateNew={() => setTemplatePickerOpen(true)}
            onImport={handleImport}
            onDelete={(id) => void handleDeleteStory(id)}
          />
        </div>
        <TemplatePicker
          templates={templates}
          open={templatePickerOpen}
          onOpenChange={setTemplatePickerOpen}
          onCreateBlank={() => void handleCreateBlank()}
          onCreateFromTemplate={(id) => void handleCreateFromTemplate(id)}
        />
      </>
    );
  }

  // Immersive editor (no sidebar)
  if (view === "editor" && activeStory) {
    return (
      <StoryEditor
        key={activeStory.id}
        story={activeStory}
        onBack={() => setView("workbench")}
        onChange={async (nextStory) => {
          const normalized = normalizeStory(nextStory);
          await saveStory(normalized);
          await refreshStories(normalized.id);
        }}
        onDelete={() => void handleDeleteStory(activeStory.id)}
        onPreview={() => pushRoute({ kind: "preview", id: activeStory.id })}
        onSharePreview={() => pushRoute({ kind: "share", id: activeStory.id })}
      />
    );
  }

  // Workbench (sidebar + editor)
  return (
    <AppShell
      sidebar={
        <>
          <SidebarPanel hero>
            <h1 className="font-serif text-[clamp(28px,3vw,42px)] font-semibold leading-[1.08] tracking-tight">宠爱时光</h1>
            <p className="text-muted leading-relaxed text-sm">从点滴片段开始，慢慢整理成你们的宠爱时光。</p>
            <TemplatePicker
              templates={templates}
              open={templatePickerOpen}
              onOpenChange={setTemplatePickerOpen}
              onCreateBlank={() => void handleCreateBlank()}
              onCreateFromTemplate={(id) => void handleCreateFromTemplate(id)}
            />
          </SidebarPanel>
          <SidebarPanel>
            <RecentStoriesList
              busy={busy}
              stories={stories}
              activeStoryId={activeStory?.id}
              onSelect={handleSelectStory}
              onImport={handleImport}
              onOpenGallery={() => setView("gallery")}
            />
          </SidebarPanel>
        </>
      }
      header={<WorkspaceHeader message={message} />}
    >
      {activeStory ? (
        <StoryEditorInline
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
        <PanelCard tone="soft" className="grid gap-3 p-[34px]">
          <h2 className="font-serif text-2xl font-semibold">先选一个模板，再慢慢把今天放进去。</h2>
          <p className="text-muted">别急着先想复杂分支。先把片段写下来，后面的互动自然就会清楚。</p>
        </PanelCard>
      )}
    </AppShell>
  );
}

/**
 * Editor rendered inside the workbench (sidebar visible).
 * Shares the same logic as the immersive StoryEditor but without the sticky back button header.
 */
function StoryEditorInline({
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
        <PreviewStep draft={draft} onBack={goPrevStep} onPreview={onPreview} onSharePreview={onSharePreview} onExportJson={() => downloadStoryAsJson(draft)} onExportHtml={handleExportHtml} exportIssues={exportIssues} />
      ),
  }));

  return (
    <div className="grid gap-[18px]">
      <div className="flex justify-between items-center gap-4 p-3 rounded-[20px] bg-secondary border border-primary/10">
        <h2 className="font-serif text-lg font-semibold truncate">{draft.title || "未命名故事"}</h2>
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>删除作品</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>移走这份本地作品？</AlertDialogTitle>
              <AlertDialogDescription>这会删除当前浏览器里的本地存档。已经导出的分享页和 JSON 文件不会受影响。</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>先保留</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>确认删除</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <PanelCard tone="default">
        <WizardTabs value={step} onValueChange={(value) => setStep(value as WizardStep)} items={items} />
      </PanelCard>
    </div>
  );
}

/**
 * Full-screen immersive editor (no sidebar).
 */
function StoryEditor({
  story,
  onBack,
  onChange,
  onDelete,
  onPreview,
  onSharePreview,
}: {
  story: StoryDocument;
  onBack: () => void;
  onChange: (story: StoryDocument) => Promise<void>;
  onDelete: () => void;
  onPreview: () => void;
  onSharePreview: () => void;
}) {
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
        <PreviewStep draft={draft} onBack={goPrevStep} onPreview={onPreview} onSharePreview={onSharePreview} onExportJson={() => downloadStoryAsJson(draft)} onExportHtml={handleExportHtml} exportIssues={exportIssues} />
      ),
  }));

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-20 p-3 px-5">
        <div className="flex justify-between items-center gap-4 p-3 rounded-[20px] bg-secondary/90 border border-primary/10 backdrop-blur-xl">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-foreground transition-colors"
              title="返回列表"
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </button>
            <h2 className="font-serif text-lg font-semibold truncate">{draft.title || "未命名故事"}</h2>
          </div>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>删除作品</AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>移走这份本地作品？</AlertDialogTitle>
                <AlertDialogDescription>这会删除当前浏览器里的本地存档。已经导出的分享页和 JSON 文件不会受影响。</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>先保留</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>确认删除</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <div className="px-5 pb-8 max-w-3xl mx-auto">
        <PanelCard tone="default">
          <WizardTabs value={step} onValueChange={(value) => setStep(value as WizardStep)} items={items} />
        </PanelCard>
      </div>
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
      <div className="min-h-screen p-5">
        <Button variant="outline" className="sticky top-[18px] z-20 mb-4" onClick={onBack}>
          返回工作台
        </Button>
        <PanelCard tone="soft" className="grid gap-3 p-[34px]">
          <h2 className="font-serif text-2xl font-semibold">这份本地作品暂时不存在。</h2>
          <p className="text-muted">先回去确认你要看的故事是否已经保存在本机。</p>
        </PanelCard>
      </div>
    );
  }

  if (route.kind === "share") {
    return (
      <div className="relative">
        <StoryPlayer story={story} shareMode />
        <button
          onClick={onBack}
          className="fixed top-4 left-4 z-50 w-9 h-9 rounded-full bg-black/40 text-white/50 flex items-center justify-center text-base hover:bg-black/60 hover:text-white transition-colors backdrop-blur-sm"
        >
          &#x2715;
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-20 p-4">
        <Button variant="outline" onClick={onBack}>
          返回工作台
        </Button>
      </div>
      <StoryPlayer story={story} />
    </div>
  );
}
