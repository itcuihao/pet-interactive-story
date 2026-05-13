import type { StoryDocument, StoryScene, StoryTemplate } from "../types";

const createChoice = (label: string, nextSceneId: string, coverText?: string) => ({
  id: crypto.randomUUID(),
  label,
  nextSceneId,
  coverText,
});

const templates: StoryTemplate[] = [
  {
    id: "morning-companion",
    name: "晨间陪伴",
    description: "从床边醒来到早餐，再到窗边晒太阳。",
    accent: "gold",
    story: {
      title: "慢慢开始的一天",
      petName: "小家伙",
      summary: "把醒来、早餐和晨光都留在今天。",
      mode: "template",
      templateId: "morning-companion",
      templateName: "晨间陪伴",
      startSceneId: "wake-up",
      cover: undefined,
      scenes: [
        {
          id: "wake-up",
          title: "床边醒来",
          text: "它先醒了，没有吵你，只是轻轻蹭了蹭你的手。",
          background: "卧室清晨",
          layout: "choice-gate",
          choices: [
            createChoice("先摸摸它", "soft-pat", "把清晨留得更慢一点"),
            createChoice("起身去准备早餐", "breakfast", "从熟悉的小脚步开始"),
          ],
        },
        {
          id: "soft-pat",
          title: "手心里的温度",
          text: "掌心落在它头顶，它顺势靠过来，呼吸都慢了下来。",
          background: "安静陪伴",
          choices: [createChoice("一起去窗边看看", "window")],
        },
        {
          id: "breakfast",
          title: "厨房的小脚步",
          text: "你走进厨房，它就慢悠悠跟在后面，像很懂这套熟悉的流程。",
          background: "早餐时间",
          choices: [createChoice("吃完去晒太阳", "window")],
        },
        {
          id: "window",
          title: "窗边晒太阳",
          text: "晨光刚好落在它身上，它找了个最舒服的位置卧下来。",
          background: "晨光窗台",
          choices: [createChoice("就这样慢慢待到中午", "ending")],
        },
        {
          id: "ending",
          title: "清晨就很好",
          text: "有些回忆不需要很热闹，能安安静静一起开始一天，就已经很珍贵。",
          background: "柔和收束",
          choices: [],
          ending: true,
        },
      ],
    },
  },
  {
    id: "afternoon-together",
    name: "午后相守",
    description: "沙发边小憩、玩一会儿，再慢慢睡着。",
    accent: "rose",
    story: {
      title: "午后的陪伴",
      petName: "小家伙",
      summary: "一些不需要赶时间的温柔片段。",
      mode: "template",
      templateId: "afternoon-together",
      templateName: "午后相守",
      startSceneId: "lap",
      cover: undefined,
      scenes: [
        {
          id: "lap",
          title: "膝边小憩",
          text: "你刚坐下，它就自然地靠到腿边，像在说这样就够了。",
          background: "客厅安静",
          layout: "choice-gate",
          choices: [
            createChoice("拿出玩具陪它一会儿", "play", "留一点轻轻的互动"),
            createChoice("让它继续安静休息", "nap", "把午后过得再慢一点"),
          ],
        },
        {
          id: "play",
          title: "认真玩一会儿",
          text: "玩具轻轻一晃，它的目光就立刻跟上来，动作专注又克制。",
          background: "短暂玩耍",
          choices: [createChoice("玩累了就休息", "nap")],
        },
        {
          id: "nap",
          title: "阳光里的小睡",
          text: "忙碌退到一边，它也终于找到最满意的位置睡着了。",
          background: "午后阳光",
          choices: [createChoice("把这一刻保存下来", "ending")],
        },
        {
          id: "ending",
          title: "今天不必太快",
          text: "你抬头看它一眼，就会觉得这一天没有那么急。",
          background: "午后收尾",
          choices: [],
          ending: true,
        },
      ],
    },
  },
  {
    id: "welcome-home",
    name: "回家欢迎",
    description: "傍晚守候、门边重逢，把最温柔的一刻放在结尾。",
    accent: "orange",
    story: {
      title: "门口的小欢迎",
      petName: "小家伙",
      summary: "最让人放松的，常常就是回来的那一刻。",
      mode: "template",
      templateId: "welcome-home",
      templateName: "回家欢迎",
      startSceneId: "wait",
      cover: undefined,
      scenes: [
        {
          id: "wait",
          title: "门边等你",
          text: "傍晚的时候，它会比平时更留意门口的动静。",
          background: "傍晚门厅",
          layout: "choice-gate",
          choices: [
            createChoice("一见面就蹲下来抱抱它", "hug", "把重逢留得更热一点"),
            createChoice("先坐下，让它自己靠过来", "quiet", "让它按自己的节奏靠近"),
          ],
        },
        {
          id: "hug",
          title: "蹭过来的瞬间",
          text: "你刚蹲下，它就贴着你转了半圈，把一天的想念都靠了过来。",
          background: "温暖重逢",
          choices: [],
          ending: true,
        },
        {
          id: "quiet",
          title: "安静地靠在一起",
          text: "你没有急着说话，它慢慢走过来，最后安稳地靠在你脚边。",
          background: "平静相守",
          choices: [],
          ending: true,
        },
      ],
    },
  },
  {
    id: "walk-or-window",
    name: "一起散步 / 窗边发呆",
    description: "记录外出或宅家发呆的慢节奏片段。",
    accent: "teal",
    story: {
      title: "今天的风很轻",
      petName: "小家伙",
      summary: "不管是出门还是待着，今天都值得留一页。",
      mode: "template",
      templateId: "walk-or-window",
      templateName: "一起散步 / 窗边发呆",
      startSceneId: "start",
      cover: undefined,
      scenes: [
        {
          id: "start",
          title: "今天想怎么过",
          text: "有时候是一起出门，有时候只是待在窗边，各有各的好。",
          background: "自由片刻",
          layout: "choice-gate",
          choices: [
            createChoice("带它出去散散步", "walk", "去外面吹一点风"),
            createChoice("就在窗边发会儿呆", "window", "把安静的片刻留住"),
          ],
        },
        {
          id: "walk",
          title: "出去走走",
          text: "步子不快，风也不急，它一边走一边回头确认你还在旁边。",
          background: "轻松散步",
          choices: [createChoice("回家慢慢休息", "ending")],
        },
        {
          id: "window",
          title: "窗边发呆",
          text: "外面很安静，它也只是看着，偶尔抬一下耳朵，又重新放松下来。",
          background: "窗边安静",
          choices: [createChoice("把这份安静留住", "ending")],
        },
        {
          id: "ending",
          title: "普通的一天也很好",
          text: "不是每一天都需要特别热闹，平平稳稳地一起待着，也值得被记住。",
          background: "轻柔收尾",
          choices: [],
          ending: true,
        },
      ],
    },
  },
  {
    id: "goodnight",
    name: "晚安陪睡",
    description: "晚上的灯光、靠近的呼吸，还有慢慢睡着的陪伴。",
    accent: "violet",
    story: {
      title: "把今天过慢一点",
      petName: "小家伙",
      summary: "睡前短短几分钟，也能变成以后反复回看的回忆。",
      mode: "template",
      templateId: "goodnight",
      templateName: "晚安陪睡",
      startSceneId: "night",
      cover: undefined,
      scenes: [
        {
          id: "night",
          title: "灯光变暗的时候",
          text: "房间慢慢安静下来，它知道你今天也准备休息了。",
          background: "夜晚卧室",
          layout: "choice-gate",
          choices: [
            createChoice("让它靠在枕边", "pillow", "把呼吸留在更近的地方"),
            createChoice("让它睡在床边的小窝里", "nest", "让它安稳地陪着你"),
          ],
        },
        {
          id: "pillow",
          title: "枕边的陪伴",
          text: "它在枕边转了半圈，最后缩成一小团，呼吸慢慢变得平稳。",
          background: "枕边温度",
          choices: [],
          ending: true,
        },
        {
          id: "nest",
          title: "床边小窝",
          text: "它没有离你太远，只是在熟悉的位置安静趴下，像替今天补上一个句号。",
          background: "熟悉气味",
          choices: [],
          ending: true,
        },
      ],
    },
  },
];

