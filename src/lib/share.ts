import type { StoryDocument } from "@/types";

// Helper to convert array buffer to base64url
function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Helper to convert base64url back to array buffer
function base64UrlToBuffer(base64url: string): ArrayBuffer {
  let base64 = base64url
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Compress story JSON string to base64url
export async function compressStory(story: StoryDocument): Promise<string> {
  const str = JSON.stringify(story);
  try {
    if (typeof (globalThis as any).CompressionStream !== "undefined") {
      const stream = new Blob([new TextEncoder().encode(str)]).stream();
      const compressionStream = stream.pipeThrough(new (globalThis as any).CompressionStream("gzip"));
      const response = new Response(compressionStream);
      const buffer = await response.arrayBuffer();
      return "gz_" + bufferToBase64Url(buffer);
    }
  } catch (e) {
    console.warn("CompressionStream failed, falling back to raw Base64", e);
  }
  const bytes = new TextEncoder().encode(str);
  return "raw_" + bufferToBase64Url(bytes.buffer);
}

// Decompress story base64url back to StoryDocument
export async function decompressStory(encoded: string): Promise<StoryDocument> {
  if (encoded.startsWith("gz_")) {
    const base64url = encoded.slice(3);
    const buffer = base64UrlToBuffer(base64url);
    const stream = new Blob([buffer]).stream();
    const decompressionStream = stream.pipeThrough(new (globalThis as any).DecompressionStream("gzip"));
    const response = new Response(decompressionStream);
    const text = await response.text();
    return JSON.parse(text) as StoryDocument;
  }
  if (encoded.startsWith("raw_")) {
    const base64url = encoded.slice(4);
    const buffer = base64UrlToBuffer(base64url);
    const text = new TextDecoder().decode(buffer);
    return JSON.parse(text) as StoryDocument;
  }
  // Try gz first, then raw as fallback
  try {
    const buffer = base64UrlToBuffer(encoded);
    const stream = new Blob([buffer]).stream();
    const decompressionStream = stream.pipeThrough(new (globalThis as any).DecompressionStream("gzip"));
    const response = new Response(decompressionStream);
    const text = await response.text();
    return JSON.parse(text) as StoryDocument;
  } catch {
    const buffer = base64UrlToBuffer(encoded);
    const text = new TextDecoder().decode(buffer);
    return JSON.parse(text) as StoryDocument;
  }
}

// Generate short link using clck.ru API (supports native CORS, fast & stable Yandex CDN)
export async function shortenUrl(longUrl: string): Promise<string> {
  const res = await fetch(`https://clck.ru/--?url=${encodeURIComponent(longUrl)}`);
  if (!res.ok) {
    throw new Error(`clck.ru failed: HTTP ${res.status}`);
  }
  const text = await res.text();
  const shortUrl = text.trim();
  if (!shortUrl.startsWith("http")) {
    throw new Error("clck.ru returned invalid short link");
  }
  return shortUrl;
}
