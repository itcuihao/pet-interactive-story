import type { StoryDocument, StoryScene } from "@/types";

const AI_BASE_URL_KEY = "pet-memory-ai-base-url";
const AI_MODEL_KEY = "pet-memory-ai-model";
const AI_API_KEY_KEY = "pet-memory-ai-api-key";

export const AI_PRESETS = [
  { name: "DeepSeek", baseUrl: "https://api.deepseek.com", model: "deepseek-chat" },
  { name: "GLM", baseUrl: "https://open.bigmodel.cn/api/paas", model: "glm-4-flash" },
  { name: "MiniMax", baseUrl: "https://api.minimaxi.com", model: "MiniMax-M2.7" },
];

export function getAiBaseUrl(): string {
  return localStorage.getItem(AI_BASE_URL_KEY) || "";
}

export function setAiBaseUrl(url: string): void {
  if (url.trim()) localStorage.setItem(AI_BASE_URL_KEY, url.trim());
  else localStorage.removeItem(AI_BASE_URL_KEY);
}

export function getAiModel(): string {
  return localStorage.getItem(AI_MODEL_KEY) || "";
}

export function setAiModel(model: string): void {
  if (model.trim()) localStorage.setItem(AI_MODEL_KEY, model.trim());
  else localStorage.removeItem(AI_MODEL_KEY);
}

export function getAiApiKey(): string {
  return localStorage.getItem(AI_API_KEY_KEY) || "";
}

export function setAiApiKey(key: string): void {
  if (key.trim()) localStorage.setItem(AI_API_KEY_KEY, key.trim());
  else localStorage.removeItem(AI_API_KEY_KEY);
}

export function isAiConfigured(): boolean {
  return getAiApiKey().length > 0 && getAiBaseUrl().length > 0 && getAiModel().length > 0;
}

async function chat(systemPrompt: string, userPrompt: string): Promise<string> {
  const baseUrl = getAiBaseUrl().replace(/\/+$/, "");
  const model = getAiModel();
  const apiKey = getAiApiKey();

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI 请求失败 (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI 返回了空内容");
  return content.trim();
}

/* ── Public API ─────────────────────────── */

export async function polishTitle(petName: string, current: string): Promise<string> {
  return chat(
    "你是一个温柔的宠物故事标题创作者。根据用户给出的宠物名和原标题，生成一个更温暖、更有画面感的标题。只输出标题本身，不要加引号或解释。标题不超过15个字。",
    `宠物名：${petName}\n原标题：${current || "（无）"}`,
  );
}

export async function polishSummary(petName: string, title: string, current: string): Promise<string> {
  return chat(
    "你是一个温暖的宠物故事作者。根据宠物名、标题和现有摘要，写一句更生动的一句话摘要。只输出摘要本身，不要加引号或解释。摘要不超过40个字。",
    `宠物名：${petName}\n标题：${title}\n现有摘要：${current || "（无）"}`,
  );
}

export async function polishSceneTitle(storyTitle: string, current: string, sceneText: string): Promise<string> {
  return chat(
    "你是一个宠物故事编辑。根据故事标题和片段内容，给这个片段起一个简短有画面感的标题。只输出标题，不超过8个字。",
    `故事标题：${storyTitle}\n片段内容：${sceneText.slice(0, 200)}\n当前标题：${current || "（无）"}`,
  );
}

export async function polishSceneText(storyTitle: string, sceneTitle: string, current: string): Promise<string> {
  return chat(
    "你是一个温暖的宠物故事作者。润色这个片段的文案，让语言更生动、更有画面感，适合配合图片阅读。保留原始情感和关键信息，不要改变故事走向。只输出润色后的文案。",
    `故事标题：${storyTitle}\n片段标题：${sceneTitle}\n当前文案：${current}`,
  );
}

export async function generateStoryFromIdea(idea: string): Promise<{ title: string; summary: string; petName: string; scenes: Array<{ title: string; text: string }> }> {
  const raw = await chat(
    `你是一个宠物故事创作者。用户会给你一个想法，你帮 TA 生成一个完整的宠物回忆故事框架。
输出纯 JSON，不要 markdown 代码块，格式如下：
{"title":"故事标题","summary":"一句话摘要","petName":"宠物名","scenes":[{"title":"片段标题","text":"片段文案"}]}
故事包含 4-6 个片段，片段之间线性连接。语气温和、有画面感。每个片段文案 30-80 字。`,
    idea,
  );

  const clean = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  return JSON.parse(clean);
}
