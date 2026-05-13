const EXAMPLES = [
  { id: 'morning', icon: '🌤️', name: '晨间陪伴', desc: '起床、早餐、窗边晒太阳，适合清晨互动', nodes: 6, edges: 8 },
  { id: 'afternoon', icon: '🛋️', name: '午后相守', desc: '陪伴、玩耍、小睡，适合居家安静时段', nodes: 6, edges: 8 },
  { id: 'evening', icon: '🚪', name: '晚归欢迎', desc: '门口等待与重逢，适合温馨收尾', nodes: 3, edges: 2 },
  { id: 'full', icon: '🐾', name: '陪伴的一天（完整）', desc: '更自然的宠物日常模板，保留温柔分支', nodes: 10, edges: 14 },
];

const FULL_STORY = {
  name: '陪伴的一天',
  startNode: 'morning_wake',
  variables: { energy: 70, mood: 75, fullness: 55 },
  nodes: {
    morning_wake: {
      scene: 'bg-bedroom',
      title: '清晨 · 床边醒来',
      text: '天刚亮，房间里还安安静静的。小家伙先醒了，轻轻踩到床边，用鼻尖碰了碰你的手背，像是在提醒你：新的一天可以慢一点开始。\n\n窗帘缝里透进来的光不刺眼，它只是安静地看着你，尾巴偶尔轻轻扫过床单。',
      overlays: [
        { type: 'label', text: '早安，小家伙', x: '5%', y: '8%', delay: 1 },
        { type: 'data', text: '07:18 AM | 房间安静', x: '66%', y: '8%', delay: 2 },
      ],
      choices: [
        { text: '起身去准备早餐', next: 'breakfast_together', effects: { fullness: 10, mood: 5 } },
        { text: '先坐下来摸摸它', next: 'slow_morning', effects: { mood: 10 } },
        { text: '拉开窗帘，一起看看外面', next: 'window_sun', effects: { energy: 5, mood: 5 } },
      ],
      defaultChoice: 1,
      timer: 12,
    },
    breakfast_together: {
      scene: 'bg-kitchen',
      title: '早餐时间 · 厨房的小脚步',
      text: '你刚走进厨房，它就跟了过来，爪子落在地面上发出很轻的声音。倒水、准备食物、把小碗摆好，这些平常的动作，因为它在脚边绕来绕去，忽然显得很有生活感。\n\n它并不着急，只是时不时抬头看看你，像是在确认你真的在这里。',
      overlays: [
        { type: 'label', text: '熟悉的早餐仪式', x: '5%', y: '8%', delay: 1 },
        { type: 'data', text: '安心感 +1', x: '66%', y: '80%', delay: 2 },
      ],
      choices: [
        { text: '吃完后带它去客厅陪一会儿', next: 'livingroom_follow', effects: { fullness: 15, mood: 5 } },
        { text: '让它自己去窗边安静晒太阳', next: 'window_sun', effects: { fullness: 15, energy: 5 } },
      ],
      defaultChoice: 0,
      timer: 10,
    },
    slow_morning: {
      scene: 'bg-bedroom',
      title: '清晨 · 手心里的温度',
      text: '你重新坐回床边，它立刻把脑袋凑过来，贴在你的手心下面。没有闹腾，也没有催促，只是很熟练地把自己放进这个短短几分钟的安静里。\n\n这种时候，时间好像会自动放慢一点。',
      overlays: [
        { type: 'label', text: '先别急，陪它一会儿', x: '5%', y: '8%', delay: 1 },
      ],
      choices: [
        { text: '抱它去沙发边，陪你待一会儿', next: 'lap_time', effects: { mood: 10 } },
        { text: '带它到窗边透透气', next: 'window_sun', effects: { energy: 5, mood: 5 } },
      ],
      defaultChoice: 0,
      timer: 12,
    },
    window_sun: {
      scene: 'bg-sunbeam',
      title: '上午 · 窗边晒太阳',
      text: '窗边落下一块刚刚好的阳光。它找到最舒服的位置卧下来，先眯着眼看了看外面，再把身体缓缓展开，像是把整段上午都交给了这片暖光。\n\n偶尔有风吹动窗帘，它会抬一下耳朵，然后又安静下来。',
      overlays: [
        { type: 'label', text: '今天的阳光刚刚好', x: '5%', y: '8%', delay: 1 },
        { type: 'data', text: '放松中...', x: '66%', y: '80%', delay: 2 },
      ],
      choices: [
        { text: '拿玩具陪它活动一下', next: 'playtime', effects: { energy: -5, mood: 15 } },
        { text: '让它继续安静打个盹', next: 'noon_nap', effects: { energy: 10, mood: 5 } },
      ],
      defaultChoice: 1,
      timer: 10,
    },
    lap_time: {
      scene: 'bg-livingroom',
      title: '上午 · 膝边小憩',
      text: '你在沙发边坐下，它转了半圈，最后很自然地靠在你腿边。没有一定要你做什么，只是把呼吸放慢，把身体贴过来，像是在说：这样就够了。\n\n你低头的时候，正好能看见它安心闭眼的样子。',
      overlays: [
        { type: 'label', text: '靠近一点就很好', x: '5%', y: '8%', delay: 1 },
      ],
      choices: [
        { text: '陪它玩一会儿，再继续今天', next: 'playtime', effects: { mood: 10 } },
        { text: '就这样安静待到中午', next: 'noon_nap', effects: { energy: 10, mood: 10 } },
      ],
      defaultChoice: 1,
      timer: 10,
    },
    livingroom_follow: {
      scene: 'bg-livingroom',
      title: '上午 · 客厅里的跟随',
      text: '你从厨房走到客厅，它也不远不近地跟着。你停下来整理东西，它就停在旁边；你坐下，它也找个位置趴好。整个空间因为这一点点跟随感，变得没那么空。\n\n它并不需要太多安排，只想知道你在附近。',
      overlays: [
        { type: 'label', text: '它在陪着你', x: '5%', y: '8%', delay: 1 },
        { type: 'data', text: '步子很轻', x: '68%', y: '80%', delay: 2 },
      ],
      choices: [
        { text: '拿出玩具，陪它短短玩一局', next: 'playtime', effects: { energy: -10, mood: 15 } },
        { text: '给它留个舒服位置，让它休息', next: 'noon_nap', effects: { energy: 5, mood: 5 } },
      ],
      defaultChoice: 1,
      timer: 10,
    },
    playtime: {
      scene: 'bg-livingroom',
      title: '午前 · 认真玩耍一下',
      text: '玩具刚一拿出来，它的目光就跟上了。扑、追、停住、回头再看你，动作不算夸张，却很专注。你也跟着放慢了节奏，只做眼前这一件小事。\n\n玩到后面，它明显有点累了，但还是会抬头等你下一次把玩具递过去。',
      overlays: [
        { type: 'label', text: '短短玩一会儿', x: '5%', y: '8%', delay: 1 },
        { type: 'data', text: '心情升温', x: '66%', y: '80%', delay: 2 },
      ],
      choices: [
        { text: '玩累了，让它去阳光里休息', next: 'noon_nap', effects: { energy: -10, mood: 10 } },
        { text: '你先去忙，晚些再回来陪它', next: 'evening_wait', effects: { mood: 5 } },
      ],
      defaultChoice: 0,
      timer: 10,
    },
    noon_nap: {
      scene: 'bg-sunbeam',
      title: '午后 · 阳光里的小睡',
      text: '忙碌慢慢退到一边，它也终于找到了最满意的位置。肚皮随着呼吸轻轻起伏，耳朵偶尔动一下，像是在梦里也还留着一点对你的注意。\n\n你抬头看它一眼，就会觉得这一天没有那么急。',
      overlays: [
        { type: 'label', text: '安静午睡中', x: '5%', y: '8%', delay: 1 },
        { type: 'data', text: '呼吸平稳', x: '68%', y: '80%', delay: 2 },
      ],
      choices: [
        { text: '等你忙完，一起去门口看看傍晚', next: 'evening_wait', effects: { energy: 20, mood: 5 } },
        { text: '不折腾了，就这样慢慢待到晚上', next: 'ending_sleep_together', effects: { energy: 10, mood: 15 } },
      ],
      defaultChoice: 1,
      timer: 12,
    },
    evening_wait: {
      scene: 'bg-door',
      title: '傍晚 · 门边等你',
      text: '傍晚的时候，它会比平时更留意门口的动静。你从外面的忙碌里抽身回来，或者只是从另一个房间走过来，它都能很快察觉。\n\n门一响、脚步一近，它就起身站好，像是把一天里最重要的那一小段重逢，安安静静地留到了现在。',
      overlays: [
        { type: 'label', text: '它在等你', x: '5%', y: '8%', delay: 1 },
        { type: 'data', text: '傍晚 18:42', x: '70%', y: '8%', delay: 2 },
      ],
      choices: [
        { text: '一见面就蹲下来抱抱它', next: 'ending_door_welcome', effects: { mood: 20 } },
        { text: '先坐下来，让它自己慢慢靠过来', next: 'ending_quiet_company', effects: { mood: 15, energy: 5 } },
      ],
      defaultChoice: 0,
      timer: 10,
    },
    ending_door_welcome: {
      scene: 'bg-ending',
      ending: true,
      endingType: 'warm',
      title: '结局：门口的小欢迎',
      text: '你刚蹲下，它就凑了过来，贴着你的腿绕了半圈，又把脑袋轻轻靠上来。没有夸张的动作，可那种被认真等着的感觉，会让人一下子松下来。\n\n原来一天最温柔的部分，真的可以只是门口这一小会儿。',
      overlays: [],
    },
    ending_quiet_company: {
      scene: 'bg-ending',
      ending: true,
      endingType: 'touching',
      title: '结局：安静地靠在一起',
      text: '你没有急着说话，只是在沙发边坐下。它看了你一会儿，慢慢走过来，最后把身体靠在你脚边，像是替这一天补上一个很轻的句号。\n\n什么都不用特别安排，陪着彼此，本身就已经很好。',
      overlays: [],
    },
    ending_sleep_together: {
      scene: 'bg-ending',
      ending: true,
      endingType: 'chill',
      title: '结局：把今天过慢一点',
      text: '傍晚的光线一点点变暗，它还在原来的位置睡着，你也没有去打扰。偶尔抬头看一眼，确认它还安稳地在那儿，心里就会跟着静下来。\n\n不是每一天都要热闹，能这样平平稳稳地一起待着，也很珍贵。',
      overlays: [],
    },
  },
  treeOrder: [
    'morning_wake',
    'breakfast_together',
    'slow_morning',
    'window_sun',
    'lap_time',
    'livingroom_follow',
    'playtime',
    'noon_nap',
    'evening_wait',
    'ending_door_welcome',
    'ending_quiet_company',
    'ending_sleep_together',
  ],
  treeLabels: {
    morning_wake: '床边醒来',
    breakfast_together: '早餐时间',
    slow_morning: '轻轻摸摸它',
    window_sun: '窗边晒太阳',
    lap_time: '膝边小憩',
    livingroom_follow: '客厅跟随',
    playtime: '短暂玩耍',
    noon_nap: '午后小睡',
    evening_wait: '门边等你',
    ending_door_welcome: '* 门口欢迎',
    ending_quiet_company: '* 安静相守',
    ending_sleep_together: '* 慢慢到晚上',
  },
};

