import type { ChangeEvent } from "react";
import type { StoryDocument } from "@/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Grid3X3Icon, PlayIcon, Share2 } from "lucide-react";

export function RecentStoriesList({
  busy,
  stories,
  activeStoryId,
  onSelect,
  onPreview,
  onShare,
  onImport,
  onOpenGallery,
}: {
  busy: boolean;
  stories: StoryDocument[];
  activeStoryId?: string;
  onSelect: (storyId: string) => void;
  onPreview: (storyId: string) => void;
  onShare: (story: StoryDocument) => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpenGallery: () => void;
}) {
  return (
    <>
      <div className="flex justify-between items-start gap-4">
        <h2 className="font-serif text-2xl font-semibold leading-tight">最近作品</h2>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={onOpenGallery} title="我的作品">
            <Grid3X3Icon className="h-4 w-4" />
          </Button>
          <label className={cn(buttonVariants({ variant: "outline", size: "sm" }), "cursor-pointer")}>
            导入
            <input type="file" accept=".json,application/json" onChange={onImport} className="hidden" />
          </label>
        </div>
      </div>
      {busy ? (
        <p className="text-muted text-sm">正在读取本地作品…</p>
      ) : stories.length ? (
        <ScrollArea className="h-[min(320px,44vh)]">
          <div className="grid gap-2.5 pr-1.5">
            {stories.map((story) => (
              <div
                key={story.id}
                className={cn(
                  "group flex items-center justify-between rounded-xl border p-3 gap-2 transition-colors",
                  story.id === activeStoryId
                    ? "border-primary/34 bg-gradient-to-b from-white/98 to-orange-50/96"
                    : "border-transparent bg-white/88 hover:border-primary/24 hover:bg-white"
                )}
              >
                <button
                  type="button"
                  className="flex-1 text-left grid gap-0.5 min-w-0"
                  onClick={() => onSelect(story.id)}
                  title="编辑设计"
                >
                  <strong className="text-foreground text-sm truncate">{story.title || "未命名故事"}</strong>
                  <span className="text-muted text-xs">{story.petName}</span>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 opacity-60 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShare(story);
                    }}
                    title="分享故事"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 opacity-60 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreview(story.id);
                    }}
                    title="播放预览"
                  >
                    <PlayIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <p className="text-muted text-sm leading-relaxed">还没有本地作品。先从一个模板开始，会比一口气想完整流程稳得多。</p>
      )}
    </>
  );
}
