import { useEffect, useState } from "react";
import { saveMediaBlob } from "../../lib/idb";
import type { StoryMedia } from "../../types";
import { Button } from "../ui/Button";
import { MediaFrame } from "../ui/MediaFrame";

const IMAGE_MIME_ALLOW = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const VIDEO_MIME_ALLOW = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const VIDEO_MAX_BYTES = 120 * 1024 * 1024;
const VIDEO_WARN_SECONDS = 90;

export function MediaField({
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
  const [urlValue, setUrlValue] = useState(media?.source !== "upload" ? media?.src ?? "" : "");
  const [linkType, setLinkType] = useState<"image" | "video">(media?.type === "image" ? "image" : "video");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  useEffect(() => {
    if (!media) {
      setUrlValue("");
      setError("");
      setWarning("");
      return;
    }
    setUrlValue(media?.source !== "upload" ? media.src : "");
    setLinkType(media.type === "image" ? "image" : "video");
  }, [media]);

  async function onImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setWarning("");
    if (!IMAGE_MIME_ALLOW.has(file.type)) {
      setError("图片格式仅支持 jpg/jpeg/png/webp。");
      event.target.value = "";
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      setError("图片大小不能超过 10MB。");
      event.target.value = "";
      return;
    }
    const src = await readAsDataUrl(file);
    onChange({
      type: "image",
      src,
      embedded: true,
      source: "upload",
      mimeType: file.type || undefined,
      sizeBytes: file.size,
    });
    setWarning("图片已上传（次入口），导出分享可直接保留。");
    event.target.value = "";
  }

  async function onVideoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setWarning("");
    if (!VIDEO_MIME_ALLOW.has(file.type)) {
      setError("视频格式仅支持 mp4/webm/mov。");
      event.target.value = "";
      return;
    }
    if (file.size > VIDEO_MAX_BYTES) {
      setError("视频大小不能超过 120MB。");
      event.target.value = "";
      return;
    }

    const durationSec = await readVideoDuration(file);
    const mediaId = await saveMediaBlob(file);
    onChange({
      type: "video",
      src: "",
      source: "upload",
      mediaId,
      mimeType: file.type || undefined,
      sizeBytes: file.size,
      durationSec: Number.isFinite(durationSec) ? durationSec : undefined,
    });

    if (Number.isFinite(durationSec) && durationSec > VIDEO_WARN_SECONDS) {
      setWarning("视频时长超过 90 秒，弱网设备播放可能变慢。");
    } else {
      setWarning("本地视频已上传（次入口），工作台可预览，导出前需改成视频链接。");
    }
    event.target.value = "";
  }

  function applyLink() {
    setError("");
    setWarning("");
    const trimmed = urlValue.trim();
    if (!trimmed) {
      setError("请先填入媒体链接。");
      return;
    }
    if (!/^https:\/\//i.test(trimmed)) {
      setError("链接必须以 https:// 开头。");
      return;
    }

    onChange({
      type: linkType,
      src: trimmed,
      source: "url",
    });

    setWarning(linkType === "video" ? "视频链接已设置，适合导出分享。" : "图片链接已设置。");
  }

  function clearMedia() {
    setError("");
    setWarning("");
    setUrlValue("");
    onChange(undefined);
  }

  return (
    <div className="media-field">
      <strong>{label}</strong>
      <p className="helper-text">{hint}</p>

      <div className="media-link-main">
        <div className="section-head compact">
          <h3>链接入口（主）</h3>
          <small className="helper-text">推荐用于分享</small>
        </div>
        <div className="media-link-actions">
          <input value={urlValue} placeholder="填入 https:// 媒体链接" onChange={(event) => setUrlValue(event.target.value)} />
          <div className="media-link-type">
            <Button size="sm" variant={linkType === "video" ? "primary" : "ghost"} onClick={() => setLinkType("video")}>
              视频
            </Button>
            <Button size="sm" variant={linkType === "image" ? "primary" : "ghost"} onClick={() => setLinkType("image")}>
              图片
            </Button>
          </div>
          <Button onClick={applyLink}>使用链接</Button>
        </div>
      </div>

      <div className="media-upload-secondary">
        <div className="section-head compact">
          <h3>上传入口（次）</h3>
          <small className="helper-text">适合先编辑再整理</small>
        </div>
        <div className="media-inputs">
          <label className="ui-button ui-button--ghost file-btn">
            上传图片
            <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={onImageUpload} />
          </label>
          <label className="ui-button ui-button--ghost file-btn">
            上传视频
            <input type="file" accept="video/mp4,video/webm,video/quicktime,.mov" onChange={onVideoUpload} />
          </label>
          <Button variant="danger" onClick={clearMedia}>
            清空媒体
          </Button>
        </div>
      </div>

      {error ? <p className="field-error">{error}</p> : null}
      {warning ? <p className="field-warning">{warning}</p> : null}
      <MediaFrame media={media} emptyText="待添加图片或视频" variant="editor" />
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

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = Number(video.duration);
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(Number.NaN);
    };
    video.src = url;
  });
}
