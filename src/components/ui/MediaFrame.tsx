import { useEffect, useState } from "react";
import { getMediaBlob } from "../../lib/idb";
import type { StoryMedia } from "../../types";

export type MediaFrameProps = {
  media?: StoryMedia;
  emptyText: string;
  variant: "cover" | "editor" | "preview";
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

      if (!media) {
        setResolvedSrc("");
        return;
      }

      if (media.type === "image") {
        setResolvedSrc(media.src);
        return;
      }

      const source = media.source ?? (media.mediaId ? "upload" : "url");
      if (source === "upload" && media.mediaId) {
        setLoadingUploadVideo(true);
        const blob = await getMediaBlob(media.mediaId).catch(() => undefined);
        if (!active) return;
        setLoadingUploadVideo(false);
        if (!blob) {
          setResolvedSrc("");
          setUploadVideoError("本地视频未找到，请重新上传。");
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setResolvedSrc(objectUrl);
        return;
      }

      setResolvedSrc(media.src);
    }

    void resolveSource();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [media]);

  const isEmpty = !media || !resolvedSrc;
  return (
    <div className={`media-frame media-frame--${variant}${isEmpty ? " is-empty" : ""}`}>
      {media?.type === "image" && resolvedSrc ? <img src={resolvedSrc} alt="media" /> : null}
      {media?.type === "video" && resolvedSrc ? (
        <video src={resolvedSrc} controls playsInline>
          这个视频链接暂时无法播放。
        </video>
      ) : null}
      {media?.type === "video" && loadingUploadVideo ? <span>正在读取本地视频…</span> : null}
      {media?.type === "video" && !loadingUploadVideo && uploadVideoError ? <span>{uploadVideoError}</span> : null}
      {!media ? <span>{emptyText}</span> : null}
    </div>
  );
}
