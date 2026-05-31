import type { StoryDocument, StoryScene } from "../../types";
import { getLinearNextSceneId, getVisibleSceneIds } from "../../lib/player";
import type { SelectOption } from "../ui/SelectField";
import { Button } from "../ui/Button";
import { PanelCard } from "../ui/PanelCard";
import { ScrollPanel } from "../ui/ScrollPanel";
import { SelectField } from "../ui/SelectField";

export function GraphView({
  story,
  sceneOptions,
  onSceneChange,
  onMoveScene,
  onRemoveScene,
}: {
  story: StoryDocument;
  sceneOptions: SelectOption[];
  onSceneChange: (sceneId: string, updater: (scene: StoryScene) => StoryScene) => void;
  onMoveScene: (sceneId: string, direction: -1 | 1) => void;
  onRemoveScene: (sceneId: string) => void;
}) {
  const previewPath = getVisibleSceneIds(story, {});

  return (
    <div className="graph-panel">
      <PanelCard className="graph-summary" tone="soft">
        <strong>当前主线预览</strong>
        <p>{previewPath.map((id) => story.scenes.find((scene) => scene.id === id)?.title || "未命名").join(" → ")}</p>
      </PanelCard>
      <ScrollPanel className="graph-scroll">
        <div className="graph-grid">
          {story.scenes.map((scene, index) => (
            <PanelCard key={scene.id} className={`graph-node ${story.startSceneId === scene.id ? "start" : ""}`} tone="default">
              <div className="graph-node-head">
                <div>
                  <strong>{scene.title || `节点 ${index + 1}`}</strong>
                  <span>{scene.ending ? "结尾节点" : scene.background || "普通片段"}</span>
                </div>
                <small>{scene.choices.length ? `${scene.choices.length} 条连向` : "线性继续"}</small>
              </div>
              <p className="graph-snippet">{scene.text || "这里还没有片段文案。"}</p>
              <div className="graph-actions">
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
              <div className="graph-links">
                {scene.choices.length ? (
                  scene.choices.map((choice) => (
                    <div key={choice.id} className="graph-link-row">
                      <strong>{choice.label}</strong>
                      <span>从「{scene.title || "当前节点"}」走向</span>
                      <SelectField
                        value={choice.nextSceneId}
                        options={sceneOptions}
                        onValueChange={(value) =>
                          onSceneChange(scene.id, (current) => ({
                            ...current,
                            choices: current.choices.map((item) =>
                              item.id === choice.id ? { ...item, nextSceneId: value } : item,
                            ),
                          }))
                        }
                      />
                    </div>
                  ))
                ) : (
                  <p className="helper-text">
                    没有显式分支时，默认会继续到
                    <strong>{getLinearNextSceneId(story, scene.id) ? "下一段" : "结尾"}</strong>。
                  </p>
                )}
              </div>
            </PanelCard>
          ))}
        </div>
      </ScrollPanel>
    </div>
  );
}
