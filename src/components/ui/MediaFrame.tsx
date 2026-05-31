import { useEffect, useState } from "react";
import { getMediaBlob } from "@/lib/idb";
import type { StoryMedia } from "@/types";

export type MediaFrameProps = {
  media?: StoryMedia;
  emptyText: string;
  variant: "cover" | "editor" | "preview";
};

const variantStyles: Record<string, { empty: string; filled: string }> = {
  cover: {
    empty: "aspect-auto min-h-[84px]",
    filled: "aspect-[16/9] max-h-[240px]",
  },
  editor: {
    empty: "aspect-auto min-h-[84px]",
    filled: "aspect-[4/3] max-h-[280px]",
  },
  preview: {
    empty: "aspect-auto min-h-[108px]",
    filled: "aspect-[4/5]",
  },
};

export function MediaFrame({ media, emptyText, variant }: MediaFrameProps) {
  const [resolvedSrc, setResolvedSrc] = useState("");
  const [loadingUploadVideo, setLoadingUploadVideo] = useState(false);
  const [uploadVideoError, setUploadVideoError] = useState("");

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    async function resolveSource() {
      setUploadVideoError("");
      setLoadingUploadVideo(false);

      if (!media) { setResolvedSrc(""); return; }
      if (media.type === "image") { setResolvedSrc(media.src); return; }

      const source = media.source ?? (media.mediaId ? "upload" : "url");
      if (source === "upload" && media.mediaId) {
        setLoadingUploadVideo(true);
        const blob = await getMediaBlob(media.mediaId).catch(() => undefined);
        if (!active) return;
        setLoadingUploadVideo(false);
        if (!blob) { setResolvedSrc(""); setUploadVideoError("本地视频未找到，请重新上传。"); return; }
        objectUrl = URL.createObjectURL(blob);
        setResolvedSrc(objectUrl);
        return;
      }

      setResolvedSrc(media.src);
    }

    void resolveSource();
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [media]);

  const isEmpty = !media || !resolvedSrc;
  const style = variantStyles[variant] || variantStyles.editor;

  return (
    <div className={`overflow-hidden rounded-[22px] flex items-center justify-center text-muted ${
      isEmpty
        ? `${style.empty} p-4 border border-dashed border-primary/22 bg-orange-50/78 justify-start text-left leading-relaxed`
        : `${style.filled} bg-gradient-to-b from-[#f2e4d5] to-[#e6d7cb]`
    }`}>
      {media?.type === "image" && resolvedSrc ? <img src={resolvedSrc} alt="media" className="w-full h-full object-cover block" /> : null}
      {media?.type === "video" && resolvedSrc ? <video src={resolvedSrc} controls playsInline className="w-full h-full object-cover block">这个视频链接暂时无法播放。</video> : null}
      {media?.type === "video" && loadingUploadVideo ? <span className="text-muted">正在读取本地视频…</span> : null}
      {media?.type === "video" && !loadingUploadVideo && uploadVideoError ? <span className="text-destructive">{uploadVideoError}</span> : null}
      {!media ? <span className="text-muted text-sm">{emptyText}</span> : null}
    </div>
  );
}
