const TOKEN_KEY = "pet-memory-media-token";
const BASE_URL_KEY = "pet-memory-media-base-url";
const DEFAULT_BASE_URL = "https://firefly.petyu.top";

export function getMediaBaseUrl(): string {
  return localStorage.getItem(BASE_URL_KEY) || DEFAULT_BASE_URL;
}

export function setMediaBaseUrl(url: string): void {
  if (url.trim()) {
    localStorage.setItem(BASE_URL_KEY, url.trim());
  } else {
    localStorage.removeItem(BASE_URL_KEY);
  }
}

export function getMediaToken(): string {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setMediaToken(token: string): void {
  if (token.trim()) {
    localStorage.setItem(TOKEN_KEY, token.trim());
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function isMediaHostConfigured(): boolean {
  return true; // 默认开启图床支持，不再强制要求配置 Token
}

/**
 * Test the media host connection by calling the upload endpoint with an empty check.
 * Uses a lightweight GET to the meta endpoint or just validates the token format.
 */
export async function testMediaConnection(): Promise<{ ok: boolean; message: string }> {
  const baseUrl = getMediaBaseUrl();
  const token = getMediaToken();

  try {
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(`${baseUrl}/api/v1/media/upload`, {
      method: "POST",
      headers,
      body: new FormData(),
    });
    // Even a 400 means the server is reachable and token was processed
    if (res.ok || res.status === 400 || res.status === 415) {
      return { ok: true, message: `已连接 ${baseUrl}` };
    }
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: "服务器可达，但 Token 无效。" };
    }
    return { ok: false, message: `服务器返回 ${res.status}` };
  } catch {
    return { ok: false, message: "无法连接到服务器，请检查地址。" };
  }
}

