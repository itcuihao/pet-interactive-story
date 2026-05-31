import type { ChangeEvent } from "react";
import type { StoryDocument } from "@/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export function RecentStoriesList({ busy, stories, activeStoryId, onSelect, onImport, onOpenGallery }: { busy: boolean; stories: StoryDocument[]; activeStoryId?: string; onSelect: (storyId: string) => void; onImport: (event: ChangeEvent<HTMLInputElement>) => void; onOpenGallery: () => void }) {
  return (
    <>
      <div className="flex justify-between items-start gap-4">
        <h2 className="font-serif text-2xl font-semibold leading-tight">最近作品</h2>
        <label className={cn(buttonVariants({ variant: "outline", size: "sm" }), "cursor-pointer")}>
          导入
          <input type="file" accept=".json,application/json" onChange={onImport} className="hidden" />
        </label>
      </div>
      {busy ? (
        <p className="text-muted text-sm">正在读取本地作品…</p>
      ) : stories.length ? (
        <>
          <ScrollArea className="h-[min(280px,38vh)]">
            <div className="grid gap-2.5 pr-1.5">
              {stories.slice(0, 8).map((story) => (
                <button
                  key={story.id}
                  className={`text-left rounded-xl border p-3 grid gap-0.5 transition-colors ${story.id === activeStoryId ? "border-primary/34 bg-gradient-to-b from-white/98 to-orange-50/96" : "border-transparent bg-white/88 hover:border-primary/24"}`}
                  onClick={() => onSelect(story.id)}
                >
                  <strong className="text-foreground text-sm">{story.title}</strong>
                  <span className="text-muted text-xs">{story.petName}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
          <button
            type="button"
            onClick={onOpenGallery}
            className="w-full text-center text-sm text-accent-foreground hover:text-foreground py-2 rounded-xl hover:bg-primary/8 transition-colors"
          >
            查看全部作品 ({stories.length})
          </button>
        </>
      ) : (
        <p className="text-muted text-sm leading-relaxed">还没有本地作品。先从一个模板开始，会比一口气想完整流程稳得多。</p>
      )}
    </>
  );
}
