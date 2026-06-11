import { getMediaToken, resolveApiBase } from "./settings";

export type MediaUploadResult = {
  mediaId: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
};


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
