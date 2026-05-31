import type { StoryScene } from "../../types";
import { Button } from "../ui/Button";
import { PanelCard } from "../ui/PanelCard";
import { MediaField } from "./MediaField";

export function ScenesStep({
  scenes,
  onBack,
  onNext,
  onAddScene,
  onUpdateScene,
  onMoveScene,
  onRemoveScene,
}: {
  scenes: StoryScene[];
  onBack: () => void;
  onNext: () => void;
  onAddScene: () => void;
  onUpdateScene: (sceneId: string, updater: (scene: StoryScene) => StoryScene) => void;
  onMoveScene: (sceneId: string, direction: -1 | 1) => void;
  onRemoveScene: (sceneId: string) => void;
}) {
  return (
    <section className="step-panel">
      <div className="section-head">
        <h2>3. 回忆片段</h2>
        <div className="inline-actions">
          <Button onClick={onBack}>上一步</Button>
          <Button onClick={onAddScene}>添加片段</Button>
          <Button variant="primary" onClick={onNext}>
            下一步
          </Button>
        </div>
      </div>
      <p className="helper-text">先按顺序把片段填进去。这里默认就是一条线性的回忆流，不需要现在就想复杂分支。</p>
      <div className="scene-stack">
        {scenes.map((scene, index) => (
          <PanelCard key={scene.id} as="article" className="scene-card">
            <div className="scene-card-head">
              <div>
                <div className="eyebrow">片段 {index + 1}</div>
                <strong>{scene.title || "未命名片段"}</strong>
              </div>
              <div className="inline-actions">
                <Button size="sm" onClick={() => onMoveScene(scene.id, -1)}>
                  上移
                </Button>
                <Button size="sm" onClick={() => onMoveScene(scene.id, 1)}>
                  下移
                </Button>
                <Button size="sm" variant="danger" onClick={() => onRemoveScene(scene.id)}>
                  删除
                </Button>
              </div>
            </div>
            <div className="scene-grid">
              <label>
                标题
                <input
                  value={scene.title}
                  onChange={(event) => onUpdateScene(scene.id, (current) => ({ ...current, title: event.target.value }))}
                />
              </label>
              <label>
                场景氛围
                <input
                  value={scene.background ?? ""}
                  onChange={(event) =>
                    onUpdateScene(scene.id, (current) => ({
                      ...current,
                      background: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <label>
              文案
              <textarea
                value={scene.text}
                onChange={(event) => onUpdateScene(scene.id, (current) => ({ ...current, text: event.target.value }))}
              />
            </label>
            <MediaField
              label="片段媒体"
              media={scene.media}
              onChange={(media) => onUpdateScene(scene.id, (current) => ({ ...current, media }))}
              hint="这里先把画面和文字对齐，分支等下一步再处理。"
            />
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={!!scene.ending}
                onChange={(event) =>
                  onUpdateScene(scene.id, (current) => ({
                    ...current,
                    ending: event.target.checked,
                  }))
                }
              />
              这个片段作为结尾
            </label>
          </PanelCard>
        ))}
      </div>
    </section>
  );
}
