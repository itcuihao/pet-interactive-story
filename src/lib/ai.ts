import type { StoryDocument, StoryScene } from "@/types";
import { getPetById } from "./pets";

export interface AiProfile {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  apiKey: string;
}

const AI_PROFILES_KEY = "pet-memory-ai-profiles";
const ACTIVE_AI_PROFILE_ID_KEY = "pet-memory-active-ai-profile-id";

export const AI_PRESETS = [
  { name: "DeepSeek", baseUrl: "https://api.deepseek.com", model: "deepseek-chat" },
  { name: "GLM (智谱)", baseUrl: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4-flash" },
  { name: "MiniMax", baseUrl: "https://api.minimaxi.com/v1", model: "MiniMax-M2.7-highspeed" },
];

/* ── Profiles Management ─────────────────────────── */

export function getAiProfiles(): AiProfile[] {
  const stored = localStorage.getItem(AI_PROFILES_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  // Migrate old setting structure if present
  const oldUrl = localStorage.getItem("pet-memory-ai-base-url");
  const oldModel = localStorage.getItem("pet-memory-ai-model");
  const oldKey = localStorage.getItem("pet-memory-ai-api-key");
  if (oldUrl || oldModel || oldKey) {
    const defaultProfile: AiProfile = {
      id: "default",
      name: "默认配置",
      baseUrl: oldUrl || "",
      model: oldModel || "",
      apiKey: oldKey || "",
    };
    const profiles = [defaultProfile];
    localStorage.setItem(AI_PROFILES_KEY, JSON.stringify(profiles));
    localStorage.setItem(ACTIVE_AI_PROFILE_ID_KEY, "default");
    return profiles;
  }
  return [];
}

export function setAiProfiles(profiles: AiProfile[]): void {
  localStorage.setItem(AI_PROFILES_KEY, JSON.stringify(profiles));
}

export function getActiveAiProfileId(): string {
  const profiles = getAiProfiles();
  const activeId = localStorage.getItem(ACTIVE_AI_PROFILE_ID_KEY) || "";
  if (activeId && profiles.some((p) => p.id === activeId)) {
    return activeId;
  }
  if (profiles.length > 0) {
    localStorage.setItem(ACTIVE_AI_PROFILE_ID_KEY, profiles[0].id);
    return profiles[0].id;
  }
  return "";
}

export function setActiveAiProfileId(id: string): void {
  localStorage.setItem(ACTIVE_AI_PROFILE_ID_KEY, id);
}

export function getActiveAiProfile(): AiProfile | null {
  const profiles = getAiProfiles();
  const activeId = getActiveAiProfileId();
  return profiles.find((p) => p.id === activeId) || null;
}

export function getAiBaseUrl(): string {
  return getActiveAiProfile()?.baseUrl || "";
}

export function setAiBaseUrl(url: string): void {
  const profiles = getAiProfiles();
  const activeId = getActiveAiProfileId();
  if (activeId) {
    const updated = profiles.map((p) => p.id === activeId ? { ...p, baseUrl: url.trim() } : p);
    setAiProfiles(updated);
  } else {
    const newProfile: AiProfile = {
      id: crypto.randomUUID(),
      name: "默认配置",
      baseUrl: url.trim(),
      model: "",
      apiKey: "",
    };
    setAiProfiles([newProfile]);
    setActiveAiProfileId(newProfile.id);
  }
}

export function getAiModel(): string {
  return getActiveAiProfile()?.model || "";
}

export function setAiModel(model: string): void {
  const profiles = getAiProfiles();
  const activeId = getActiveAiProfileId();
  if (activeId) {
    const updated = profiles.map((p) => p.id === activeId ? { ...p, model: model.trim() } : p);
    setAiProfiles(updated);
  }
}

export function getAiApiKey(): string {
  return getActiveAiProfile()?.apiKey || "";
}

export function setAiApiKey(key: string): void {
  const profiles = getAiProfiles();
  const activeId = getActiveAiProfileId();
  if (activeId) {
    const updated = profiles.map((p) => p.id === activeId ? { ...p, apiKey: key.trim() } : p);
    setAiProfiles(updated);
  }
}

export function isAiConfigured(): boolean {
  const active = getActiveAiProfile();
  return !!(active && active.apiKey.trim() && active.baseUrl.trim() && active.model.trim());
}

/* ── Core Fetching ─────────────────────────── */

async function chat(systemPrompt: string, userPrompt: string, profileId?: string): Promise<string> {
  const profiles = getAiProfiles();
  const targetId = profileId || getActiveAiProfileId();
  const profile = profiles.find((p) => p.id === targetId) || getActiveAiProfile();

  if (!profile || !profile.apiKey || !profile.baseUrl || !profile.model) {
    throw new Error("AI 服务未配置，请在设置中完成配置");
  }

  let url = profile.baseUrl.replace(/\/+$/, "");
  const hasVersionPath = /\/v\d+$/.test(url) || url.includes("/v1/") || url.includes("/v4/");
  if (!hasVersionPath && !url.endsWith("/chat/completions")) {
    url = `${url}/v1`;
  }
  if (!url.endsWith("/chat/completions")) {
    url = `${url}/chat/completions`;
  }
  const model = profile.model;
  const apiKey = profile.apiKey;

  const res = await fetch(url, {
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
  return content.replace(/<think\b[^>]*>[\s\S]*?<\/think>/g, "").trim();
}

/* ── Helpers ─────────────────────────── */

function parseStringArray(raw: string): string[] {
  let clean = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();

  // 1. 尝试标准化数组外围结构和边界的中文引号（只替换语法边界的引号，避免误伤文本内部的中文引号如：他是个“捣蛋鬼”）
  clean = clean.replace(/^\[\s*[“‘]/, '["');
  clean = clean.replace(/[”’]\s*\]$/, '"]');
  
  // 2. 替换元素分界处的引号和逗号（例如：将 ”，“ 或 ” , “ 替换为 ", "）
  clean = clean.replace(/[”’]\s*[，,]\s*[“‘]/g, '", "');

  // 3. 如果模型返回的没有中括号，只有被中文引号包裹的逗号分界列表（如 “A”，“B”），进行补全并格式化
  if (!clean.startsWith("[") && (clean.startsWith("“") || clean.startsWith('"')) && (clean.endsWith("”") || clean.endsWith('"'))) {
    clean = "[" + clean + "]";
    clean = clean.replace(/^\[\s*[“‘]/, '["');
    clean = clean.replace(/[”’]\s*\]$/, '"]');
    clean = clean.replace(/[”’]\s*[，,]\s*[“‘]/g, '", "');
  }

  try {
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch { /* fall through */ }

  // 如果 JSON 解析依然失败，退回到按行分割并清理首尾可能残留的引号
  return raw
    .split("\n")
    .map((l) => {
      let line = l.replace(/^\d+[.、)\]]\s*/, "").trim();
      if (line.startsWith('"') && line.endsWith('"')) line = line.slice(1, -1);
      if (line.startsWith("'") && line.endsWith("'")) line = line.slice(1, -1);
      if (line.startsWith('“') && line.endsWith('”')) line = line.slice(1, -1);
      return line.trim();
    })
    .filter(Boolean);
}

/* ── Public API (Refactored) ─────────────────────────── */

export type PolishType =
  | "title"
  | "summary"
  | "sceneTitle"
  | "sceneText"
  | "sceneBackground"
  | "choiceLabel"
  | "choiceCover";

const POLISH_PROMPTS: Record<
  PolishType,
  {
    system: string;
    user: (c: Record<string, string | undefined>) => string;
  }
> = {
  title: {
    system: "你是一个温柔的宠物故事标题创作者。根据用户给出的宠物名和原标题，生成3个不同风格的标题候选，各有画面感。输出纯 JSON 字符串数组，不要 markdown 代码块，不要解释。每个标题不超过15个字。示例：[\"标题一\",\"标题二\",\"标题三\"]",
    user: (c) => `宠物名：${c.petName || "（无）"}\n原标题：${c.current || "（无）"}`,
  },
  summary: {
    system: "你是一个温暖的宠物故事作者。根据宠物名、标题和现有摘要，生成3个不同风格的一句话摘要候选。输出纯 JSON 字符串数组，不要 markdown 代码块，不要解释。每个摘要不超过40个字。",
    user: (c) => `宠物名：${c.petName || "（无）"}\n标题：${c.storyTitle || "（无）"}\n现有摘要：${c.current || "（无）"}`,
  },
  sceneTitle: {
    system: "你是一个宠物故事编辑。根据故事标题和片段内容，给这个片段起3个简短有画面感的标题候选。输出纯 JSON 字符串数组，不要 markdown 代码块，不要解释。每个标题不超过8个字。",
    user: (c) => `故事标题：${c.storyTitle || "（无）"}\n片段内容：${(c.sceneText || "").slice(0, 200)}\n当前标题：${c.current || "（无）"}`,
  },
  sceneText: {
    system: "你是一个温暖的宠物故事作者。润色这个片段的文案，生成3个不同风格的版本，让语言更生动、更有画面感，适合配合图片阅读。保留原始情感和关键信息，不要改变故事走向。输出纯 JSON 字符串数组，不要 markdown 代码块，不要解释。每个版本30-80字。",
    user: (c) => `故事标题：${c.storyTitle || "（无）"}\n片段标题：${c.sceneTitle || "（无）"}\n当前文案：${c.current || "（无）"}`,
  },
  sceneBackground: {
    system: "你是一个宠物故事画面设计师。请润色并细化当前的场景氛围描述，生成3个不同风格的画面描述候选，直接作为文生图AI（如 Stable Diffusion/Midjourney）的提示词。每个候选控制在25-45字之间。\n" +
            "【重要原则】：\n" +
            "1. 仔细分析宠物名字、故事标题和片段内容，推断该宠物的具体种类（例如猫、狗、猫咪、拉布拉多犬等）。\n" +
            "2. 在生成的提示词中，主角的称呼必须是该种类的具体代称（如“一只橘猫”、“一只黑猫”、“一只萨摩耶犬”），绝对不能混淆种类（如把猫写成狗，或把狗写成猫）。\n" +
            "3. 描述结构遵循：[画面艺术风格] + [主体动物动作与表情细节] + [环境背景] + [光影与色彩调性]。\n" +
            "4. 输出纯 JSON 字符串数组，不要 markdown 代码块，不要解释。",
    user: (c) => `宠物名字：${c.petName || "（无）"}\n故事标题：${c.storyTitle || "（无）"}\n片段标题：${c.sceneTitle || "（无）"}\n片段内容：${c.sceneText || "（无）"}\n当前场景氛围：${c.current || "（无）"}`,
  },
  choiceLabel: {
    system: "你是一个互动故事设计专家。请为当前的互动选择按钮文案进行润色，生成3个不同风格的选项文字候选。文字必须极其精炼，有代入感，引导用户点击。输出纯 JSON 字符串数组，不要 markdown 代码块，不要解释。每个候选不超过8个字。",
    user: (c) => `故事标题：${c.storyTitle || "（无）"}\n片段内容：${(c.sceneText || "").slice(0, 200)}\n当前按钮选项：${c.current || "（无）"}`,
  },
  choiceCover: {
    system: "你是一个互动故事设计专家。请为当前的互动选择按钮下方的提示小文字（副标题）进行润色，生成3个不同风格的提示词候选，用以引导或提示选项的潜在后果。输出纯 JSON 字符串数组，不要 markdown 代码块，不要解释。每个候选不超过15个字。",
    user: (c) => `故事标题：${c.storyTitle || "（无）"}\n片段内容：${(c.sceneText || "").slice(0, 200)}\n按钮选项：${c.choiceLabel || "（无）"}\n当前提示文字：${c.current || "（无）"}`,
  },
};

export async function polishContent(
  type: PolishType,
  context: Record<string, string | undefined>,
  profileId?: string,
): Promise<string[]> {
  const promptConfig = POLISH_PROMPTS[type];
  if (!promptConfig) throw new Error("未知的润色类型");

  let systemPrompt = promptConfig.system;

  // 如果传入了 petId，自动加载对应的宠物档案以进行人设定制
  if (context.petId) {
    const pet = getPetById(context.petId);
    if (pet) {
      const genderText = pet.gender === "boy" ? "男孩子" : "女孩子";
      const speciesName = pet.species === "cat" ? "猫咪" : pet.species === "dog" ? "小狗" : "宠物";

      const petPersona = `【重要宠物背景设定】：\n` +
        `- 宠物名字：${pet.name}\n` +
        `- 宠物种类/品种：${pet.breed || speciesName}\n` +
        `- 宠物性别：${genderText}\n` +
        `- 年龄阶段：${pet.ageText}\n` +
        `- 性格特征：${pet.personality || "温顺"}\n` +
        `在润色时，生成的文风、色调和叙事语调必须高度符合此宠物背景设定！\n` +
        `特别是对于画面氛围（sceneBackground），画面中主角的主体种类、动作特征必须与此种类及品种完全一致（决不能猫狗混淆），且主角称呼应使用“一只${pet.breed || speciesName}”这种品种词而非名字。\n\n`;

      systemPrompt = petPersona + systemPrompt;
    }
  }

  const userPrompt = promptConfig.user(context);

  const raw = await chat(systemPrompt, userPrompt, profileId);
  return parseStringArray(raw);
}

export async function polishTitle(petName: string, current: string, petId?: string, profileId?: string): Promise<string[]> {
  return polishContent("title", { petName, current, petId }, profileId);
}

export async function polishSummary(petName: string, title: string, current: string, petId?: string, profileId?: string): Promise<string[]> {
  return polishContent("summary", { petName, storyTitle: title, current, petId }, profileId);
}

export async function polishSceneTitle(storyTitle: string, current: string, sceneText: string, petId?: string, profileId?: string): Promise<string[]> {
  return polishContent("sceneTitle", { storyTitle, current, sceneText, petId }, profileId);
}

export async function polishSceneText(storyTitle: string, sceneTitle: string, current: string, petId?: string, profileId?: string): Promise<string[]> {
  return polishContent("sceneText", { storyTitle, sceneTitle, current, petId }, profileId);
}

export async function polishSceneBackground(
  petName: string,
  storyTitle: string,
  sceneTitle: string,
  current: string,
  sceneText: string,
  petId?: string,
  profileId?: string,
): Promise<string[]> {
  return polishContent("sceneBackground", { petName, storyTitle, sceneTitle, current, sceneText, petId }, profileId);
}

export async function polishChoiceLabel(storyTitle: string, sceneText: string, current: string, petId?: string, profileId?: string): Promise<string[]> {
  return polishContent("choiceLabel", { storyTitle, sceneText, current, petId }, profileId);
}

export async function polishChoiceCover(
  storyTitle: string,
  sceneText: string,
  choiceLabel: string,
  current: string,
  petId?: string,
  profileId?: string,
): Promise<string[]> {
  return polishContent("choiceCover", { storyTitle, sceneText, choiceLabel, current, petId }, profileId);
}

export async function generateStoryFromIdea(
  idea: string,
  profileId?: string,
): Promise<{ title: string; summary: string; petName: string; scenes: Array<{ title: string; text: string }> }> {
  const raw = await chat(
    `你是一个宠物故事创作者。用户会给你一个想法，你帮 TA 生成一个完整的宠物回忆故事框架。
    输出纯 JSON，不要 markdown 代码块，格式如下：
    {"title":"故事标题","summary":"一句话摘要","petName":"宠物名","scenes":[{"title":"片段标题","text":"片段文案"}]}
    故事包含 4-6 个片段，片段之间线性连接。语气温和、有画面感。每个片段文案 30-80 字。`,
    idea,
    profileId,
  );

  const clean = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  return JSON.parse(clean);
}
