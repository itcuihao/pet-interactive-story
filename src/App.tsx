import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/workbench/AppShell";
import { RecentStoriesList } from "@/components/workbench/RecentStoriesList";
import { SidebarPanel } from "@/components/workbench/SidebarPanel";
import { StoriesGallery } from "@/components/workbench/StoriesGallery";
import { StoryPlayer } from "@/components/workbench/StoryPlayer";
import { TemplatePicker } from "@/components/workbench/TemplatePicker";
import { WorkspaceHeader } from "@/components/workbench/WorkspaceHeader";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PanelCard } from "@/components/ui/PanelCard";
import { WizardTabs } from "@/components/ui/WizardTabs";
import { createBlankStory, createStoryFromTemplate, getTemplates, normalizeStory } from "@/lib/story";
import { deleteStory, getStory, listStories, saveStory, getMediaBlob } from "@/lib/idb";
import { importStoryFromJson } from "@/lib/export";
import { getPetById } from "@/lib/pets";
import { compressStory, decompressStory, shortenUrl as shortenUrlApi } from "@/lib/share";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import type { StoryDocument, StoryMedia } from "@/types";
import { useStoryEditor, STEP_LABELS } from "@/lib/useStoryEditor";
import type { WizardStep } from "@/lib/useStoryEditor";
import { cn } from "@/lib/utils";
import { ArrowLeftIcon, PlusIcon, XIcon, ThumbsUp, Star, Share2, Maximize2, Minimize2, Eye, Coins, Pencil } from "lucide-react";
import { FlowThumbnail } from "@/components/workbench/FlowThumbnail";

type Route =
  | { kind: "home" }
  | { kind: "preview"; id: string }
  | { kind: "share"; id: string }
  | { kind: "play-shared"; data: string };

type AppView = "workbench" | "gallery" | "editor";

