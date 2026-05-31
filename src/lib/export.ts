import type { StoryDocument, StoryMedia } from "../types";

type ExportIssueCode = "local_video_not_exportable" | "invalid_media_url" | "missing_media";

export type ExportValidationIssue = {
  code: ExportIssueCode;
  path: string;
  label: string;
  message: string;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function safeScriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function inferMediaSource(media: StoryMedia): "url" | "upload" {
  if (media.source) return media.source;
  if (media.type === "video" && media.mediaId) return "upload";
  return "url";
}

function isHttpsUrl(value: string): boolean {
  return /^https:\/\//i.test(value.trim());
}

export function validateStoryForExport(story: StoryDocument): {
  ok: boolean;
  issues: ExportValidationIssue[];
} {
  const issues: ExportValidationIssue[] = [];

  function validateMedia(media: StoryMedia | undefined, path: string, label: string) {
    if (!media) {
      issues.push({
        code: "missing_media",
        path,
        label,
        message: `${label}缺少媒体，分享页将只显示文字。`,
      });
      return;
    }

    const source = inferMediaSource(media);
    if (media.type === "video" && source === "upload") {
      issues.push({
        code: "local_video_not_exportable",
        path,
        label,
        message: `${label}使用了本地上传视频，导出前请改为 https 视频链接。`,
      });
      return;
    }

    if (source === "url" && media.src && !isHttpsUrl(media.src)) {
      issues.push({
        code: "invalid_media_url",
        path,
        label,
        message: `${label}链接不是 https 地址，请更换后再导出。`,
      });
    }
  }

  validateMedia(story.cover, "cover", "封面");
  story.scenes.forEach((scene, index) => {
    validateMedia(scene.media, `scene:${scene.id}`, `片段 ${index + 1}「${scene.title || "未命名"}」`);
  });

  const blockingCodes: ExportIssueCode[] = ["local_video_not_exportable", "invalid_media_url"];
  return {
    ok: !issues.some((issue) => blockingCodes.includes(issue.code)),
    issues,
  };
}

export function exportStoryAsJson(story: StoryDocument): Blob {
  return new Blob([JSON.stringify(story, null, 2)], {
    type: "application/json;charset=utf-8",
  });
}

export function downloadStoryAsJson(story: StoryDocument) {
  const blob = exportStoryAsJson(story);
  downloadBlob(blob, `${story.petName || "pet"}-${story.title || "story"}.json`);
}

export function exportStoryAsHtml(story: StoryDocument): Blob {
  const payload = safeScriptJson(story);
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(story.title || "宠爱时光")}</title>
  <style>
    :root {
      --line: rgba(118, 88, 65, 0.14);
      --text: #4b3a2f;
      --muted: #86715f;
      --soft: #a28d7b;
      --accent: #c98b54;
      --accent-strong: #b6723d;
      --accent-soft: rgba(201, 139, 84, 0.14);
      --shadow: 0 22px 60px rgba(112, 81, 58, 0.14);
      --radius-xl: 28px;
      --radius-lg: 20px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at top left, rgba(255,255,255,0.92), transparent 34%),
        radial-gradient(circle at top right, rgba(250, 232, 217, 0.46), transparent 38%),
        linear-gradient(180deg, #fffaf5 0%, #f7f0e7 50%, #f3ebe2 100%);
      min-height: 100vh;
    }
    .shell {
      width: min(100%, 860px);
      margin: 0 auto;
      padding: 24px 16px 48px;
      display: grid;
      gap: 18px;
    }
    .hero, .scene-card, .footer-actions {
      background: rgba(255, 252, 247, 0.84);
      backdrop-filter: blur(20px);
      border: 1px solid var(--line);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow);
    }
    .hero {
      padding: 18px;
      display: grid;
      gap: 16px;
    }
    .cover {
      aspect-ratio: 4 / 5;
      border-radius: 22px;
      overflow: hidden;
      background: linear-gradient(180deg, #f3dfc6 0%, #ead7ca 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--muted);
    }
    .cover img, .cover video, .scene-media img, .scene-media video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent);
      font-size: 12px;
      letter-spacing: 0.08em;
    }
    h1 {
      font-size: clamp(28px, 8vw, 38px);
      line-height: 1.15;
    }
    .summary {
      margin: 0;
      color: var(--muted);
      line-height: 1.75;
    }
    .scene-list {
      display: grid;
      gap: 16px;
    }
    .scene-card {
      padding: 18px;
      display: grid;
      gap: 16px;
      background: rgba(255, 255, 255, 0.9);
    }
    .scene-media {
      aspect-ratio: 4 / 5;
      overflow: hidden;
      border-radius: 22px;
      background: #efe3d5;
    }
    .scene-title {
      margin: 0;
      font-size: 22px;
    }
    .scene-meta {
      color: var(--accent);
      font-size: 12px;
      letter-spacing: 0.08em;
    }
    .scene-text {
      color: var(--text);
      line-height: 1.9;
      margin: 0;
      white-space: pre-wrap;
    }
    .scene-body {
      display: grid;
      gap: 12px;
    }
    .choice-gate {
      border-color: rgba(190, 125, 67, 0.28);
    }
    .choice-list {
      display: grid;
      gap: 12px;
    }
    button {
      appearance: none;
      border: none;
      cursor: pointer;
      border-radius: 18px;
      padding: 14px 16px;
      font-size: 15px;
      line-height: 1.5;
      background: rgba(255,255,255,0.9);
      border: 1px solid rgba(207, 141, 80, 0.24);
      color: var(--text);
      text-align: left;
      transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
      box-shadow: 0 10px 24px rgba(134, 100, 72, 0.08);
    }
    button:hover { transform: translateY(-1px); }
    button.primary {
      background: linear-gradient(180deg, #dca56e 0%, #ca8646 100%);
      color: white;
    }
    .choice-btn {
      display: grid;
      gap: 6px;
    }
    .choice-btn span {
      color: var(--muted);
      font-size: 14px;
    }
    .choice-btn.selected {
      border-color: rgba(190, 125, 67, 0.34);
      background: linear-gradient(180deg, rgba(255, 248, 240, 0.98) 0%, rgba(255, 238, 220, 0.92) 100%);
    }
    .footer-actions {
      display: flex;
      justify-content: center;
      gap: 10px;
      flex-wrap: wrap;
      padding: 16px;
      background: rgba(255, 252, 247, 0.76);
    }
    .footer-note {
      text-align: center;
      color: var(--muted);
      font-size: 12px;
    }
    .empty {
      color: var(--muted);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    @media (max-width: 640px) {
      .footer-actions button {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="shell">
    <section class="hero">
      <div class="cover" id="cover"></div>
      <div class="eyebrow">温柔回看 · ${escapeHtml(story.petName || "小家伙")}</div>
      <h1>${escapeHtml(story.title || "宠爱时光")}</h1>
      <p class="summary">${escapeHtml(story.summary || "把一起度过的日常，慢慢收进一段温柔回忆。")}</p>
    </section>
    <div class="scene-list" id="scene-list"></div>
    <section class="footer-actions" id="footer-actions"></section>
    <div class="footer-note">这份回忆由宠爱时光生成。</div>
  </div>
  <script>
    const story = ${payload};
    const cover = document.getElementById("cover");
    const sceneList = document.getElementById("scene-list");
    const footerActions = document.getElementById("footer-actions");
    const indexById = new Map(story.scenes.map((scene, index) => [scene.id, index]));
    let decisions = {};

    function mountMedia(target, content, fallback) {
      target.innerHTML = "";
      if (!content) {
        target.classList.add("empty");
        target.textContent = fallback;
        return;
      }
      target.classList.remove("empty");
      if (content.type === "image") {
        const img = document.createElement("img");
        img.src = content.src;
        img.alt = fallback;
        target.appendChild(img);
        return;
      }
      const video = document.createElement("video");
      video.src = content.src;
      video.controls = true;
      video.playsInline = true;
      target.appendChild(video);
    }

    function nextSceneId(scene) {
      const idx = indexById.get(scene.id);
      if (typeof idx !== "number") return undefined;
      return story.scenes[idx + 1] ? story.scenes[idx + 1].id : undefined;
    }

    function getSceneById(sceneId) {
      return story.scenes.find((scene) => scene.id === sceneId);
    }

    function escapeHtmlText(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function getVisibleSceneIds() {
      const ids = [];
      const seen = new Set();
      let currentId = story.startSceneId;

      while (currentId) {
        if (seen.has(currentId)) break;
        seen.add(currentId);
        ids.push(currentId);

        const scene = getSceneById(currentId);
        if (!scene) break;

        if (scene.choices && scene.choices.length) {
          const choiceId = decisions[scene.id];
          const choice = scene.choices.find((item) => item.id === choiceId);
          if (!choice) break;
          currentId = choice.nextSceneId;
          continue;
        }

        if (scene.ending) break;

        const nextId = nextSceneId(scene);
        if (!nextId) break;
        currentId = nextId;
      }

      return ids;
    }

    function getLastBranchScene() {
      const ids = getVisibleSceneIds().filter((sceneId) => {
        const scene = getSceneById(sceneId);
        return scene && scene.choices && scene.choices.length;
      });
      return ids.length ? getSceneById(ids[ids.length - 1]) : undefined;
    }

    function renderCover() {
      mountMedia(cover, story.cover, story.petName || "封面");
    }

    function choose(sceneId, choiceId) {
      decisions = Object.assign({}, decisions, { [sceneId]: choiceId });
      render();
    }

    function resetStory() {
      decisions = {};
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function retryBranch() {
      const branchScene = getLastBranchScene();
      if (!branchScene) return;
      const next = Object.assign({}, decisions);
      delete next[branchScene.id];
      decisions = next;
      render();
    }

    function renderScenes() {
      sceneList.innerHTML = "";
      const ids = getVisibleSceneIds();

      ids.forEach((sceneId) => {
        const scene = getSceneById(sceneId);
        if (!scene) return;

        const selectedChoiceId = decisions[scene.id];
        const card = document.createElement("section");
        card.className = "scene-card" + (scene.layout === "choice-gate" ? " choice-gate" : "");

        const media = document.createElement("div");
        media.className = "scene-media";
        mountMedia(media, scene.media, "这一段还没有放媒体，先把回忆写下来也很好。");
        card.appendChild(media);

        const body = document.createElement("div");
        body.className = "scene-body";

        const meta = document.createElement("div");
        meta.className = "eyebrow";
        meta.textContent = scene.background || "温柔片段";
        body.appendChild(meta);

        const title = document.createElement("h2");
        title.className = "scene-title";
        title.textContent = scene.title || "未命名片段";
        body.appendChild(title);

        const text = document.createElement("p");
        text.className = "scene-text";
        text.textContent = scene.text || "";
        body.appendChild(text);

        if (scene.choices && scene.choices.length) {
          const choiceList = document.createElement("div");
          choiceList.className = "choice-list";

          scene.choices.slice(0, 2).forEach((choice) => {
            const button = document.createElement("button");
            button.className = "choice-btn" + (selectedChoiceId === choice.id ? " selected" : "");
            button.innerHTML = "<strong>" + escapeHtmlText(choice.label || "继续看") + "</strong>"
              + "<span>" + escapeHtmlText(choice.coverText || "从这里继续往下看。") + "</span>";
            button.onclick = () => choose(scene.id, choice.id);
            choiceList.appendChild(button);
          });

          body.appendChild(choiceList);
        }

        card.appendChild(body);
        sceneList.appendChild(card);
      });
    }

    function renderFooterActions() {
      footerActions.innerHTML = "";

      const topButton = document.createElement("button");
      topButton.textContent = "重新看这一页";
      topButton.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
      footerActions.appendChild(topButton);

      const resetButton = document.createElement("button");
      resetButton.textContent = "回到开头";
      resetButton.onclick = resetStory;
      footerActions.appendChild(resetButton);

      const branchScene = getLastBranchScene();
      if (branchScene && decisions[branchScene.id]) {
        const retryButton = document.createElement("button");
        retryButton.className = "primary";
        retryButton.textContent = "试试另一条分支";
        retryButton.onclick = retryBranch;
        footerActions.appendChild(retryButton);
      }
    }

    function render() {
      renderScenes();
      renderFooterActions();
    }

    renderCover();
    render();
  </script>
</body>
</html>`;

  return new Blob([html], { type: "text/html;charset=utf-8" });
}

export function downloadStoryAsHtml(story: StoryDocument) {
  const blob = exportStoryAsHtml(story);
  downloadBlob(blob, `${story.petName || "pet"}-${story.title || "story"}.html`);
}

export async function importStoryFromJson(file: File): Promise<StoryDocument> {
  const text = await file.text();
  return JSON.parse(text) as StoryDocument;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
