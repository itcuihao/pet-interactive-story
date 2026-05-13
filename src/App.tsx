import { useEffect, useMemo, useState } from "react";
import {
  createBlankStory,
  createScene,
  createStoryFromTemplate,
  getTemplates,
  normalizeStory,
} from "./lib/story";
import { deleteStory, getStory, listStories, saveStory } from "./lib/idb";
import { downloadStoryAsHtml, downloadStoryAsJson, importStoryFromJson } from "./lib/export";
import {
  getChoiceById,
  getLastBranchScene,
  getLinearNextSceneId,
  getVisibleSceneIds,
  type StoryDecisionMap,
} from "./lib/player";
import type { StoryChoice, StoryDocument, StoryMedia, StoryScene } from "./types";

type Route =
  | { kind: "home" }
  | { kind: "preview"; id: string }
  | { kind: "share"; id: string };

type WizardStep = 0 | 1 | 2 | 3 | 4;

const STEP_LABELS: Array<{ id: WizardStep; label: string; hint: string }> = [
  { id: 0, label: "选择模板", hint: "确认这份故事从哪里开始" },
  { id: 1, label: "故事信息", hint: "写下名字、标题和封面" },
  { id: 2, label: "回忆片段", hint: "按顺序把日常片段放进去" },
  { id: 3, label: "互动分支", hint: "最后再轻轻补上选择" },
  { id: 4, label: "预览导出", hint: "检查并生成分享页" },
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
  const [activeStoryId, setActiveStoryId] = useState<string>("");
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("从一个温柔模板开始。");
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
    () => stories.find((story) => story.id === activeStoryId) ?? stories[0],
    [stories, activeStoryId],
  );

  useEffect(() => {
    if (!activeStory && stories.length) {
      setActiveStoryId(stories[0].id);
    }
  }, [stories, activeStory]);

  async function refreshStories(nextActiveId?: string) {
    setBusy(true);
    const items = await listStories();
    setStories(items);
    setActiveStoryId(nextActiveId ?? items[0]?.id ?? "");
    setBusy(false);
  }

  async function handleCreateFromTemplate(templateId: string) {
    const story = normalizeStory(createStoryFromTemplate(templateId));
    await saveStory(story);
    await refreshStories(story.id);
    setMessage(`已从「${story.templateName || "模板"}」开始记录。`);
  }

  async function handleCreateBlank() {
    const story = normalizeStory(createBlankStory());
    await saveStory(story);
    await refreshStories(story.id);
    setMessage("已新建空白故事。");
  }

  async function handleDeleteStory(storyId: string) {
    await deleteStory(storyId);
    await refreshStories();
    setMessage("这份本地作品已经移走。");
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

  if (route.kind !== "home") {
    return <PreviewScreen route={route} onBack={() => pushRoute({ kind: "home" })} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-block hero-block">
          <div className="eyebrow">开始记录</div>
          <h1>把和宠物一起度过的片段，轻轻留下来。</h1>
          <p className="lede">从一个温柔模板开始，慢慢整理成可以分享的互动故事。</p>
        </div>

        <div className="sidebar-block">
          <div className="section-head">
            <h2>开始记录</h2>
            <button className="ghost-btn" onClick={handleCreateBlank}>
              新建空白故事
            </button>
          </div>
          <div className="template-list">
            {templates.map((template) => (
              <button
                key={template.id}
                className={`template-card accent-${template.accent}`}
                onClick={() => void handleCreateFromTemplate(template.id)}
              >
                <strong>{template.name}</strong>
                <span>{template.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-block">
          <div className="section-head">
            <h2>最近作品</h2>
            <label className="ghost-btn file-btn">
              导入 JSON
              <input type="file" accept=".json,application/json" onChange={handleImport} />
            </label>
          </div>
          {busy ? (
            <p className="empty-text">正在读取本地作品…</p>
          ) : stories.length ? (
            <div className="recent-list">
              {stories.map((story) => (
                <button
                  key={story.id}
                  className={`recent-item ${story.id === activeStory?.id ? "selected" : ""}`}
                  onClick={() => setActiveStoryId(story.id)}
                >
                  <strong>{story.title}</strong>
                  <span>{story.petName}</span>
                  <small>{new Date(story.updatedAt).toLocaleString("zh-CN")}</small>
                </button>
              ))}
            </div>
          ) : (
            <p className="empty-text">还没有本地作品。先从一个模板开始，会比一口气想完整流程稳得多。</p>
          )}
        </div>
      </aside>

      <main className="workspace">
        <div className="workspace-banner">
          <div className="eyebrow">温柔整理中</div>
          <strong>{message}</strong>
        </div>

        {activeStory ? (
          <StoryEditor
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
          <div className="empty-state">
            <h2>先选一个模板，再慢慢把今天放进去。</h2>
            <p>别急着先想复杂分支。先把片段写下来，后面的互动自然就会清楚。</p>
          </div>
        )}
      </main>
    </div>
  );
}

function StoryEditor({
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
  const [step, setStep] = useState<WizardStep>(0);
  const [showAdvancedGraph, setShowAdvancedGraph] = useState(story.mode === "graph");
  const templates = useMemo(() => getTemplates(), []);

  useEffect(() => {
    setDraft(story);
    setShowAdvancedGraph(story.mode === "graph");
  }, [story]);

  async function update(next: StoryDocument) {
    setDraft(next);
    await onChange(next);
  }

  function patchStory(patch: Partial<StoryDocument>) {
    void update({
      ...draft,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
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
    void update({
      ...draft,
      scenes: [...draft.scenes, scene],
      updatedAt: new Date().toISOString(),
    });
  }

  function removeScene(sceneId: string) {
    if (draft.scenes.length <= 1) return;
    const scenes = draft.scenes.filter((scene) => scene.id !== sceneId);
    const nextSceneId = draft.startSceneId === sceneId ? scenes[0].id : draft.startSceneId;
    const repairedScenes = scenes.map((scene) => ({
      ...scene,
      choices: scene.choices.filter((choice) => choice.nextSceneId !== sceneId),
    }));

    void update({
      ...draft,
      scenes: repairedScenes,
      startSceneId: nextSceneId,
      updatedAt: new Date().toISOString(),
    });
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

  function goPrevStep() {
    setStep((current) => (current > 0 ? ((current - 1) as WizardStep) : current));
  }

  function goNextStep() {
    setStep((current) => (current < 4 ? ((current + 1) as WizardStep) : current));
  }

  const currentTemplate = templates.find((template) => template.id === draft.templateId);

  return (
    <div className="editor-shell">
      <section className="editor-card wizard-card">
        <div className="section-head">
          <div>
            <div className="eyebrow">步骤向导</div>
            <h2>先顺着步骤整理，再决定要不要细调流程图。</h2>
          </div>
          <button className="danger-btn" onClick={onDelete}>
            删除作品
          </button>
        </div>
        <div className="step-strip">
          {STEP_LABELS.map((item) => (
            <button
              key={item.id}
              className={`step-pill ${step === item.id ? "active" : ""}`}
              onClick={() => setStep(item.id)}
            >
              <span>{item.id + 1}</span>
              <strong>{item.label}</strong>
              <small>{item.hint}</small>
            </button>
          ))}
        </div>
      </section>

      <section className={`editor-card wizard-panel ${step === 0 ? "active" : ""}`}>
        <div className="section-head">
          <h2>1. 选择模板</h2>
          <button className="primary-btn" onClick={goNextStep}>
            下一步
          </button>
        </div>
        <p className="helper-text">
          这一步不用重新选模板。先确认这份故事是从哪种日常情绪开始的，后面才更容易往里放片段。
        </p>
        <div className="template-current">
          <strong>{draft.templateName || "空白故事"}</strong>
          <p>{currentTemplate?.description || "这份故事没有预设模板，你可以按自己的节奏慢慢写。"}</p>
        </div>
        <div className="template-mini-grid">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`template-mini accent-${template.accent} ${
                draft.templateId === template.id ? "selected" : ""
              }`}
            >
              <strong>{template.name}</strong>
              <span>{template.description}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={`editor-card wizard-panel ${step === 1 ? "active" : ""}`}>
        <div className="section-head">
          <h2>2. 故事信息</h2>
          <div className="inline-actions">
            <button onClick={goPrevStep}>上一步</button>
            <button className="primary-btn" onClick={goNextStep}>
              下一步
            </button>
          </div>
        </div>
        <div className="meta-grid">
          <label>
            宠物名字
            <input value={draft.petName} onChange={(event) => patchStory({ petName: event.target.value })} />
          </label>
          <label>
            故事标题
            <input value={draft.title} onChange={(event) => patchStory({ title: event.target.value })} />
          </label>
          <label className="full-span">
            一句话摘要
            <textarea
              value={draft.summary ?? ""}
              onChange={(event) => patchStory({ summary: event.target.value })}
            />
          </label>
          <label>
            起始片段
            <select
              value={draft.startSceneId}
              onChange={(event) => patchStory({ startSceneId: event.target.value })}
            >
              {draft.scenes.map((scene) => (
                <option key={scene.id} value={scene.id}>
                  {scene.title || "未命名片段"}
                </option>
              ))}
            </select>
          </label>
        </div>
        <MediaField
          label="封面图片 / 视频链接"
          media={draft.cover}
          onChange={setCover}
          hint="图片会跟随导出文件一起走；视频请使用可公开访问的链接。"
        />
      </section>

      <section className={`editor-card wizard-panel ${step === 2 ? "active" : ""}`}>
        <div className="section-head">
          <h2>3. 回忆片段</h2>
          <div className="inline-actions">
            <button onClick={goPrevStep}>上一步</button>
            <button className="ghost-btn" onClick={addScene}>
              添加片段
            </button>
            <button className="primary-btn" onClick={goNextStep}>
              下一步
            </button>
          </div>
        </div>
        <p className="helper-text">
          先按顺序把片段填进去。这里默认就是一条线性的回忆流，不需要现在就想复杂分支。
        </p>
        <div className="scene-stack">
          {draft.scenes.map((scene, index) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              index={index}
              onSceneChange={updateScene}
              onMoveScene={moveScene}
              onRemoveScene={removeScene}
            />
          ))}
        </div>
      </section>

      <section className={`editor-card wizard-panel ${step === 3 ? "active" : ""}`}>
        <div className="section-head">
          <h2>4. 互动分支</h2>
          <div className="inline-actions">
            <button onClick={goPrevStep}>上一步</button>
            <button className="primary-btn" onClick={goNextStep}>
              下一步
            </button>
          </div>
        </div>
        <p className="helper-text">
          这里的分支只负责“接下来先展开哪一段”。先让故事顺起来，再来补这一层，才不会越做越乱。
        </p>
        <div className="branch-list">
          {draft.scenes.map((scene) => (
            <BranchCard
              key={scene.id}
              story={draft}
              scene={scene}
              onSceneChange={updateScene}
            />
          ))}
        </div>

        <div className="advanced-switch">
          <div>
            <strong>需要细看关系时，再进入高级流程视图。</strong>
            <p className="helper-text">普通用户停在上面的分支卡片就够用了，流程视图只用来检查连向是否清楚。</p>
          </div>
          <button
            className={showAdvancedGraph ? "primary-btn" : "ghost-btn"}
            onClick={() => {
              const next = !showAdvancedGraph;
              setShowAdvancedGraph(next);
              patchStory({ mode: next ? "graph" : "template" });
            }}
          >
            {showAdvancedGraph ? "收起高级流程视图" : "进入高级流程视图"}
          </button>
        </div>

        {showAdvancedGraph ? (
          <GraphEditor story={draft} onSceneChange={updateScene} onMoveScene={moveScene} onRemoveScene={removeScene} />
        ) : null}
      </section>

      <section className={`editor-card wizard-panel ${step === 4 ? "active" : ""}`}>
        <div className="section-head">
          <h2>5. 预览与导出</h2>
          <button onClick={goPrevStep}>上一步</button>
        </div>
        <div className="preview-actions">
          <button onClick={onPreview}>工作台预览</button>
          <button onClick={onSharePreview}>单页分享预览</button>
          <button onClick={() => downloadStoryAsJson(draft)}>导出 JSON</button>
          <button className="primary-btn" onClick={() => downloadStoryAsHtml(draft)}>
            导出分享页
          </button>
        </div>
        <StoryPlayer story={draft} />
      </section>
    </div>
  );
}

function SceneCard({
  scene,
  index,
  onSceneChange,
  onMoveScene,
  onRemoveScene,
}: {
  scene: StoryScene;
  index: number;
  onSceneChange: (sceneId: string, updater: (scene: StoryScene) => StoryScene) => void;
  onMoveScene: (sceneId: string, direction: -1 | 1) => void;
  onRemoveScene: (sceneId: string) => void;
}) {
  return (
    <article className="scene-card">
      <div className="scene-card-head">
        <div>
          <div className="eyebrow">片段 {index + 1}</div>
          <strong>{scene.title || "未命名片段"}</strong>
        </div>
        <div className="inline-actions">
          <button onClick={() => onMoveScene(scene.id, -1)}>上移</button>
          <button onClick={() => onMoveScene(scene.id, 1)}>下移</button>
          <button className="danger-btn" onClick={() => onRemoveScene(scene.id)}>
            删除
          </button>
        </div>
      </div>

      <div className="scene-grid">
        <label>
          标题
          <input
            value={scene.title}
            onChange={(event) =>
              onSceneChange(scene.id, (current) => ({
                ...current,
                title: event.target.value,
              }))
            }
          />
        </label>
        <label>
          场景氛围
          <input
            value={scene.background ?? ""}
            onChange={(event) =>
              onSceneChange(scene.id, (current) => ({
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
          onChange={(event) =>
            onSceneChange(scene.id, (current) => ({
              ...current,
              text: event.target.value,
            }))
          }
        />
      </label>

      <MediaField
        label="片段媒体"
        media={scene.media}
        onChange={(media) =>
          onSceneChange(scene.id, (current) => ({
            ...current,
            media,
          }))
        }
        hint="这里先把画面和文字对齐，分支等下一步再处理。"
      />

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={!!scene.ending}
          onChange={(event) =>
            onSceneChange(scene.id, (current) => ({
              ...current,
              ending: event.target.checked,
            }))
          }
        />
        这个片段作为结尾
      </label>
    </article>
  );
}

function BranchCard({
  story,
  scene,
  onSceneChange,
}: {
  story: StoryDocument;
  scene: StoryScene;
  onSceneChange: (sceneId: string, updater: (scene: StoryScene) => StoryScene) => void;
}) {
  const [open, setOpen] = useState(scene.choices.length > 0);
  const linearNext = getLinearNextSceneId(story, scene.id);

  function patchChoices(nextChoices: StoryChoice[]) {
    onSceneChange(scene.id, (current) => ({
      ...current,
      layout: nextChoices.length ? "choice-gate" : "moment",
      choices: nextChoices.slice(0, 2),
    }));
  }

  return (
    <article className="branch-card">
      <button className="branch-card-head" onClick={() => setOpen((current) => !current)}>
        <div>
          <strong>{scene.title || "未命名片段"}</strong>
          <span>{scene.background || "没有场景氛围描述"}</span>
        </div>
        <small>{scene.choices.length ? `${scene.choices.length} 个选择` : "线性继续"}</small>
      </button>

      {open ? (
        <div className="branch-card-body">
          <p className="helper-text">
            这个片段{scene.choices.length ? "会停下来让用户选择后续" : "目前会按顺序继续到下一段"}。
          </p>
          <div className="section-head compact">
            <h3>选择按钮</h3>
            {scene.choices.length < 2 ? (
              <button
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
              </button>
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
                <select
                  value={choice.nextSceneId}
                  onChange={(event) =>
                    patchChoices(
                      scene.choices.map((current) =>
                        current.id === choice.id ? { ...current, nextSceneId: event.target.value } : current,
                      ),
                    )
                  }
                >
                  {story.scenes.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.title || target.id}
                    </option>
                  ))}
                </select>
                <button
                  className="danger-btn"
                  onClick={() => patchChoices(scene.choices.filter((current) => current.id !== choice.id))}
                >
                  删除
                </button>
              </div>
            ))
          ) : (
            <p className="helper-text">
              暂时不加分支也没关系，当前会继续到
              <strong>{linearNext ? `「${story.scenes.find((item) => item.id === linearNext)?.title || "下一段"}」` : "故事结尾"}</strong>。
            </p>
          )}
        </div>
      ) : null}
    </article>
  );
}

function GraphEditor({
  story,
  onSceneChange,
  onMoveScene,
  onRemoveScene,
}: {
  story: StoryDocument;
  onSceneChange: (sceneId: string, updater: (scene: StoryScene) => StoryScene) => void;
  onMoveScene: (sceneId: string, direction: -1 | 1) => void;
  onRemoveScene: (sceneId: string) => void;
}) {
  const previewPath = getVisibleSceneIds(story, {});

  return (
    <div className="graph-panel">
      <div className="graph-summary">
        <strong>当前主线预览</strong>
        <p>{previewPath.map((id) => story.scenes.find((scene) => scene.id === id)?.title || "未命名").join(" → ")}</p>
      </div>
      <div className="graph-grid">
        {story.scenes.map((scene, index) => (
          <div key={scene.id} className={`graph-node ${story.startSceneId === scene.id ? "start" : ""}`}>
            <div className="graph-node-head">
              <div>
                <strong>{scene.title || `节点 ${index + 1}`}</strong>
                <span>{scene.ending ? "结尾节点" : scene.background || "普通片段"}</span>
              </div>
              <small>{scene.choices.length ? `${scene.choices.length} 条连向` : "线性继续"}</small>
            </div>
            <p className="graph-snippet">{scene.text || "这里还没有片段文案。"}</p>
            <div className="graph-actions">
              <button onClick={() => onMoveScene(scene.id, -1)}>上移</button>
              <button onClick={() => onMoveScene(scene.id, 1)}>下移</button>
              <button className="danger-btn" onClick={() => onRemoveScene(scene.id)}>
                删除
              </button>
            </div>
            <div className="graph-links">
              {scene.choices.length ? (
                scene.choices.map((choice) => (
                  <div key={choice.id} className="graph-link-row">
                    <strong>{choice.label}</strong>
                    <span>从「{scene.title || "当前节点"}」走向</span>
                    <select
                      value={choice.nextSceneId}
                      onChange={(event) =>
                        onSceneChange(scene.id, (current) => ({
                          ...current,
                          choices: current.choices.map((item) =>
                            item.id === choice.id ? { ...item, nextSceneId: event.target.value } : item,
                          ),
                        }))
                      }
                    >
                      {story.scenes.map((target) => (
                        <option key={target.id} value={target.id}>
                          {target.title || target.id}
                        </option>
                      ))}
                    </select>
                  </div>
                ))
              ) : (
                <p className="helper-text">
                  没有显式分支时，默认会继续到
                  <strong>{getLinearNextSceneId(story, scene.id) ? `下一段` : "结尾"}</strong>。
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MediaField({
  label,
  media,
  onChange,
  hint,
}: {
  label: string;
  media?: StoryMedia;
  onChange: (media?: StoryMedia) => void;
  hint: string;
}) {
  const [urlValue, setUrlValue] = useState(media?.type === "video" ? media.src : "");

  useEffect(() => {
    setUrlValue(media?.type === "video" ? media.src : "");
  }, [media]);

  async function onImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const src = await readAsDataUrl(file);
    onChange({ type: "image", src, embedded: true });
    event.target.value = "";
  }

  return (
    <div className="media-field">
      <strong>{label}</strong>
      <p className="helper-text">{hint}</p>
      <div className="media-inputs">
        <label className="ghost-btn file-btn">
          上传图片
          <input type="file" accept="image/*" onChange={onImageUpload} />
        </label>
        <input
          value={urlValue}
          placeholder="填入视频 URL"
          onChange={(event) => setUrlValue(event.target.value)}
        />
        <button
          onClick={() => {
            if (urlValue.trim()) onChange({ type: "video", src: urlValue.trim() });
          }}
        >
          使用视频链接
        </button>
        <button className="danger-btn" onClick={() => onChange(undefined)}>
          清空媒体
        </button>
      </div>
      <div className="media-preview">
        {media?.type === "image" ? <img src={media.src} alt="preview" /> : null}
        {media?.type === "video" ? (
          <video src={media.src} controls playsInline>
            这个视频链接暂时无法播放。
          </video>
        ) : null}
        {!media ? <span>还没有设置媒体</span> : null}
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
      <div className="preview-shell">
        <button className="ghost-btn back-floating" onClick={onBack}>
          返回工作台
        </button>
        <div className="empty-state">
          <h2>这份本地作品暂时不存在。</h2>
          <p>先回去确认你要看的故事是否已经保存在本机。</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`preview-shell ${route.kind === "share" ? "share-mode" : ""}`}>
      <button className="ghost-btn back-floating" onClick={onBack}>
        返回工作台
      </button>
      <StoryPlayer story={story} shareMode={route.kind === "share"} />
    </div>
  );
}

function StoryPlayer({ story, shareMode }: { story: StoryDocument; shareMode?: boolean }) {
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
      <section className="player-hero">
        <div className="player-cover">
          {story.cover?.type === "image" ? <img src={story.cover.src} alt={story.title} /> : null}
          {story.cover?.type === "video" ? <video src={story.cover.src} controls playsInline /> : null}
          {!story.cover ? <span>这里会显示故事封面</span> : null}
        </div>
        <div className="eyebrow">{shareMode ? "单页分享预览" : "工作台预览"}</div>
        <h1>{story.title}</h1>
        <p className="lede">
          {story.petName} · {story.summary || "把和宠物一起度过的片段温柔地留下来。"}
        </p>
      </section>

      <div className="story-flow">
        {visibleScenes.map((scene) => {
          const selectedChoice = getChoiceById(scene, decisions[scene.id]);
          return (
            <section key={scene.id} className={`player-card ${scene.layout === "choice-gate" ? "choice-gate" : ""}`}>
              <div className="player-media">
                {scene.media?.type === "image" ? <img src={scene.media.src} alt={scene.title} /> : null}
                {scene.media?.type === "video" ? (
                  <video src={scene.media.src} controls playsInline>
                    这个视频链接暂时无法播放。
                  </video>
                ) : null}
                {!scene.media ? <span>这一段还没有放媒体，先把回忆写下来也很好。</span> : null}
              </div>
              <div className="player-body">
                <div className="eyebrow">{scene.background || "温柔片段"}</div>
                <h2>{scene.title}</h2>
                <p>{scene.text}</p>

                {scene.choices.length ? (
                  <div className="choice-stack">
                    {scene.choices.map((choice) => {
                      const active = selectedChoice?.id === choice.id;
                      return (
                        <button
                          key={choice.id}
                          className={active ? "selected-choice" : ""}
                          onClick={() => choose(scene.id, choice.id)}
                        >
                          <strong>{choice.label}</strong>
                          <span>{choice.coverText || "从这里继续往下看。"}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      <div className="player-footer-actions">
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>重新看这一页</button>
        <button onClick={() => setDecisions({})}>回到开头</button>
        {branchScene && decisions[branchScene.id] ? (
          <button className="primary-btn" onClick={retryBranch}>
            试试另一条分支
          </button>
        ) : null}
      </div>
    </div>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