function parseRoute(): Route {
  const mainSearch = new URLSearchParams(window.location.search);
  let d = mainSearch.get("d");
  
  if (!d) {
    const s = mainSearch.get("s");
    if (s) {
      try {
        const localShortKeys = JSON.parse(localStorage.getItem("pet-memory-short-links") || "{}");
        d = localShortKeys[s] || null;
      } catch (e) {
        console.warn("Failed to load local short link", e);
      }
    }
  }

  if (d) {
    return { kind: "play-shared", data: d };
  }

  const hash = window.location.hash.replace(/^#/, "") || "/";
  const [path, query] = hash.split("?");
  const search = new URLSearchParams(query ?? "");
  let hashD = search.get("d");
  if (!hashD) {
    const hashS = search.get("s");
    if (hashS) {
      try {
        const localShortKeys = JSON.parse(localStorage.getItem("pet-memory-short-links") || "{}");
        hashD = localShortKeys[hashS] || null;
      } catch (e) {
        console.warn("Failed to load local short link from hash", e);
      }
    }
  }

  if (hashD) {
    return { kind: "play-shared", data: hashD };
  }

  if (path === "/preview" && search.get("id")) return { kind: "preview", id: search.get("id")! };
  if (path.startsWith("/share/")) return { kind: "share", id: path.slice("/share/".length) };
  return { kind: "home" };
}

function pushRoute(next: Route) {
  if (next.kind === "home") {
    if (window.location.search) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    window.location.hash = "/";
  }
  if (next.kind === "preview") window.location.hash = `/preview?id=${next.id}`;
  if (next.kind === "share") window.location.hash = `/share/${next.id}`;
  if (next.kind === "play-shared") window.location.hash = `/play?d=${next.data}`;
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

  // Global Share States
  const [shareStory, setShareStory] = useState<StoryDocument | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareLongUrl, setShareLongUrl] = useState("");
  const [shareShortUrl, setShareShortUrl] = useState("");
  const [shareShortLoading, setShareShortLoading] = useState(false);
  const [shareShortError, setShareShortError] = useState<string | null>(null);
  const [copyLongSuccess, setCopyLongSuccess] = useState(false);
  const [copyShortSuccess, setCopyShortSuccess] = useState(false);

  // Global Share Functions
  async function handleShare(story: StoryDocument) {
    setShareStory(story);
    setShareOpen(true);
    setShareShortLoading(true);
    setShareShortError(null);
    setShareShortUrl("");
    setShareLongUrl("");
    setCopyLongSuccess(false);
    setCopyShortSuccess(false);

    try {
      // 1. Generate Long Link Instantly (compression is super fast <10ms)
      const dataStr = await compressStory(story);
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      
      let localShort = "";
      if (isLocal) {
        try {
          const localShortKeys = JSON.parse(localStorage.getItem("pet-memory-short-links") || "{}");
          const key = Math.random().toString(36).slice(2, 7);
          localShortKeys[key] = dataStr;
          localStorage.setItem("pet-memory-short-links", JSON.stringify(localShortKeys));
          localShort = `${window.location.origin}${window.location.pathname}?s=${key}`;
        } catch (e) {
          console.warn("Failed to create local short link", e);
        }
      }

      const origin = window.location.origin + window.location.pathname;
      const longUrl = `${origin}?d=${dataStr}`;
      setShareLongUrl(longUrl);

      // 2. Fetch Short Link asynchronously in the background
      const publicOrigin = isLocal ? "https://pet-story-interactive.vercel.app" : origin;
      const longUrlForApi = isLocal 
        ? `https://pet-story-interactive.vercel.app/?d=${dataStr}`
        : longUrl;

      void shortenUrlApi(longUrlForApi)
        .then((shortUrl) => {
          setShareShortUrl(isLocal ? localShort : shortUrl);
          setShareShortLoading(false);
        })
        .catch((err) => {
          console.warn("is.gd shortener failed, using local short or keeping long", err);
          if (isLocal && localShort) {
            setShareShortUrl(localShort);
            setShareShortError("本地模拟短链就绪（公网短链生成失败）");
          } else {
            setShareShortError("获取短链接失败，请使用上方长链接。");
          }
          setShareShortLoading(false);
        });

    } catch (err) {
      console.error(err);
      setShareShortError("打包故事数据失败");
      setShareShortLoading(false);
    }
  }

  function handleCopyLink(url: string, type: "long" | "short") {
    if (!url) return;
    navigator.clipboard.writeText(url)
      .then(() => {
        if (type === "long") {
          setCopyLongSuccess(true);
          setTimeout(() => setCopyLongSuccess(false), 2000);
        } else {
          setCopyShortSuccess(true);
          setTimeout(() => setCopyShortSuccess(false), 2000);
        }
      })
      .catch(() => {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand("copy");
          if (type === "long") {
            setCopyLongSuccess(true);
            setTimeout(() => setCopyLongSuccess(false), 2000);
          } else {
            setCopyShortSuccess(true);
            setTimeout(() => setCopyShortSuccess(false), 2000);
          }
        } catch (e) {
          alert("复制失败，请手动选择复制。");
        }
        document.body.removeChild(textarea);
      });
  }

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
      if (view !== "gallery") setView("workbench");
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

  let content;

  // Preview / share routes
  if (route.kind !== "home") {
    if (route.kind === "play-shared") {
      content = (
        <PlaySharedScreen
          data={route.data}
          onBack={() => pushRoute({ kind: "home" })}
        />
      );
    } else {
      content = (
        <PreviewScreen
          route={route}
          onBack={() => pushRoute({ kind: "home" })}
          onGoToGallery={() => {
            setView("gallery");
            pushRoute({ kind: "home" });
          }}
          onEdit={(storyId) => {
            setActiveStoryId(storyId);
            setView("editor");
            pushRoute({ kind: "home" });
          }}
          onShare={handleShare}
        />
      );
    }
  } else if (view === "gallery") {
    content = (
      <>
        <div className="min-h-screen">
          <div className="sticky top-0 z-20 p-4 backdrop-blur-xl bg-background/80">
            <Button variant="outline" onClick={() => setView("workbench")}>返回工作台</Button>
          </div>
          <StoriesGallery
            stories={stories}
            onSelect={handleSelectStory}
            onPreview={(id) => pushRoute({ kind: "preview", id })}
            onShare={handleShare}
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
  } else if (view === "editor" && activeStory) {
    content = (
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
        onDone={() => setView("workbench")}
        onShare={handleShare}
        immersive
      />
    );
  } else {
    content = (
      <AppShell
        sidebar={
          <>
            <SidebarPanel hero>
              <h1 className="font-serif text-[clamp(28px,3vw,42px)] font-semibold leading-[1.08] tracking-tight">宠爱时光</h1>
              <p className="text-muted leading-relaxed text-sm">从点滴片段开始，慢慢整理成你们的宠爱时光。</p>
              <Button className="w-full" onClick={() => setTemplatePickerOpen(true)}>
                <PlusIcon className="h-4 w-4" />新建故事
              </Button>
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
                onPreview={(id) => pushRoute({ kind: "preview", id })}
                onShare={handleShare}
                onImport={handleImport}
                onOpenGallery={() => setView("gallery")}
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
            onBack={undefined}
            onChange={async (nextStory) => {
              const normalized = normalizeStory(nextStory);
              await saveStory(normalized);
              await refreshStories(normalized.id);
              setMessage(`已保存《${normalized.title}》`);
            }}
            onDelete={() => void handleDeleteStory(activeStory.id)}
            onPreview={() => pushRoute({ kind: "preview", id: activeStory.id })}
            onSharePreview={() => pushRoute({ kind: "share", id: activeStory.id })}
            onDone={() => setActiveStoryId("")}
            onShare={handleShare}
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

  return (
    <>
      {content}

      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-md bg-[#fffaf5] border border-primary/10 rounded-2xl p-5 shadow-2xl animate-fade-in outline-none">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg font-bold text-foreground flex items-center gap-1.5">
              <span>分享互动故事</span>
              <span className="text-xs font-normal text-muted-foreground">🐾 免登录分享</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              我们将您的故事数据安全压缩，提供“极速长链接”与“云端短链接”两种分享方式：
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3.5 my-3">
            {/* Long URL Section */}
            <div className="grid gap-1">
              <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider">
                长链接 (即时生成，包含完整故事数据)
              </span>
              <div className="flex items-center gap-2 p-2 px-3 rounded-xl bg-white border border-border/40 shadow-inner">
                <input
                  type="text"
                  readOnly
                  value={shareLongUrl}
                  placeholder="正在生成长链接..."
                  className="w-full text-xs bg-transparent border-none outline-none font-mono text-foreground/80 overflow-ellipsis"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={() => handleCopyLink(shareLongUrl, "long")}
                  disabled={!shareLongUrl}
                  className={cn(
                    "shrink-0 px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50",
                    copyLongSuccess 
                      ? "bg-emerald-500 text-white" 
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {copyLongSuccess ? "已复制 ✓" : "复制"}
                </button>
              </div>
            </div>

            {/* Short URL Section */}
            <div className="grid gap-1">
              <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider flex items-center justify-between">
                <span>短链接 (云端生成，适合微信或手机分享)</span>
                {shareShortLoading && (
                  <span className="text-[10px] text-primary/70 font-normal animate-pulse flex items-center gap-1">
                    <span className="animate-spin rounded-full h-2 w-2 border border-primary border-t-transparent inline-block"></span>
                    生成中...
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2 p-2 px-3 rounded-xl bg-white border border-border/40 shadow-inner">
                <input
                  type="text"
                  readOnly
                  value={shareShortLoading ? "正在向服务器请求极短链接，请稍候..." : shareShortUrl || "等待生成..."}
                  className={cn(
                    "w-full text-xs bg-transparent border-none outline-none font-mono overflow-ellipsis",
                    shareShortLoading ? "text-muted-foreground/60 italic" : "text-foreground/80"
                  )}
                  onClick={(e) => !shareShortLoading && shareShortUrl && (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={() => handleCopyLink(shareShortUrl, "short")}
                  disabled={shareShortLoading || !shareShortUrl}
                  className={cn(
                    "shrink-0 px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                    copyShortSuccess 
                      ? "bg-emerald-500 text-white" 
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {copyShortSuccess ? "已复制 ✓" : "复制"}
                </button>
              </div>
              {shareShortError && (
                <p className="text-[9px] text-amber-600 leading-normal bg-amber-50/78 p-1.5 px-2 rounded-lg border border-amber-500/10 mt-1 whitespace-pre-line">
                  {shareShortError}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="-mx-5 -mb-5 bg-[#4b3a2f]/5 px-5 py-3.5 border-t border-border/10 rounded-b-2xl">
            <p className="text-[10px] text-muted-foreground/50 self-center">提示：链接数据包含当前最新编辑版本</p>
            <button
              onClick={() => setShareOpen(false)}
              className="w-full sm:w-auto px-4 py-1.5 bg-white border border-border/20 text-[#4b3a2f] hover:bg-secondary/40 rounded-full text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              关闭
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Shared editor component for both inline and immersive modes. */
function StoryEditor({
  story,
  onBack,
  onChange,
  onDelete,
  onPreview,
  onSharePreview,
  onDone,
  onShare,
  immersive,
}: {
  story: StoryDocument;
  onBack?: () => void;
  onChange: (story: StoryDocument) => Promise<void>;
  onDelete: () => void;
  onPreview: () => void;
  onSharePreview: () => void;
  onDone: () => void;
  onShare: (story: StoryDocument) => void;
  immersive?: boolean;
}) {
  const { draft, step, setStep, items } = useStoryEditor(story, onChange, onPreview, onSharePreview, onDone, onShare);

  const headerBar = (
    <div className="flex justify-between items-center gap-4 p-3 rounded-[20px] bg-secondary/90 border border-primary/10 backdrop-blur-xl">
      <div className="flex items-center gap-3 min-w-0">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-foreground transition-colors"
            title="返回列表"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </button>
        )}
        <h2 className="font-serif text-lg font-semibold truncate">{draft.title || "未命名故事"}</h2>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreview}
          className="flex items-center gap-1.5 cursor-pointer font-semibold bg-white border border-border/20 text-[#4b3a2f] hover:bg-secondary/40"
        >
          <Eye className="h-3.5 w-3.5" />
          预览
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={() => onShare(draft)}
          className="flex items-center gap-1.5 cursor-pointer font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Share2 className="h-3.5 w-3.5" />
          分享
        </Button>
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
  );

  if (immersive) {
    return (
      <div className="min-h-screen">
        <div className="sticky top-0 z-20 p-3 px-5">
          {headerBar}
        </div>
        <div className="px-5 pb-8 max-w-3xl mx-auto">
          <PanelCard tone="default">
            <WizardTabs value={step} onValueChange={(value) => setStep(value as WizardStep)} items={items} />
          </PanelCard>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-[18px]">
      {headerBar}
      <PanelCard tone="default">
        <WizardTabs value={step} onValueChange={(value) => setStep(value as WizardStep)} items={items} />
      </PanelCard>
    </div>
  );
}

function PreviewScreen({
  route,
  onBack,
  onGoToGallery,
  onEdit,
  onShare,
}: {
  route: Extract<Route, { kind: "preview" | "share" }>;
  onBack: () => void;
  onGoToGallery: () => void;
  onEdit: (storyId: string) => void;
  onShare: (story: StoryDocument) => void;
}) {
  const [story, setStory] = useState<StoryDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [seekSceneId, setSeekSceneId] = useState<string | null>(null);

  const petProfile = useMemo(() => {
    if (!story?.petId) return null;
    return getPetById(story.petId);
  }, [story?.petId]);

  // Recommendations List
  const [allStories, setAllStories] = useState<StoryDocument[]>([]);

  useEffect(() => {
    void listStories().then((items) => {
      setAllStories(items);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    void getStory(route.id).then((item) => {
      setStory(item ?? null);
      setLoading(false);
    });
  }, [route.id]);

  const otherStories = allStories.filter((s) => s.id !== route.id);
  const templates = getTemplates();

  // Combine other stories and templates for recommendations
  const recommendedItems = useMemo(() => {
    const list = otherStories.map((s) => ({
      id: s.id,
      title: s.title,
      petName: s.petName,
      cover: s.cover,
      updatedAt: s.updatedAt,
      isTemplate: false,
    }));
    
    // Add templates if list is short (so it always looks rich)
    templates.forEach((t) => {
      if (list.length < 5) {
        list.push({
          id: t.id,
          title: t.name,
          petName: "精选模板",
          cover: t.story.cover,
          updatedAt: new Date().toISOString(),
          isTemplate: true,
        });
      }
    });
    return list;
  }, [otherStories, templates]);

  const hasMore = recommendedItems.length > 15;
  const displayedItems = useMemo(() => recommendedItems.slice(0, 15), [recommendedItems]);

  if (loading) {
    return (
      <div className="min-h-screen p-5 bg-[#f9f6f1]">
        <Button variant="outline" className="sticky top-[18px] z-20 mb-4" onClick={onBack}>
          返回工作台
        </Button>
        <PanelCard tone="soft" className="grid gap-3 p-[34px]">
          <p className="text-muted">正在加载…</p>
        </PanelCard>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen p-5 bg-[#f9f6f1]">
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
      <div className="relative w-screen h-svh bg-black">
        <StoryPlayer story={story} shareMode />
        <button
          onClick={onBack}
          aria-label="关闭"
          className="fixed top-4 left-4 z-50 w-9 h-9 rounded-full bg-black/40 text-white/50 flex items-center justify-center hover:bg-black/60 hover:text-white transition-colors backdrop-blur-sm"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f6f1] text-[#4b3a2f] pb-16">
      {/* Top Breadcrumb Header */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-4 flex items-center justify-between border-b border-border/10 bg-transparent">
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors mr-1"
          >
            <ArrowLeftIcon className="h-4 w-4" /> 返回工作台
          </button>
          
          <button
            onClick={() => onEdit(story.id)}
            className="inline-flex items-center gap-1 text-xs bg-[#4b3a2f]/5 text-[#4b3a2f] hover:bg-[#4b3a2f]/10 px-3 py-1.5 rounded-full font-medium transition-colors cursor-pointer"
          >
            <Pencil className="h-3 w-3" /> 编辑故事
          </button>

          <button
            onClick={() => onShare(story)}
            className="inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-full font-medium transition-colors cursor-pointer shadow-sm animate-fade-in"
          >
            <Share2 className="h-3 w-3" /> 分享故事
          </button>
        </div>
        <span className="text-xs text-muted-foreground/60 hidden sm:inline">当前预览中</span>
      </div>

      {/* Main Container */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-6 lg:grid lg:grid-cols-[1fr_360px] gap-6">
        
        {/* Left Column (Main Video Area) */}
        <div className="grid gap-3 content-start">
          {/* Title and Views */}
          <div className="grid gap-1.5">
            <h1 className="font-serif text-2xl font-bold leading-tight tracking-tight text-foreground">
              {story.title || "未命名故事"}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>修改时间：{new Date(story.updatedAt).toLocaleDateString("zh-CN")}</span>
              <span>•</span>
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                互动视频
              </span>
              {story.templateName && (
                <span className="bg-accent/15 text-accent-foreground px-2 py-0.5 rounded-full font-medium">
                  {story.templateName}
                </span>
              )}
            </div>
          </div>

          {/* Video Player Box */}
          <div
            className={cn(
              "transition-all duration-300 relative group overflow-hidden bg-black shadow-xl",
              isFullscreen
                ? "fixed inset-0 z-50 w-full h-full"
                : "w-full aspect-[16/10] rounded-2xl border border-border/40"
            )}
          >
            {/* Story Player */}
            <div className="w-full h-full absolute inset-0">
              <StoryPlayer
                story={story}
                onSceneChange={(sceneId, phase) => {
                  setActiveSceneId(phase === "playing" ? sceneId : null);
                  if (seekSceneId === sceneId) {
                    setSeekSceneId(null);
                  }
                }}
                seekSceneId={seekSceneId}
              />
            </div>

            {/* Screen Overlay Fullscreen Controls */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={cn(
                "absolute top-4 right-4 z-40 p-2 rounded-full bg-black/40 text-white/70 hover:bg-black/60 hover:text-white transition-all backdrop-blur-sm shadow-md",
                isFullscreen ? "block" : "opacity-0 group-hover:opacity-100 focus:opacity-100"
              )}
              title={isFullscreen ? "退出全屏" : "网页全屏"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
            
            {isFullscreen && (
              <span className="absolute top-4 left-4 z-40 text-xs font-serif font-semibold text-white/50 bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
                正在大屏模式观看🐾
              </span>
            )}
          </div>

          {/* Description Card */}
          <div className="p-4 rounded-xl bg-white/60 border border-border/10 grid gap-3 shadow-sm">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <span className="bg-primary/10 px-2 py-0.5 rounded-md">人设档案</span>
                <span className="text-foreground text-sm font-semibold">{story.petName}</span>
              </div>
              {petProfile && (
                <span className="text-[10px] text-muted-foreground/60 font-medium">
                  {petProfile.species === "cat" ? "猫咪" : petProfile.species === "dog" ? "狗狗" : "萌宠"}
                </span>
              )}
            </div>

            {/* Structured Pet Profile Details */}
            {petProfile && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs p-3 rounded-xl bg-[#4b3a2f]/5 border border-primary/5">
                <div>
                  <span className="text-muted-foreground">品种：</span>
                  <span className="font-semibold text-[#4b3a2f]/80">{petProfile.breed || "未知"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">性别：</span>
                  <span className="font-semibold text-[#4b3a2f]/80">
                    {petProfile.gender === "boy" ? "男生 ♂" : "女生 ♀"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">年龄：</span>
                  <span className="font-semibold text-[#4b3a2f]/80">{petProfile.ageText || "未知"}</span>
                </div>
                {petProfile.personality && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">性格特点：</span>
                    <span className="font-semibold text-[#4b3a2f]/80 italic">“{petProfile.personality}”</span>
                  </div>
                )}
              </div>
            )}

            {/* Story Summary */}
            {story.summary && (
              <div className="grid gap-1">
                <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">回忆寄语</span>
                <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {story.summary}
                </p>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground/60 leading-relaxed border-t border-border/10 pt-2.5">
              这是一部为您定制的专属互动记忆相册。在播放过程中，通过点击底部的决策分支，您可以为它决定不同的行为或跳转到不同的回忆场景中，享受高度自由的互动式叙事。
            </p>
          </div>

          {/* Story Flow Diagram */}
          <div className="grid gap-2 mt-1">
            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <span>故事走向与架构</span>
              <span className="text-[10px] text-muted-foreground/50 font-normal">(点击节点可快速跳转)</span>
            </h4>
            <FlowThumbnail
              story={story}
              activeSceneId={activeSceneId}
              onSceneClick={(sceneId) => {
                setSeekSceneId(sceneId);
              }}
            />
          </div>
        </div>

        {/* Right Column (Sidebar Recommendations) */}
        <div className="mt-8 lg:mt-0 grid gap-6 content-start">
          
          {/* Recommended List */}
          <div className="grid gap-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-muted-foreground">最近作品</h3>
            </div>

            <div className="grid gap-2.5">
              {displayedItems.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => {
                    if (rec.isTemplate) {
                      alert(`正在跳转创建新的故事：《${rec.title}》`);
                      onBack();
                    } else {
                      pushRoute({ kind: "preview", id: rec.id });
                    }
                  }}
                  className="flex gap-2.5 p-2 rounded-xl hover:bg-white border border-transparent hover:border-border/10 cursor-pointer transition-all group/item animate-fade-in"
                >
                  {/* Thumbnail */}
                  <div className="w-28 aspect-[16/10] rounded-lg overflow-hidden bg-secondary relative shrink-0">
                    <CoverImage media={rec.cover} />
                    {rec.isTemplate && (
                      <span className="absolute bottom-1 right-1 text-[9px] bg-accent text-accent-foreground px-1 py-0.2 rounded font-medium">
                        模板
                      </span>
                    )}
                  </div>

                  {/* Text details */}
                  <div className="grid gap-0.5 min-w-0 justify-between py-0.5">
                    <strong className="text-xs font-semibold text-foreground group-hover/item:text-primary transition-colors line-clamp-2 leading-tight">
                      {rec.title}
                    </strong>
                    <div className="grid gap-0.2">
                      <span className="text-[10px] text-muted-foreground truncate">{rec.petName}</span>
                      <span className="text-[9px] text-muted-foreground/60">
                        {rec.isTemplate ? "推荐使用" : new Date(rec.updatedAt).toLocaleDateString("zh-CN")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <button
                onClick={onGoToGallery}
                className="w-full flex items-center justify-center gap-1 py-2.5 rounded-xl border border-dashed border-border/30 hover:border-primary/30 hover:bg-white text-xs font-semibold text-muted-foreground hover:text-primary transition-all mt-1"
              >
                查看更多作品 ({recommendedItems.length} 个作品) →
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function PlaySharedScreen({
  data,
  onBack,
}: {
  data: string;
  onBack: () => void;
}) {
  const [story, setStory] = useState<StoryDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [seekSceneId, setSeekSceneId] = useState<string | null>(null);

  const petProfile = useMemo(() => {
    if (!story?.petId) return null;
    return getPetById(story.petId);
  }, [story?.petId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    decompressStory(data)
      .then((decoded) => {
        if (!active) return;
        setStory(decoded);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error(err);
        setError("无法加载分享的故事，链接可能不完整或已被截断。");
        setLoading(false);
      });
    return () => { active = false; };
  }, [data]);

  const templates = useMemo(() => getTemplates(), []);

  // Show templates as recommendations for the visitor to start their own story
  const recommendedItems = useMemo(() => {
    return templates.map((t) => ({
      id: t.id,
      title: t.name,
      petName: "精选模板",
      cover: t.story.cover,
      isTemplate: true,
    }));
  }, [templates]);

  if (loading) {
    return (
      <div className="w-screen h-svh bg-[#0e0c0a] flex flex-col items-center justify-center text-white/50 text-sm gap-3">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
        <span>正在读取分享的回忆相册...</span>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="w-screen h-svh bg-[#0e0c0a] flex flex-col items-center justify-center text-white text-center p-6 gap-4">
        <div className="text-4xl">🐾</div>
        <p className="text-sm text-white/60 max-w-xs leading-relaxed">{error || "加载故事失败"}</p>
        <button
          onClick={onBack}
          className="px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full text-xs font-semibold shadow-md transition-colors cursor-pointer"
        >
          返回工作台
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f6f1] text-[#4b3a2f] pb-16">
      {/* Top Header */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-4 flex items-center justify-between border-b border-border/10 bg-transparent">
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors mr-1"
          >
            <ArrowLeftIcon className="h-4 w-4" /> 返回工作台
          </button>
          
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-3.5 py-1.5 rounded-full font-bold transition-colors cursor-pointer shadow-sm animate-pulse"
          >
            🐾 我也要制作一个
          </button>
        </div>
        <span className="text-xs text-muted-foreground/60 hidden sm:inline">正在播放分享的故事</span>
      </div>

      {/* Main Container */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-6 lg:grid lg:grid-cols-[1fr_360px] gap-6">
        
        {/* Left Column (Main Video Area) */}
        <div className="grid gap-3 content-start">
          {/* Title and Info */}
          <div className="grid gap-1.5">
            <h1 className="font-serif text-2xl font-bold leading-tight tracking-tight text-foreground">
              {story.title || "未命名故事"}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>交互故事播放器</span>
              <span>•</span>
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                免登录直达
              </span>
              {story.templateName && (
                <span className="bg-accent/15 text-accent-foreground px-2 py-0.5 rounded-full font-medium">
                  基于「{story.templateName}」制作
                </span>
              )}
            </div>
          </div>

          {/* Video Player Box */}
          <div
            className={cn(
              "transition-all duration-300 relative group overflow-hidden bg-black shadow-xl",
              isFullscreen
                ? "fixed inset-0 z-50 w-full h-full"
                : "w-full aspect-[16/10] rounded-2xl border border-border/40"
            )}
          >
            <div className="w-full h-full absolute inset-0">
              <StoryPlayer
                story={story}
                shareMode
                onSceneChange={(sceneId, phase) => {
                  setActiveSceneId(phase === "playing" ? sceneId : null);
                  if (seekSceneId === sceneId) {
                    setSeekSceneId(null);
                  }
                }}
                seekSceneId={seekSceneId}
              />
            </div>

            {/* Scale controls */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={cn(
                "absolute top-4 right-4 z-40 p-2 rounded-full bg-black/40 text-white/70 hover:bg-black/60 hover:text-white transition-all backdrop-blur-sm shadow-md",
                isFullscreen ? "block" : "opacity-0 group-hover:opacity-100 focus:opacity-100"
              )}
              title={isFullscreen ? "退出全屏" : "网页全屏"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
            
            {isFullscreen && (
              <span className="absolute top-4 left-4 z-40 text-xs font-serif font-semibold text-white/50 bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
                正在大屏模式观看🐾
              </span>
            )}
          </div>

          {/* Description Card */}
          <div className="p-4 rounded-xl bg-white/60 border border-border/10 grid gap-3 shadow-sm">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <span className="bg-primary/10 px-2 py-0.5 rounded-md">主角人设档案</span>
                <span className="text-foreground text-sm font-semibold">{story.petName}</span>
              </div>
              {petProfile && (
                <span className="text-[10px] text-muted-foreground/60 font-medium">
                  {petProfile.species === "cat" ? "猫咪" : petProfile.species === "dog" ? "狗狗" : "萌宠"}
                </span>
              )}
            </div>

            {/* Profile Details */}
            {petProfile && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs p-3 rounded-xl bg-[#4b3a2f]/5 border border-primary/5">
                <div>
                  <span className="text-muted-foreground">品种：</span>
                  <span className="font-semibold text-[#4b3a2f]/80">{petProfile.breed || "未知"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">性别：</span>
                  <span className="font-semibold text-[#4b3a2f]/80">
                    {petProfile.gender === "boy" ? "男生 ♂" : "女生 ♀"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">年龄：</span>
                  <span className="font-semibold text-[#4b3a2f]/80">{petProfile.ageText || "未知"}</span>
                </div>
                {petProfile.personality && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">性格特点：</span>
                    <span className="font-semibold text-[#4b3a2f]/80 italic">“{petProfile.personality}”</span>
                  </div>
                )}
              </div>
            )}

            {/* Story Summary */}
            {story.summary && (
              <div className="grid gap-1">
                <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">回忆寄语</span>
                <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {story.summary}
                </p>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground/60 leading-relaxed border-t border-border/10 pt-2.5">
              提示：这是一个基于互动的电子回忆相册。在播放时，请通过视频中的选项来引导不同的走向，您也可以直接在下方图表中任意跳转片段。
            </p>
          </div>

          {/* Flow Diagram */}
          <div className="grid gap-2 mt-1">
            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <span>故事走向与架构</span>
              <span className="text-[10px] text-muted-foreground/50 font-normal">(点击节点可跳转)</span>
            </h4>
            <FlowThumbnail
              story={story}
              activeSceneId={activeSceneId}
              onSceneClick={(sceneId) => {
                setSeekSceneId(sceneId);
              }}
            />
          </div>
        </div>

        {/* Right Column (Side template recommendations) */}
        <div className="mt-8 lg:mt-0 grid gap-6 content-start">
          {/* Creator Guide Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#4b3a2f] to-[#3a2d24] text-white grid gap-3 shadow-xl">
            <h3 className="font-serif text-lg font-bold flex items-center gap-1.5">
              <span>你也想制作吗？</span>
              <span>🐾</span>
            </h3>
            <p className="text-xs text-white/80 leading-relaxed">
              这里是专为宠物定制的互动叙事工坊。你可以免费、免登录创建属于你自己宠物的分支互动小电影/相册！
            </p>
            <button
              onClick={onBack}
              className="w-full py-2 bg-white text-[#4b3a2f] hover:bg-white/90 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1"
            >
              一键开启免费创作 →
            </button>
          </div>

          {/* Templates Recommendations */}
          <div className="grid gap-3">
            <h3 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
              精选创作模板
            </h3>
            <div className="grid gap-2.5">
              {recommendedItems.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => {
                    alert(`正在带您跳转至工作台，并加载模板：《${rec.title}》`);
                    onBack();
                  }}
                  className="flex gap-2.5 p-2 rounded-xl hover:bg-white border border-transparent hover:border-border/10 cursor-pointer transition-all group/item"
                >
                  {/* Cover */}
                  <div className="w-28 aspect-[16/10] rounded-lg overflow-hidden bg-secondary relative shrink-0">
                    <CoverImage media={rec.cover} />
                    <span className="absolute bottom-1 right-1 text-[9px] bg-accent text-accent-foreground px-1 py-0.2 rounded font-medium">
                      使用模板
                    </span>
                  </div>

                  {/* Details */}
                  <div className="grid gap-0.5 min-w-0 justify-between py-0.5">
                    <strong className="text-xs font-semibold text-foreground group-hover/item:text-primary transition-colors line-clamp-2 leading-tight">
                      {rec.title}
                    </strong>
                    <div className="grid gap-0.2">
                      <span className="text-[10px] text-muted-foreground truncate">{rec.petName}</span>
                      <span className="text-[9px] text-primary font-medium hover:underline">
                        立即使用 →
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function CoverImage({ media }: { media?: StoryMedia }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    async function resolve() {
      if (!media) { setSrc(""); return; }
      if (media.type === "image") { setSrc(media.src); return; }

      const source = media.source ?? (media.mediaId ? "upload" : "url");
      if (source === "upload" && media.mediaId) {
        const blob = await getMediaBlob(media.mediaId).catch(() => undefined);
        if (!active) return;
        if (!blob) { setSrc(""); return; }
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        return;
      }
      setSrc(media.src);
    }

    void resolve();
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [media]);

  if (!src) return null;
  if (media?.type === "video") {
    return <video src={src} className="w-full h-full object-cover" muted autoPlay loop playsInline />;
  }
  return <img src={src} alt="" className="w-full h-full object-cover" />;
}
