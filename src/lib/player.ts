import type { StoryChoice, StoryDocument, StoryScene } from "../types";

export type StoryDecisionMap = Record<string, string>;

export function getSceneById(story: StoryDocument, sceneId: string): StoryScene | undefined {
  return story.scenes.find((scene) => scene.id === sceneId);
}

export function getLinearNextSceneId(story: StoryDocument, sceneId: string): string | undefined {
  const index = story.scenes.findIndex((scene) => scene.id === sceneId);
  if (index < 0) return undefined;
  return story.scenes[index + 1]?.id;
}

export function getVisibleSceneIds(
  story: StoryDocument,
  decisions: StoryDecisionMap,
): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  let currentId: string | undefined = story.startSceneId;

  while (currentId) {
    if (seen.has(currentId)) break;
    seen.add(currentId);
    ids.push(currentId);

    const scene = getSceneById(story, currentId);
    if (!scene) break;

    if (scene.choices.length) {
      const choiceId = decisions[scene.id];
      const choice = scene.choices.find((item) => item.id === choiceId);
      if (!choice) break;
      currentId = choice.nextSceneId;
      continue;
    }

    if (scene.ending) break;

    const nextId = getLinearNextSceneId(story, scene.id);
    if (!nextId) break;
    currentId = nextId;
  }

  return ids;
}

export function getLastBranchScene(
  story: StoryDocument,
  decisions: StoryDecisionMap,
): StoryScene | undefined {
  const ids = getVisibleSceneIds(story, decisions);
  const branchIds = ids.filter((id) => {
    const scene = getSceneById(story, id);
    return !!scene?.choices.length;
  });

  if (!branchIds.length) return undefined;
  return getSceneById(story, branchIds[branchIds.length - 1]);
}

export function getChoiceById(scene: StoryScene, choiceId?: string): StoryChoice | undefined {
  if (!choiceId) return undefined;
  return scene.choices.find((choice) => choice.id === choiceId);
}
