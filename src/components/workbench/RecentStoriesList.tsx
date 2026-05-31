import type { ChangeEvent } from "react";
import type { StoryDocument } from "../../types";
import { Button } from "../ui/Button";
import { ScrollPanel } from "../ui/ScrollPanel";

export function RecentStoriesList({
  busy,
  stories,
  activeStoryId,
  onSelect,
  onImport,
}: {
  busy: boolean;
  stories: StoryDocument[];
  activeStoryId?: string;
  onSelect: (storyId: string) => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <>
      <div className="section-head">
        <h2>最近作品</h2>
        <label className="ui-button ui-button--ghost file-btn">
          导入 JSON
          <input type="file" accept=".json,application/json" onChange={onImport} />
        </label>
      </div>
      {busy ? (
        <p className="empty-text">正在读取本地作品…</p>
      ) : stories.length ? (
        <ScrollPanel className="recent-scroll">
          <div className="recent-list">
            {stories.map((story) => (
              <button
                key={story.id}
                className={`recent-item ${story.id === activeStoryId ? "selected" : ""}`}
                onClick={() => onSelect(story.id)}
              >
                <strong>{story.title}</strong>
                <span>{story.petName}</span>
                <small>{new Date(story.updatedAt).toLocaleString("zh-CN")}</small>
              </button>
            ))}
          </div>
        </ScrollPanel>
      ) : (
        <p className="empty-text">还没有本地作品。先从一个模板开始，会比一口气想完整流程稳得多。</p>
      )}
    </>
  );
}
