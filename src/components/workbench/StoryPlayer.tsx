import { useEffect, useMemo, useState } from "react";
import { getChoiceById, getLastBranchScene, getVisibleSceneIds, type StoryDecisionMap } from "../../lib/player";
import type { StoryDocument, StoryScene } from "../../types";
import { Button } from "../ui/Button";
import { MediaFrame } from "../ui/MediaFrame";
import { PanelCard } from "../ui/PanelCard";

export function StoryPlayer({ story, shareMode }: { story: StoryDocument; shareMode?: boolean }) {
  const [decisions, setDecisions] = useState<StoryDecisionMap>({});

  useEffect(() => {
    setDecisions({});
  }, [story.id, story.updatedAt]);

  const visibleIds = useMemo(() => getVisibleSceneIds(story, decisions), [story, decisions]);
  const visibleScenes = visibleIds
    .map((sceneId) => story.scenes.find((scene) => scene.id === sceneId))
    .filter(Boolean) as StoryScene[];
  const branchScene = getLastBranchScene(story, decisions);

  function choose(sceneId: string, choiceId: string) {
    setDecisions((current) => ({ ...current, [sceneId]: choiceId }));
  }

  function retryBranch() {
    if (!branchScene) return;
    setDecisions((current) => {
      const next = { ...current };
      delete next[branchScene.id];
      return next;
    });
  }

  return (
    <div className="player-shell">
      <PanelCard className="player-hero" tone="highlight">
        <MediaFrame media={story.cover} emptyText="这里会显示故事封面" variant="cover" />
        <div className="eyebrow">{shareMode ? "单页分享预览" : "工作台预览"}</div>
        <h1>{story.title}</h1>
        <p className="lede">{story.petName} · {story.summary || "把一起度过的日常，慢慢收进一段温柔回忆。"}</p>
      </PanelCard>

      <div className="story-flow">
        {visibleScenes.map((scene) => {
          const selectedChoice = getChoiceById(scene, decisions[scene.id]);
          return (
            <PanelCard key={scene.id} className={`player-card ${scene.layout === "choice-gate" ? "choice-gate" : ""}`}>
              <MediaFrame media={scene.media} emptyText="这一段还没有放媒体，先把回忆写下来也很好。" variant="preview" />
              <div className="player-body">
                <div className="eyebrow">{scene.background || "温柔片段"}</div>
                <h2>{scene.title}</h2>
                <p>{scene.text}</p>
                {scene.choices.length ? (
                  <div className="choice-stack">
                    {scene.choices.map((choice) => {
                      const active = selectedChoice?.id === choice.id;
                      return (
                        <button key={choice.id} className={active ? "selected-choice" : ""} onClick={() => choose(scene.id, choice.id)}>
                          <strong>{choice.label}</strong>
                          <span>{choice.coverText || "从这里继续往下看。"}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </PanelCard>
          );
        })}
      </div>

      <div className="player-footer-actions">
        <Button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>重新看这一页</Button>
        <Button onClick={() => setDecisions({})}>回到开头</Button>
        {branchScene && decisions[branchScene.id] ? (
          <Button variant="primary" onClick={retryBranch}>
            试试另一条分支
          </Button>
        ) : null}
      </div>
    </div>
  );
}
