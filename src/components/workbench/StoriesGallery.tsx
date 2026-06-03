import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import type { StoryDocument, StoryMedia } from "@/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getMediaBlob } from "@/lib/idb";
import { PlusIcon, UploadIcon, Trash2Icon, PlayIcon, PencilIcon, Share2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function StoriesGallery({
  stories,
  onSelect,
  onPreview,
  onShare,
  onCreateNew,
  onImport,
  onDelete,
}: {
  stories: StoryDocument[];
  onSelect: (storyId: string) => void;
  onPreview: (storyId: string) => void;
  onShare: (story: StoryDocument) => void;
  onCreateNew: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onDelete: (storyId: string) => void;
}) {
  return (
    <div className="min-h-screen p-6 md:p-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-[clamp(28px,3vw,42px)] font-semibold leading-[1.08] tracking-tight mb-2.5">宠爱时光</h1>
          <p className="text-muted text-sm">从点滴片段开始，慢慢整理成你们的宠爱时光。</p>
        </div>
        <div className="flex items-center gap-2">
          <label className={cn(buttonVariants({ variant: "outline", size: "sm" }), "cursor-pointer")}>
            <UploadIcon className="h-4 w-4" />
            导入
            <input type="file" accept=".json,application/json" onChange={onImport} className="hidden" />
          </label>
          <Button size="sm" onClick={onCreateNew}>
            <PlusIcon className="h-4 w-4" />
            新建故事
          </Button>
        </div>
      </div>

      {stories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted text-lg mb-6">还没有作品，开始记录第一份宠爱时光吧。</p>
          <Button onClick={onCreateNew}><PlusIcon className="h-4 w-4" />新建故事</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              onEdit={() => onSelect(story.id)}
              onPreview={() => onPreview(story.id)}
              onShare={() => onShare(story)}
              onDelete={() => onDelete(story.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StoryCard({ story, onEdit, onPreview, onShare, onDelete }: { story: StoryDocument; onEdit: () => void; onPreview: () => void; onShare: () => void; onDelete: () => void }) {
  return (
    <div
      onClick={onPreview}
      className="group cursor-pointer relative rounded-2xl border border-border/50 bg-card shadow-[0_14px_30px_rgba(116,86,62,0.08)] overflow-hidden hover:shadow-[0_18px_50px_rgba(104,75,54,0.14)] transition-all"
    >
      <div className="aspect-[16/10] overflow-hidden bg-gradient-to-b from-[#f2e4d5] to-[#e6d7cb] relative">
        <CoverImage media={story.cover} />
        
        {/* Hover glassmorphic overlay with prominent buttons */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onPreview();
              }}
              className="bg-primary hover:bg-primary/90 text-white font-medium flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <PlayIcon className="h-3.5 w-3.5 fill-current" />
              播放
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
              className="bg-white/95 hover:bg-white text-[#4b3a2f] font-medium flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5" />
              分享
            </Button>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="w-[calc(100%-2.5rem)] bg-white/90 hover:bg-white text-foreground font-medium flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
          >
            <PencilIcon className="h-3.5 w-3.5" />
            编辑故事
          </Button>
        </div>

        {/* Delete button (remains in the top-right corner on hover) */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <button
                  type="button"
                  className="p-1.5 rounded-lg bg-black/30 text-white/70 hover:bg-red-500 hover:text-white transition-colors backdrop-blur-sm"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  title="删除"
                >
                  <Trash2Icon className="h-3.5 w-3.5" />
                </button>
              }
            />
            <AlertDialogContent onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>移走「{story.title || "未命名故事"}」？</AlertDialogTitle>
                <AlertDialogDescription>这会删除本地存档，已经导出的文件不会受影响。</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>先保留</AlertDialogCancel>
                <AlertDialogAction onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDelete(); }}>确认删除</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="p-4 grid gap-1.5">
        <strong className="text-foreground truncate">{story.title || "未命名故事"}</strong>
        <div className="flex items-center justify-between">
          <span className="text-muted text-sm">{story.petName || "未命名"}</span>
          <span className="text-muted-foreground text-xs">{new Date(story.updatedAt).toLocaleDateString("zh-CN")}</span>
        </div>
        {story.summary ? <p className="text-muted-foreground text-xs line-clamp-2">{story.summary}</p> : null}
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
