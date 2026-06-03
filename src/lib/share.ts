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
  console.log(`[Share Debug] 开始压缩故事。故事ID: ${story.id}, 标题: "${story.title}", 原始JSON大小: ${str.length} 字节`);
  try {
    if (typeof (globalThis as any).CompressionStream !== "undefined") {
      const stream = new Blob([new TextEncoder().encode(str)]).stream();
      const compressionStream = stream.pipeThrough(new (globalThis as any).CompressionStream("gzip"));
      const response = new Response(compressionStream);
      const buffer = await response.arrayBuffer();
      const result = "gz_" + bufferToBase64Url(buffer);
      console.log(`[Share Debug] Gzip 压缩成功。压缩后 Base64 长度: ${result.length} 字节 (缩减比: ${((1 - result.length / str.length) * 100).toFixed(1)}%)`);
      return result;
    }
  } catch (e) {
    console.warn("[Share Debug] Gzip CompressionStream 压缩失败，将退回到原始 Base64 编码方式", e);
  }
  const bytes = new TextEncoder().encode(str);
  const result = "raw_" + bufferToBase64Url(bytes.buffer);
  console.log(`[Share Debug] 原始 Base64 编码完成。大小: ${result.length} 字节`);
  return result;
}

// Decompress story base64url back to StoryDocument
export async function decompressStory(encoded: string): Promise<StoryDocument> {
  console.log(`[Share Debug] 开始解密/解压分享数据。编码长度: ${encoded.length} 字符, 前缀: "${encoded.slice(0, 10)}..."`);
  if (encoded.startsWith("gz_")) {
    const base64url = encoded.slice(3);
    console.log("[Share Debug] 检测到 'gz_' 前缀，正在执行 Gzip 流解压...");
    const buffer = base64UrlToBuffer(base64url);
    const stream = new Blob([buffer]).stream();
    const decompressionStream = stream.pipeThrough(new (globalThis as any).DecompressionStream("gzip"));
    const response = new Response(decompressionStream);
    const text = await response.text();
    const decoded = JSON.parse(text) as StoryDocument;
    console.log(`[Share Debug] Gzip 解压成功！解析故事标题: "${decoded.title}", 场景数: ${decoded.scenes?.length || 0}`);
    return decoded;
  }
  if (encoded.startsWith("raw_")) {
    const base64url = encoded.slice(4);
    console.log("[Share Debug] 检测到 'raw_' 前缀，正在执行 Base64 原始解码...");
    const buffer = base64UrlToBuffer(base64url);
    const text = new TextDecoder().decode(buffer);
    const decoded = JSON.parse(text) as StoryDocument;
    console.log(`[Share Debug] Base64 解码成功！解析故事标题: "${decoded.title}", 场景数: ${decoded.scenes?.length || 0}`);
    return decoded;
  }
  // Try gz first, then raw as fallback
  console.warn("[Share Debug] 未检测到标准的 gz_ 或 raw_ 前缀，尝试自适应解码...");
  try {
    const buffer = base64UrlToBuffer(encoded);
    const stream = new Blob([buffer]).stream();
    const decompressionStream = stream.pipeThrough(new (globalThis as any).DecompressionStream("gzip"));
    const response = new Response(decompressionStream);
    const text = await response.text();
    const decoded = JSON.parse(text) as StoryDocument;
    console.log(`[Share Debug] 自适应 Gzip 解压成功！故事标题: "${decoded.title}"`);
    return decoded;
  } catch (e1) {
    console.log("[Share Debug] 自适应 Gzip 解压失败，尝试自适应 Base64 直接解码...", e1);
    try {
      const buffer = base64UrlToBuffer(encoded);
      const text = new TextDecoder().decode(buffer);
      const decoded = JSON.parse(text) as StoryDocument;
      console.log(`[Share Debug] 自适应 Base64 解码成功！故事标题: "${decoded.title}"`);
      return decoded;
    } catch (e2) {
      console.error("[Share Debug] 自适应解码全部失败", e2);
      throw new Error("Invalid encoded story format");
    }
  }
}

// Generate short link using clck.ru API (supports native CORS, fast & stable Yandex CDN)
export async function shortenUrl(longUrl: string): Promise<string> {
  console.log(`[Share Debug] 正在请求 clck.ru 极速缩链 API，长链接长度: ${longUrl.length} 字符`);
  const startTime = Date.now();
  try {
    const res = await fetch(`https://clck.ru/--?url=${encodeURIComponent(longUrl)}`);
    if (!res.ok) {
      throw new Error(`clck.ru API 报错: HTTP ${res.status}`);
    }
    const text = await res.text();
    const shortUrl = text.trim();
    if (!shortUrl.startsWith("http")) {
      throw new Error("clck.ru 返回的不是合法的 HTTP 链接地址");
    }
    console.log(`[Share Debug] 缩链生成成功 (耗时: ${Date.now() - startTime}ms): ${shortUrl}`);
    return shortUrl;
  } catch (err) {
    console.error(`[Share Debug] 缩链服务请求失败 (耗时: ${Date.now() - startTime}ms):`, err);
    throw err;
  }
}

