import type { StoryChoice, StoryDocument, StoryScene } from "../../types";
import { getLinearNextSceneId } from "../../lib/player";
import type { SelectOption } from "../ui/SelectField";
import { Button } from "../ui/Button";
import { CollapsibleSection } from "../ui/CollapsibleSection";
import { SelectField } from "../ui/SelectField";
import { GraphView } from "./GraphView";

export function BranchesStep({
  story,
  sceneOptions,
  showAdvancedGraph,
  onToggleAdvancedGraph,
  onBack,
  onNext,
  onSceneChange,
  onMoveScene,
  onRemoveScene,
}: {
  story: StoryDocument;
  sceneOptions: SelectOption[];
  showAdvancedGraph: boolean;
  onToggleAdvancedGraph: () => void;
  onBack: () => void;
  onNext: () => void;
  onSceneChange: (sceneId: string, updater: (scene: StoryScene) => StoryScene) => void;
  onMoveScene: (sceneId: string, direction: -1 | 1) => void;
  onRemoveScene: (sceneId: string) => void;
}) {
  return (
    <section className="step-panel">
      <div className="section-head">
        <h2>4. 互动分支</h2>
        <div className="inline-actions">
          <Button onClick={onBack}>上一步</Button>
          <Button variant="primary" onClick={onNext}>
            下一步
          </Button>
        </div>
      </div>
      <p className="helper-text">这里的分支只负责“接下来先展开哪一段”。先让故事顺起来，再来补这一层，才不会越做越乱。</p>
      <div className="branch-list">
        {story.scenes.map((scene) => (
          <BranchCard key={scene.id} story={story} scene={scene} sceneOptions={sceneOptions} onSceneChange={onSceneChange} />
        ))}
      </div>
      <div className="advanced-switch">
        <div>
          <strong>需要细看关系时，再进入高级流程视图。</strong>
          <p className="helper-text">普通用户停在上面的分支卡片就够用了，流程视图只用来检查连向是否清楚。</p>
        </div>
        <Button variant={showAdvancedGraph ? "primary" : "ghost"} onClick={onToggleAdvancedGraph}>
          {showAdvancedGraph ? "收起高级流程视图" : "进入高级流程视图"}
        </Button>
      </div>
      {showAdvancedGraph ? (
        <GraphView
          story={story}
          sceneOptions={sceneOptions}
          onSceneChange={onSceneChange}
          onMoveScene={onMoveScene}
          onRemoveScene={onRemoveScene}
        />
      ) : null}
    </section>
  );
}

function BranchCard({
  story,
  scene,
  sceneOptions,
  onSceneChange,
}: {
  story: StoryDocument;
  scene: StoryScene;
  sceneOptions: SelectOption[];
  onSceneChange: (sceneId: string, updater: (scene: StoryScene) => StoryScene) => void;
}) {
  const linearNext = getLinearNextSceneId(story, scene.id);

  function patchChoices(nextChoices: StoryChoice[]) {
    onSceneChange(scene.id, (current) => ({
      ...current,
      layout: nextChoices.length ? "choice-gate" : "moment",
      choices: nextChoices.slice(0, 2),
    }));
  }

  return (
    <CollapsibleSection
      title={scene.title || "未命名片段"}
      description={scene.background || "没有场景氛围描述"}
      defaultOpen={scene.choices.length > 0}
      summary={scene.choices.length ? `${scene.choices.length} 个选择` : "线性继续"}
    >
      <div className="branch-card-body">
        <p className="helper-text">
          这个片段{scene.choices.length ? "会停下来让用户选择后续" : "目前会按顺序继续到下一段"}。
        </p>
        <div className="section-head compact">
          <h3>选择按钮</h3>
          {scene.choices.length < 2 ? (
            <Button
              onClick={() =>
                patchChoices([
                  ...scene.choices,
                  {
                    id: crypto.randomUUID(),
                    label: "继续看",
                    coverText: "",
                    nextSceneId: linearNext ?? story.scenes[0]?.id ?? scene.id,
                  },
                ])
              }
            >
              添加选择
            </Button>
          ) : null}
        </div>
        {scene.choices.length ? (
          scene.choices.map((choice) => (
            <div key={choice.id} className="branch-choice-row">
              <input
                value={choice.label}
                placeholder="按钮文案"
                onChange={(event) =>
                  patchChoices(
                    scene.choices.map((current) =>
                      current.id === choice.id ? { ...current, label: event.target.value } : current,
                    ),
                  )
                }
              />
              <input
                value={choice.coverText ?? ""}
                placeholder="按钮下的小提示（可选）"
                onChange={(event) =>
                  patchChoices(
                    scene.choices.map((current) =>
                      current.id === choice.id ? { ...current, coverText: event.target.value } : current,
                    ),
                  )
                }
              />
              <SelectField
                value={choice.nextSceneId}
                options={sceneOptions}
                onValueChange={(value) =>
                  patchChoices(
                    scene.choices.map((current) =>
                      current.id === choice.id ? { ...current, nextSceneId: value } : current,
                    ),
                  )
                }
              />
              <Button
                size="sm"
                variant="danger"
                onClick={() => patchChoices(scene.choices.filter((current) => current.id !== choice.id))}
              >
                删除
              </Button>
            </div>
          ))
        ) : (
          <p className="helper-text">
            暂时不加分支也没关系，当前会继续到
            <strong>{linearNext ? `「${story.scenes.find((item) => item.id === linearNext)?.title || "下一段"}」` : "故事结尾"}</strong>。
          </p>
        )}
      </div>
    </CollapsibleSection>
  );
}