function cloneStory(data) {
  return JSON.parse(JSON.stringify(data));
}

function pickTreeLabels(full, ids) {
  const labels = {};
  ids.forEach((id) => {
    if (full.treeLabels[id]) labels[id] = full.treeLabels[id];
  });
  return labels;
}

function buildTemplate(config) {
  const full = FULL_STORY;
  const nodes = {};
  config.nodeIds.forEach((id) => {
    nodes[id] = cloneStory(full.nodes[id]);
  });
  return {
    name: config.name,
    startNode: config.startNode,
    variables: { ...config.variables },
    nodes,
    treeOrder: [...config.nodeIds],
    treeLabels: pickTreeLabels(full, config.nodeIds),
  };
}

function getDefaultStory() {
  return cloneStory(FULL_STORY);
}

function getExampleStory(id) {
  if (id === 'morning') {
    return buildTemplate({
      name: '晨间陪伴',
      startNode: 'morning_wake',
      variables: { energy: 70, mood: 75, fullness: 50 },
      nodeIds: [
        'morning_wake',
        'breakfast_together',
        'slow_morning',
        'window_sun',
        'noon_nap',
        'ending_sleep_together',
      ],
    });
  }

  if (id === 'afternoon') {
    return buildTemplate({
      name: '午后相守',
      startNode: 'lap_time',
      variables: { energy: 65, mood: 80, fullness: 60 },
      nodeIds: [
        'lap_time',
        'livingroom_follow',
        'playtime',
        'noon_nap',
        'evening_wait',
        'ending_quiet_company',
      ],
    });
  }

  if (id === 'evening') {
    return buildTemplate({
      name: '晚归欢迎',
      startNode: 'evening_wait',
      variables: { energy: 55, mood: 85, fullness: 60 },
      nodeIds: [
        'evening_wait',
        'ending_door_welcome',
        'ending_quiet_company',
      ],
    });
  }

  return getDefaultStory();
}

window.EXAMPLES = EXAMPLES;
window.getDefaultStory = getDefaultStory;
window.getExampleStory = getExampleStory;