export function getTemplates(): StoryTemplate[] {
  return templates.map((template) => ({
    ...template,
    story: createStoryClone(template.story),
  }));
}

export function createStoryFromTemplate(templateId: string): StoryDocument {
  const template = templates.find((entry) => entry.id === templateId) ?? templates[0];
  const now = new Date().toISOString();

  return {
    ...createStoryClone(template.story),
    id: crypto.randomUUID(),
    updatedAt: now,
  };
}

export function createBlankStory(): StoryDocument {
  const id = crypto.randomUUID();
  const firstSceneId = crypto.randomUUID();

  return {
    id,
    title: "新的温馨回忆",
    petName: "小家伙",
    summary: "把和宠物一起度过的片段温柔地留下来。",
    mode: "template",
    templateName: "空白故事",
    startSceneId: firstSceneId,
    updatedAt: new Date().toISOString(),
    scenes: [
      {
        id: firstSceneId,
        title: "开始片段",
        text: "从这里写下你们今天的故事。",
        background: "温柔开场",
        choices: [],
      },
    ],
  };
}

export function cloneStory(story: StoryDocument): StoryDocument {
  return JSON.parse(JSON.stringify(story)) as StoryDocument;
}

export function createScene(): StoryScene {
  return {
    id: crypto.randomUUID(),
    title: "新的片段",
    text: "",
    background: "",
    choices: [],
  };
}

export function normalizeStory(story: StoryDocument): StoryDocument {
  const clone = cloneStory(story);

  if (!clone.scenes.length) {
    const scene = createScene();
    clone.scenes = [scene];
    clone.startSceneId = scene.id;
  }

  const validIds = new Set(clone.scenes.map((scene) => scene.id));
  if (!validIds.has(clone.startSceneId)) {
    clone.startSceneId = clone.scenes[0].id;
  }

  clone.scenes = clone.scenes.map((scene) => ({
    ...scene,
    layout: scene.choices.length ? "choice-gate" : scene.layout === "choice-gate" ? "moment" : scene.layout ?? "moment",
    choices: scene.choices
      .filter((choice) => validIds.has(choice.nextSceneId))
      .slice(0, 2),
  }));

  clone.updatedAt = new Date().toISOString();
  return clone;
}

function createStoryClone(story: Omit<StoryDocument, "id" | "updatedAt">): Omit<StoryDocument, "id" | "updatedAt"> {
  return JSON.parse(JSON.stringify(story)) as Omit<StoryDocument, "id" | "updatedAt">;
}
