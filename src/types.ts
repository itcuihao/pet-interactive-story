export type StoryMode = "template" | "graph";

export type StoryMedia =
  | { type: "image"; src: string; embedded?: boolean }
  | { type: "video"; src: string };

export type StoryChoice = {
  id: string;
  label: string;
  nextSceneId: string;
  coverText?: string;
  isDefault?: boolean;
};

export type StoryScene = {
  id: string;
  title: string;
  text: string;
  background?: string;
  media?: StoryMedia;
  choices: StoryChoice[];
  ending?: boolean;
  layout?: "moment" | "choice-gate";
};

export type StoryDocument = {
  id: string;
  title: string;
  petName: string;
  summary?: string;
  cover?: StoryMedia;
  mode: StoryMode;
  templateId?: string;
  templateName?: string;
  startSceneId: string;
  scenes: StoryScene[];
  updatedAt: string;
};

export type StoryTemplate = {
  id: string;
  name: string;
  description: string;
  accent: string;
  story: Omit<StoryDocument, "id" | "updatedAt">;
};
