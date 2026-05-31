import { useEffect, useState } from "react";
import { saveMediaBlob } from "@/lib/idb";
import { uploadToMediaHost } from "@/lib/media-upload";
import { isMediaHostConfigured } from "@/lib/settings";
import type { StoryMedia } from "@/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { ChevronDown, ImageIcon, Link, X, Loader2 } from "lucide-react";

const IMAGE_MIME_ALLOW = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const VIDEO_MIME_ALLOW = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const VIDEO_MAX_BYTES = 120 * 1024 * 1024;
const VIDEO_WARN_SECONDS = 90;

export function MediaField({ label, media, onChange, hint, usage = "story" }: { label: string; media?: StoryMedia; onChange: (media?: StoryMedia) => void; hint: string; usage?: string }) {
  const [urlValue, setUrlValue] = useState(media?.source !== "upload" ? media?.src ?? "" : "");
  const [linkType, setLinkType] = useState<"image" | "video">(media?.type === "image" ? "image" : "video");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const hasMediaHost = isMediaHostConfigured();

  useEffect(() => {
    if (!media) { setUrlValue(""); setError(""); setWarning(""); return; }
    setUrlValue(media?.source !== "upload" ? media.src : "");
    setLinkType(media.type === "image" ? "image" : "video");
  }, [media]);

  async function onFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) { setError("仅支持图片（jpg/png/webp）或视频（mp4/webm/mov）。"); event.target.value = ""; return; }
    if (isImage) { await handleImageUpload(file); }
    else { await handleVideoUpload(file); }
    event.target.value = "";
  }

  async function handleImageUpload(file: File) {
    setError(""); setWarning("");
    if (!IMAGE_MIME_ALLOW.has(file.type)) { setError("图片格式仅支持 jpg/jpeg/png/webp。"); return; }
    if (file.size > IMAGE_MAX_BYTES) { setError("图片大小不能超过 10MB。"); return; }

    if (hasMediaHost) {
      setUploading(true);
      try {
        const webpFile = await convertToWebp(file);
        const result = await uploadToMediaHost(webpFile, usage);
        onChange({ type: "image", src: result.publicUrl, source: "url", mimeType: "image/webp", sizeBytes: result.sizeBytes });
        setWarning("图片已上传（webp），可直接导出分享。");
      } catch (err) { setError(err instanceof Error ? err.message : "上传失败。"); }
      finally { setUploading(false); }
    } else {
      const src = await readAsDataUrl(file);
      onChange({ type: "image", src, embedded: true, source: "upload", mimeType: file.type || undefined, sizeBytes: file.size });
      setWarning("图片已上传（本地），导出分享可直接保留。");
    }
  }

  async function handleVideoUpload(file: File) {
    setError(""); setWarning("");
    if (!VIDEO_MIME_ALLOW.has(file.type)) { setError("视频格式仅支持 mp4/webm/mov。"); return; }
    if (file.size > VIDEO_MAX_BYTES) { setError("视频大小不能超过 120MB。"); return; }

    if (hasMediaHost) {
      setUploading(true);
      try {
        const [result, durationSec] = await Promise.all([uploadToMediaHost(file, usage), readVideoDuration(file)]);
        onChange({ type: "video", src: result.publicUrl, source: "url", mimeType: result.mimeType, sizeBytes: result.sizeBytes, durationSec: Number.isFinite(durationSec) ? durationSec : undefined });
        setWarning(Number.isFinite(durationSec) && durationSec > VIDEO_WARN_SECONDS ? "视频时长超过 90 秒，弱网可能变慢。已上传，可直接导出。" : "视频已上传，可直接导出分享。");
      } catch (err) { setError(err instanceof Error ? err.message : "上传失败。"); }
      finally { setUploading(false); }
    } else {
      const durationSec = await readVideoDuration(file);
      const mediaId = await saveMediaBlob(file);
      onChange({ type: "video", src: "", source: "upload", mediaId, mimeType: file.type || undefined, sizeBytes: file.size, durationSec: Number.isFinite(durationSec) ? durationSec : undefined });
      setWarning("本地视频已上传，导出前需改成视频链接。");
    }
  }

  function applyLink() {
    setError(""); setWarning("");
    const trimmed = urlValue.trim();
    if (!trimmed) { setError("请先填入媒体链接。"); return; }
    if (!/^https:\/\//i.test(trimmed)) { setError("链接必须以 https:// 开头。"); return; }
    onChange({ type: linkType, src: trimmed, source: "url" });
    setWarning(linkType === "video" ? "视频链接已设置。" : "图片链接已设置。");
  }

  function clearMedia() { setError(""); setWarning(""); setUrlValue(""); onChange(undefined); }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <strong className="text-foreground">{label}</strong>
        {media ? (
          <Button size="sm" variant="ghost" onClick={clearMedia} disabled={uploading}>
            <X className="h-3.5 w-3.5" /> 清除
          </Button>
        ) : null}
      </div>

      {/* 上传按钮（图床模式下为主要入口） */}
      <div className={cn(
        "rounded-[18px] p-3 grid gap-2.5",
        hasMediaHost ? "bg-primary/8 border border-primary/14" : "bg-muted/40 border border-border",
      )}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {hasMediaHost ? (
            <>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
              图床已连接，上传即可分享
            </>
          ) : (
            "上传文件（本地存储）"
          )}
        </div>
        <div className="flex flex-wrap gap-2.5">
          <label className={cn(buttonVariants({ variant: "outline", size: "sm" }), "cursor-pointer gap-1.5", uploading && "opacity-50 pointer-events-none")}>
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
            {uploading ? "上传中…" : "上传文件"}
            <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/webm,video/quicktime,.mov" onChange={onFileUpload} disabled={uploading} className="hidden" />
          </label>
        </div>
      </div>

      {/* 链接输入（折叠） */}
      <button
        type="button"
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setShowLinkInput(!showLinkInput)}
      >
        <Link className="h-3 w-3" />
        {showLinkInput ? "收起链接输入" : "或者粘贴链接"}
        <ChevronDown className={cn("h-3 w-3 transition-transform", showLinkInput && "rotate-180")} />
      </button>

      {showLinkInput && (
        <div className="grid gap-2.5 p-3 rounded-[14px] bg-muted/30 border border-border">
          <div className="flex gap-1.5">
            <Button size="sm" variant={linkType === "image" ? "default" : "outline"} onClick={() => setLinkType("image")}>图片</Button>
            <Button size="sm" variant={linkType === "video" ? "default" : "outline"} onClick={() => setLinkType("video")}>视频</Button>
          </div>
          <div className="flex gap-2">
            <Input value={urlValue} placeholder="https://..." onChange={(e) => setUrlValue(e.target.value)} className="flex-1" />
            <Button size="sm" onClick={applyLink}>确认</Button>
          </div>
        </div>
      )}

      {error ? <p className="text-xs p-2 px-2.5 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive">{error}</p> : null}
      {warning ? <p className="text-xs p-2 px-2.5 rounded-lg border border-primary/12 bg-primary/5 text-accent-foreground">{warning}</p> : null}

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
    video.onloadedmetadata = () => { const d = Number(video.duration); URL.revokeObjectURL(url); resolve(d); };
    video.onerror = () => { URL.revokeObjectURL(url); resolve(Number.NaN); };
    video.src = url;
  });
}

function convertToWebp(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
          resolve(new File([blob], name, { type: "image/webp" }));
        },
        "image/webp",
        0.85,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}
