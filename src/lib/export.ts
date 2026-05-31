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
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>${escapeHtml(story.title || "宠爱时光")}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; overflow: hidden; }
    body {
      font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif;
      background: #000;
      color: #fff;
      -webkit-font-smoothing: antialiased;
    }

    /* Phase containers */
    .phase {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      transition: opacity 300ms ease-out, transform 300ms ease-out;
    }
    .phase.hidden {
      opacity: 0;
      pointer-events: none;
      transform: translateY(12px);
    }
    .phase.visible {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
    }

    /* ── Cover ─────────────────────────────── */
    .cover-phase {
      background: linear-gradient(to bottom, #171717, #000);
      overflow: hidden;
    }
    .cover-bg {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      filter: blur(20px) brightness(0.35);
      transform: scale(1.1);
    }
    .cover-bg::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom, rgba(0,0,0,0.4), transparent 40%, rgba(0,0,0,0.7));
    }
    .cover-inner {
      position: relative;
      z-index: 1;
      text-align: center;
      padding: 2rem 2rem 3rem;
      max-width: 420px;
      width: 100%;
    }
    .cover-avatar {
      width: 7rem;
      height: 7rem;
      border-radius: 50%;
      object-fit: cover;
      margin: 0 auto 1.5rem;
      display: block;
      box-shadow: 0 0 0 4px rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.4);
    }
    .cover-title {
      font-size: clamp(26px, 7vw, 36px);
      font-weight: 600;
      line-height: 1.2;
      margin-bottom: 0.4rem;
    }
    .cover-pet {
      color: rgba(255,255,255,0.6);
      font-size: 14px;
      margin-bottom: 0.25rem;
    }
    .cover-summary {
      color: rgba(255,255,255,0.4);
      font-size: 12px;
      line-height: 1.7;
      margin-bottom: 2rem;
      white-space: pre-wrap;
    }

    /* ── Playing ───────────────────────────── */
    .play-phase {
      background: #000;
    }
    .media-area {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .media-area img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .media-area video {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      display: block;
    }
    .media-area .no-media {
      color: rgba(255,255,255,0.2);
      font-size: 14px;
    }

    /* Bottom overlay */
    .play-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 2;
      background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.5) 60%, transparent 100%);
      padding: 5rem 1.5rem 2rem;
      transition: opacity 300ms ease-out, transform 300ms ease-out;
    }
    .play-overlay.out {
      opacity: 0;
      transform: translateY(12px);
    }
    .play-overlay-inner {
      max-width: 460px;
      margin: 0 auto;
    }
    .scene-background {
      display: inline-block;
      font-size: 10px;
      color: rgba(255,255,255,0.4);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 4px;
    }
    .scene-title {
      font-size: 18px;
      font-weight: 600;
      line-height: 1.4;
      margin-bottom: 4px;
    }
    .scene-text {
      color: rgba(255,255,255,0.6);
      font-size: 14px;
      line-height: 1.7;
      margin-bottom: 1.25rem;
      white-space: pre-wrap;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* ── Ended ─────────────────────────────── */
    .ended-phase {
      background: linear-gradient(to bottom, #171717, #000);
    }
    .ended-inner {
      text-align: center;
      padding: 2rem;
      max-width: 380px;
    }
    .ended-icon {
      width: 4rem;
      height: 4rem;
      border-radius: 50%;
      background: rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
      font-size: 1.5rem;
    }
    .ended-title {
      font-size: 22px;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    .ended-sub {
      color: rgba(255,255,255,0.5);
      font-size: 14px;
      margin-bottom: 2rem;
    }

    /* ── Buttons ───────────────────────────── */
    .btn {
      appearance: none;
      border: none;
      cursor: pointer;
      font-family: inherit;
      font-size: 14px;
      border-radius: 999px;
      transition: background 180ms ease, transform 120ms ease;
    }
    .btn:active { transform: scale(0.96); }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 28px;
      background: #fff;
      color: #171717;
      font-weight: 500;
    }
    .btn-primary:hover { background: rgba(255,255,255,0.9); }

    .btn-ghost {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 20px;
      background: rgba(255,255,255,0.12);
      color: #fff;
      border: 1px solid rgba(255,255,255,0.15);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    .btn-ghost:hover { background: rgba(255,255,255,0.2); }

    /* Choice buttons */
    .choices {
      display: grid;
      gap: 8px;
    }
    .choice-btn {
      display: block;
      width: 100%;
      text-align: left;
      padding: 12px 16px;
      border-radius: 14px;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.15);
      color: #fff;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: background 180ms ease, transform 120ms ease;
    }
    .choice-btn:hover { background: rgba(255,255,255,0.2); }
    .choice-btn:active { transform: scale(0.98); }
    .choice-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
    }
    .choice-cover-text {
      display: block;
      font-size: 12px;
      color: rgba(255,255,255,0.4);
      margin-top: 2px;
    }

    /* SVG icons inline */
    .icon {
      width: 16px;
      height: 16px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .icon-sm {
      width: 14px;
      height: 14px;
    }

    /* Safe area for notched phones */
    @supports (padding: env(safe-area-inset-bottom)) {
      .play-overlay { padding-bottom: calc(2rem + env(safe-area-inset-bottom)); }
      .cover-inner { padding-bottom: calc(3rem + env(safe-area-inset-bottom)); }
      .ended-inner { padding-bottom: calc(2rem + env(safe-area-inset-bottom)); }
    }
  </style>
</head>
<body>

  <!-- Cover -->
  <div id="cover-phase" class="phase cover-phase hidden">
    <div class="cover-bg" id="cover-bg"></div>
    <div class="cover-inner">
      <img class="cover-avatar" id="cover-avatar" alt="" />
      <h1 class="cover-title">${escapeHtml(story.title || "宠爱时光")}</h1>
      <p class="cover-pet">${escapeHtml(story.petName || "")}</p>
      ${story.summary ? `<p class="cover-summary">${escapeHtml(story.summary)}</p>` : ""}
      <button class="btn btn-primary" onclick="startPlaying()">
        <svg class="icon" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none"/></svg>
        开始观看
      </button>
    </div>
  </div>

  <!-- Playing -->
  <div id="play-phase" class="phase play-phase hidden">
    <div class="media-area" id="media-area"></div>
    <div class="play-overlay" id="play-overlay">
      <div class="play-overlay-inner" id="play-overlay-inner"></div>
    </div>
  </div>

  <!-- Ended -->
  <div id="ended-phase" class="phase ended-phase hidden">
    <div class="ended-inner">
      <div class="ended-icon">&#x1F43E;</div>
      <h2 class="ended-title">故事看完了</h2>
      <p class="ended-sub">和 ${escapeHtml(story.petName || "小家伙")} 的故事，永远温柔回看。</p>
      <button class="btn btn-ghost" onclick="restart()">
        <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
        重新开始
      </button>
    </div>
  </div>

  <script>
    var story = ${payload};

    /* ── DOM refs ─────────────────────────── */
    var coverPhase     = document.getElementById("cover-phase");
    var coverBg        = document.getElementById("cover-bg");
    var coverAvatar    = document.getElementById("cover-avatar");
    var playPhase      = document.getElementById("play-phase");
    var mediaArea      = document.getElementById("media-area");
    var playOverlay    = document.getElementById("play-overlay");
    var playOverlayInner = document.getElementById("play-overlay-inner");
    var endedPhase     = document.getElementById("ended-phase");

    /* ── State ────────────────────────────── */
    var phase = "cover";
    var currentSceneId = story.startSceneId;
    var decisions = {};
    var transitioning = false;

    /* ── Helpers ──────────────────────────── */
    function getSceneById(id) {
      return story.scenes.find(function(s) { return s.id === id; });
    }

    function linearNextSceneId(sceneId) {
      var idx = story.scenes.findIndex(function(s) { return s.id === sceneId; });
      if (idx < 0) return undefined;
      return story.scenes[idx + 1] ? story.scenes[idx + 1].id : undefined;
    }

    function escHtml(v) {
      return String(v)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    /* ── Phase switching ──────────────────── */
    function showPhase(name) {
      [coverPhase, playPhase, endedPhase].forEach(function(el) {
        el.classList.add("hidden");
        el.classList.remove("visible");
      });
      var target =
        name === "cover" ? coverPhase :
        name === "playing" ? playPhase : endedPhase;
      target.classList.remove("hidden");
      target.classList.add("visible");
      phase = name;
    }

    function transition(fn) {
      if (transitioning) return;
      transitioning = true;

      // Fade out current overlay / content
      if (phase === "playing") {
        playOverlay.classList.add("out");
      }
      var currentEl =
        phase === "cover" ? coverPhase :
        phase === "playing" ? playPhase : endedPhase;
      currentEl.style.opacity = "0";
      currentEl.style.transform = "translateY(12px)";

      setTimeout(function() {
        fn();
        transitioning = false;
      }, 350);
    }

    /* ── Cover setup ──────────────────────── */
    function initCover() {
      if (story.cover && story.cover.type === "image" && story.cover.src) {
        coverBg.style.backgroundImage = "url(" + story.cover.src + ")";
        coverAvatar.src = story.cover.src;
        coverAvatar.style.display = "block";
      } else {
        coverBg.style.backgroundImage = "none";
        coverAvatar.style.display = "none";
      }
      showPhase("cover");
    }

    /* ── Start playing ────────────────────── */
    function startPlaying() {
      transition(function() {
        currentSceneId = story.startSceneId;
        decisions = {};
        renderScene();
        showPhase("playing");
      });
    }

    /* ── Scene rendering ──────────────────── */
    function renderScene() {
      var scene = getSceneById(currentSceneId);
      if (!scene) { endStory(); return; }

      // Media
      mediaArea.innerHTML = "";
      if (scene.media) {
        if (scene.media.type === "image") {
          var img = document.createElement("img");
          img.src = scene.media.src;
          img.alt = "";
          mediaArea.appendChild(img);
        } else {
          var video = document.createElement("video");
          video.src = scene.media.src;
          video.controls = true;
          video.playsInline = true;
          video.autoplay = true;
          mediaArea.appendChild(video);
        }
      } else {
        var placeholder = document.createElement("div");
        placeholder.className = "no-media";
        placeholder.textContent = "这一段还没有放媒体";
        mediaArea.appendChild(placeholder);
      }

      // Overlay content
      var html = "";
      if (scene.background) {
        html += '<span class="scene-background">' + escHtml(scene.background) + '</span>';
      }
      html += '<h2 class="scene-title">' + escHtml(scene.title || "未命名片段") + '</h2>';
      if (scene.text) {
        html += '<p class="scene-text">' + escHtml(scene.text) + '</p>';
      }

      // Action buttons
      if (scene.choices && scene.choices.length > 0) {
        html += '<div class="choices">';
        scene.choices.forEach(function(choice) {
          html += '<button class="choice-btn" onclick="choose(\\'' + escHtml(scene.id) + '\\',\\'' + escHtml(choice.id) + '\\')">';
          html += '<strong class="choice-label">' + escHtml(choice.label || "继续看") + '</strong>';
          if (choice.coverText) {
            html += '<span class="choice-cover-text">' + escHtml(choice.coverText) + '</span>';
          }
          html += '</button>';
        });
        html += '</div>';
      } else if (scene.ending) {
        html += '<button class="btn btn-primary" onclick="endStory()">看完了</button>';
      } else {
        html += '<button class="btn btn-ghost" onclick="goNext()">继续 <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></button>';
      }

      playOverlayInner.innerHTML = html;
      playOverlay.classList.remove("out");
    }

    /* ── Actions ──────────────────────────── */
    function choose(sceneId, choiceId) {
      var scene = getSceneById(sceneId);
      if (!scene) return;
      var choice = scene.choices.find(function(c) { return c.id === choiceId; });
      if (!choice) return;
      decisions = Object.assign({}, decisions);
      decisions[sceneId] = choiceId;
      transition(function() {
        currentSceneId = choice.nextSceneId;
        renderScene();
        showPhase("playing");
      });
    }

    function goNext() {
      var nextId = linearNextSceneId(currentSceneId);
      if (nextId) {
        transition(function() {
          currentSceneId = nextId;
          renderScene();
          showPhase("playing");
        });
      } else {
        endStory();
      }
    }

    function endStory() {
      transition(function() {
        showPhase("ended");
      });
    }

    function restart() {
      transition(function() {
        currentSceneId = story.startSceneId;
        decisions = {};
        initCover();
      });
    }

    /* ── Boot ─────────────────────────────── */
    initCover();
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
