import { getMediaBaseUrl, getMediaToken } from "./settings";

export type MediaUploadResult = {
  mediaId: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
};

/**
 * Resolve the API base URL:
 * - If configured URL points to localhost → use directly (no CORS issue)
 * - If running on localhost dev server and URL is remote → use Vite proxy (empty string)
 * - Otherwise → use the configured URL directly
 */
function resolveApiBase(): string {
  const configured = getMediaBaseUrl();
  const isLocal = configured.includes("localhost") || configured.includes("127.0.0.1");
  if (isLocal) return configured;
  const isDev = typeof location !== "undefined" && location.hostname === "localhost";
  return isDev ? "" : configured;
}

export async function uploadToMediaHost(
  file: File,
  usage: string = "story",
): Promise<MediaUploadResult> {
  const token = getMediaToken();
  const apiBase = resolveApiBase();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("project", "interactive-video");
  formData.append("usage", usage);
  formData.append("member", "false");

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${apiBase}/api/v1/media/upload`, {
    method: "POST",
    headers,
    body: formData,
  });


  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`上传失败 (${response.status}): ${text || response.statusText}`);
  }

  const data = await response.json();

  return {
    mediaId: data.mediaId,
    publicUrl: data.publicUrl,
    mimeType: data.mimeType || file.type,
    sizeBytes: data.sizeBytes ?? file.size,
  };
}
