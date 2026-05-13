import type { StoryDocument } from "../types";

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
  <title>${escapeHtml(story.title || "宠物温馨回忆")}</title>
  <style>
    :root {
      --bg: #f8f2ea;
      --panel: rgba(255, 255, 255, 0.78);
      --line: rgba(124, 92, 68, 0.18);
      --text: #4f3f34;
      --muted: #8a7564;
      --accent: #cf8d50;
      --accent-soft: rgba(207, 141, 80, 0.14);
      --shadow: 0 22px 60px rgba(122, 90, 65, 0.16);
      --radius: 24px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at top left, rgba(255,255,255,0.85), transparent 35%),
        linear-gradient(180deg, #fff8f1 0%, #f6efe7 52%, #f3ece4 100%);
      min-height: 100vh;
    }
    .shell {
      width: min(100%, 760px);
      margin: 0 auto;
      padding: 24px 16px 48px;
    }
    .hero, .card {
      background: var(--panel);
      backdrop-filter: blur(18px);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
    }
    .hero {
      padding: 18px;
      margin-bottom: 18px;
      overflow: hidden;
    }
    .cover {
      aspect-ratio: 4 / 5;
      border-radius: 20px;
      overflow: hidden;
      background: linear-gradient(180deg, #f3dfc6 0%, #ead7ca 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--muted);
      margin-bottom: 16px;
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
      margin: 14px 0 10px;
      font-size: clamp(28px, 8vw, 38px);
      line-height: 1.15;
    }
    .summary {
      margin: 0;
      color: var(--muted);
      line-height: 1.75;
    }
    .card {
      padding: 18px;
    }
    .scene-media {
      aspect-ratio: 4 / 5;
      overflow: hidden;
      border-radius: 20px;
      background: #efe3d5;
      margin-bottom: 18px;
    }
    .scene-title {
      margin: 0 0 8px;
      font-size: 22px;
    }
    .scene-meta {
      color: var(--accent);
      font-size: 12px;
      margin-bottom: 10px;
      letter-spacing: 0.08em;
    }
    .scene-text {
      color: var(--text);
      line-height: 1.9;
      margin: 0;
      white-space: pre-wrap;
    }
    .choice-list {
      display: grid;
      gap: 12px;
      margin-top: 20px;
    }
    button {
      appearance: none;
      border: none;
      cursor: pointer;
      border-radius: 16px;
      padding: 14px 16px;
      font-size: 15px;
      line-height: 1.5;
      background: rgba(255,255,255,0.9);
      border: 1px solid rgba(207, 141, 80, 0.24);
      color: var(--text);
      text-align: left;
    }
    button.primary {
      background: linear-gradient(180deg, #dca56e 0%, #ca8646 100%);
      color: white;
    }
    .footer-note {
      text-align: center;
      color: var(--muted);
      font-size: 12px;
      margin-top: 18px;
    }
  </style>
</head>
<body>
  <div class="shell">
    <section class="hero">
      <div class="cover" id="cover"></div>
      <div class="eyebrow">温馨回忆 · ${escapeHtml(story.petName || "小家伙")}</div>
      <h1>${escapeHtml(story.title || "宠物温馨回忆")}</h1>
      <p class="summary">${escapeHtml(story.summary || "把和宠物一起度过的片段温柔地留下来。")}</p>
    </section>
    <section class="card">
      <div class="scene-media" id="scene-media"></div>
      <div class="scene-meta" id="scene-meta"></div>
      <h2 class="scene-title" id="scene-title"></h2>
      <p class="scene-text" id="scene-text"></p>
      <div class="choice-list" id="choice-list"></div>
    </section>
    <div class="footer-note">这份回忆由宠物温馨互动视频工作台生成。</div>
  </div>
  <script>
    const story = ${payload};
    const cover = document.getElementById("cover");
    const media = document.getElementById("scene-media");
    const title = document.getElementById("scene-title");
    const text = document.getElementById("scene-text");
    const meta = document.getElementById("scene-meta");
    const choiceList = document.getElementById("choice-list");
    const indexById = new Map(story.scenes.map((scene, index) => [scene.id, index]));
    let currentId = story.startSceneId;

    function mountMedia(target, content, fallback) {
      target.innerHTML = "";
      if (!content) {
        target.textContent = fallback;
        return;
      }
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

    function renderCover() {
      mountMedia(cover, story.cover, story.petName || "封面");
    }

    function renderScene(sceneId) {
      const scene = story.scenes.find((item) => item.id === sceneId);
      if (!scene) return;
      currentId = sceneId;
      mountMedia(media, scene.media, "这一段还没有放入媒体");
      meta.textContent = scene.background || "温柔片段";
      title.textContent = scene.title || "未命名片段";
      text.textContent = scene.text || "";
      choiceList.innerHTML = "";

      if (scene.choices.length) {
        scene.choices.slice(0, 2).forEach((choice) => {
          const button = document.createElement("button");
          button.textContent = choice.label || "继续";
          button.onclick = () => renderScene(choice.nextSceneId);
          choiceList.appendChild(button);
        });
        return;
      }

      if (scene.ending) {
        const button = document.createElement("button");
        button.className = "primary";
        button.textContent = "再看一遍";
        button.onclick = () => renderScene(story.startSceneId);
        choiceList.appendChild(button);
        return;
      }

      const nextId = nextSceneId(scene);
      if (nextId) {
        const button = document.createElement("button");
        button.className = "primary";
        button.textContent = "继续看下一段";
        button.onclick = () => renderScene(nextId);
        choiceList.appendChild(button);
      }
    }

    renderCover();
    renderScene(currentId);
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
