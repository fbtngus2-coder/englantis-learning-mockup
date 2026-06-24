export type StoryCharacter = {
  id: string;
  src: string;
  x: number;
  y: number;
  width?: number;
  scale?: number;
  opacity?: number;
  grayscale?: boolean;
  flipX?: boolean;
  zIndex?: number;
  className?: string;
};

export type StoryEffect = {
  id: string;
  src?: string;
  type?: "image" | "css-fog" | "css-glow" | "css-gradient";
  x?: number;
  y?: number;
  width?: number;
  scale?: number;
  opacity?: number;
  zIndex?: number;
  className?: string;
};

export type StoryDialogue = {
  speaker: string;
  text: string;
};

export type StoryJourneyStep = {
  id: string;
  title: string;
  subtitle: string;
  background: string;
  characters: StoryCharacter[];
  effects?: StoryEffect[];
};

export type StoryPage = {
  id: string;
  title: string;
  pageLabel: string;
  background: string;
  backgroundPosition?: string;
  overlay?: "none" | "dark" | "warm" | "fog";
  characters: StoryCharacter[];
  effects?: StoryEffect[];
  dialogues: StoryDialogue[];
  narration?: string;
  primaryAction?: {
    label: string;
    route?: string;
    event?: string;
  };
  layout?: "scene" | "journey";
  journeySteps?: StoryJourneyStep[];
};

const bg = "/assets/backgrounds";
const story = "/assets/story-intro";
const chars = `${story}/characters`;
const fx = `${story}/effects`;
const objects = `${story}/objects`;

export const storyIntroPages: StoryPage[] = [
  {
    id: "old-dictionary",
    title: "오래된 사전",
    pageLabel: "01",
    background: `${bg}/bg-library-teach-room.png`,
    backgroundPosition: "center",
    overlay: "warm",
    characters: [
      { id: "jiho", src: `${chars}/jiho-surprised.png`, x: 75, y: 71, width: 310, zIndex: 5 },
    ],
    effects: [
      { id: "dictionary-glow", src: `${fx}/fx-story-book-pedestal-glow.png`, x: 29, y: 62, width: 330, opacity: 0.82, zIndex: 2, className: "story-pulse" },
      { id: "dictionary", src: `${objects}/obj-lingua-dictionary-closed.png`, x: 29, y: 58, width: 270, zIndex: 4 },
      { id: "runes", src: `${fx}/fx-story-rune-letters-gold.png`, x: 33, y: 38, width: 250, opacity: 0.82, zIndex: 3, className: "story-float-slow" },
    ],
    dialogues: [
      { speaker: "Jiho", text: "어? 이 영어 사전... 왜 빛나고 있지?" },
      { speaker: "???", text: "...도와줘..." },
    ],
    narration: "평범한 어느 날, 오래된 영어 사전 한 권이 너를 부른다.",
  },
  {
    id: "englantis-arrival",
    title: "잉글란티스",
    pageLabel: "02",
    background: `${bg}/bg-lingua-vita-plaza-day.png`,
    backgroundPosition: "center",
    overlay: "warm",
    characters: [
      { id: "jiho", src: `${chars}/jiho-surprised-talk.png`, x: 24, y: 71, width: 310, zIndex: 5 },
      { id: "pix", src: `${chars}/pix-idle-float.png`, x: 74, y: 44, width: 205, zIndex: 6, className: "story-float" },
    ],
    effects: [
      { id: "portal", src: `${fx}/fx-story-portal-gold-swirl.png`, x: 47, y: 43, width: 520, opacity: 0.7, zIndex: 2, className: "story-spin-soft" },
      { id: "dictionary-open", src: `${objects}/obj-lingua-dictionary-open-glow.png`, x: 35, y: 70, width: 260, zIndex: 4 },
      { id: "runes", src: `${fx}/fx-story-rune-letters-gold.png`, x: 38, y: 45, width: 280, opacity: 0.75, zIndex: 4, className: "story-float-slow" },
    ],
    dialogues: [
      { speaker: "Pix", text: "드디어 왔구나!" },
      { speaker: "Jiho", text: "여긴... 어디야?" },
      { speaker: "Pix", text: "여기는 잉글란티스. 영어 소통의 힘으로 만들어진 세계야." },
    ],
    narration: "링구아 사전 속에는, 또 하나의 세계가 존재한다.",
  },
  {
    id: "silent-fog",
    title: "침묵의 안개",
    pageLabel: "03",
    background: `${bg}/bg-fog-plaza-battle-night.png`,
    backgroundPosition: "center",
    overlay: "fog",
    characters: [
      { id: "jiho", src: `${chars}/jiho-think.png`, x: 20, y: 72, width: 280, zIndex: 5 },
      { id: "pix", src: `${chars}/pix-worried.png`, x: 36, y: 48, width: 160, zIndex: 7, className: "story-float" },
      { id: "lina", src: `${chars}/lina-worried.png`, x: 67, y: 72, width: 250, opacity: 0.58, grayscale: true, zIndex: 4 },
      { id: "milo", src: `${chars}/milo-think.png`, x: 79, y: 72, width: 260, opacity: 0.5, grayscale: true, zIndex: 3 },
      { id: "fogmon", src: `${chars}/fogmon-idle.png`, x: 56, y: 48, width: 280, opacity: 0.88, zIndex: 5, className: "story-float-slow" },
    ],
    effects: [
      { id: "fog-layer", type: "css-fog", zIndex: 8, opacity: 0.8 },
      { id: "smoke", src: `${fx}/smoke-wisp-purple.png`, x: 56, y: 53, width: 560, opacity: 0.55, zIndex: 6, className: "story-float-slow" },
      { id: "lv-particles", src: `${fx}/fx-story-lv-particles-cluster.png`, x: 50, y: 30, width: 470, opacity: 0.55, zIndex: 4, className: "story-pulse" },
    ],
    dialogues: [
      { speaker: "Pix", text: "지금 잉글란티스는 침묵의 안개에 잠식되고 있어." },
      { speaker: "Pix", text: "이 세계는 Lingua Vita, 줄여서 LV라는 소통 에너지로 움직여." },
      { speaker: "Pix", text: "사람들이 영어로 소통할 때마다 LV가 생기고, 도시는 다시 빛나지." },
      { speaker: "Pix", text: "하지만 안개가 소통을 막으면서, 도시도 점점 멈추고 있어." },
    ],
    narration: "소통이 멈추자, 잉글란티스의 빛도 사라지기 시작했다.",
  },
  {
    id: "chosen-bridge",
    title: "선택받은 이유",
    pageLabel: "04",
    background: `${bg}/bg-grand-academy-hall.png`,
    backgroundPosition: "center",
    overlay: "dark",
    characters: [
      { id: "aureon", src: `${chars}/aureon-welcome.png`, x: 20, y: 70, width: 290, opacity: 0.52, zIndex: 3 },
      { id: "lexi", src: `${chars}/dr-lexi-neutral.png`, x: 82, y: 70, width: 270, opacity: 0.52, flipX: true, zIndex: 3 },
      { id: "jiho", src: `${chars}/jiho-ready.png`, x: 48, y: 72, width: 310, zIndex: 6 },
      { id: "pix", src: `${chars}/pix-guide-point.png`, x: 65, y: 38, width: 190, zIndex: 7, className: "story-float" },
    ],
    effects: [
      { id: "lv-particles", src: `${fx}/fx-story-lv-particles-cluster.png`, x: 51, y: 38, width: 540, opacity: 0.6, zIndex: 4, className: "story-pulse" },
      { id: "sparkle", src: `${fx}/sparkle-cluster-gold.png`, x: 50, y: 55, width: 460, opacity: 0.6, zIndex: 5, className: "story-float-slow" },
    ],
    dialogues: [
      { speaker: "Pix", text: "Master들은 아직 버티고 있어. 하지만 안개 때문에 주민들에게 직접 가르칠 수는 없어." },
      { speaker: "Pix", text: "안개는 잉글란티스의 존재들에게만 강하게 작용하거든." },
      { speaker: "Pix", text: "하지만 너는 현실 세계에서 온 아이야." },
      { speaker: "Pix", text: "링구아 사전은 영어를 완벽히 아는 사람이 아니라, 배우려는 마음이 있는 너를 선택했어." },
      { speaker: "Pix", text: "너만이 배우고, 전하고, 다시 소통을 되살릴 수 있어." },
    ],
    narration: "주인공은 Master의 가르침을 NPC에게 전달할 수 있는 유일한 다리다.",
  },
  {
    id: "watch-do-teach",
    title: "너의 여정",
    pageLabel: "05",
    background: `${bg}/bg-grand-academy-hall.png`,
    backgroundPosition: "center",
    overlay: "dark",
    layout: "journey",
    characters: [],
    journeySteps: [
      {
        id: "watch",
        title: "WATCH",
        subtitle: "Master에게 오늘의 영어를 배운다",
        background: `${bg}/bg-master-study-room.png`,
        characters: [
          { id: "aureon", src: `${chars}/aureon-teach.png`, x: 28, y: 48, width: 170, zIndex: 3 },
          { id: "jiho", src: `${chars}/jiho-think.png`, x: 70, y: 52, width: 150, zIndex: 4 },
        ],
      },
      {
        id: "do",
        title: "DO",
        subtitle: "직접 사용하며 안개를 걷어낸다",
        background: `${bg}/bg-fog-battle-street-night.png`,
        characters: [
          { id: "jiho", src: `${chars}/jiho-ready.png`, x: 30, y: 52, width: 155, zIndex: 4 },
          { id: "fogmon", src: `${chars}/fogmon-idle.png`, x: 70, y: 48, width: 150, zIndex: 4 },
        ],
        effects: [
          { id: "impact", src: `${fx}/impact-dust-gray.png`, x: 70, y: 70, width: 240, opacity: 0.8, zIndex: 3 },
          { id: "comet", src: `${fx}/sparkle-comet-gold.png`, x: 48, y: 48, width: 260, opacity: 0.8, zIndex: 5 },
        ],
      },
      {
        id: "teach",
        title: "TEACH",
        subtitle: "말을 잃은 주민에게 다시 알려준다",
        background: `${bg}/bg-library-teach-room.png`,
        characters: [
          { id: "jiho", src: `${chars}/jiho-point.png`, x: 29, y: 52, width: 155, zIndex: 4 },
          { id: "lina", src: `${chars}/lina-worried.png`, x: 67, y: 52, width: 160, opacity: 0.64, grayscale: true, zIndex: 3 },
          { id: "pix", src: `${chars}/pix-hint.png`, x: 82, y: 30, width: 85, zIndex: 5 },
        ],
        effects: [
          { id: "sparkle", src: `${fx}/sparkle-cluster-gold.png`, x: 68, y: 48, width: 230, opacity: 0.5, zIndex: 4 },
        ],
      },
    ],
    dialogues: [
      { speaker: "Pix", text: "너의 여정은 세 단계로 이루어져 있어." },
      { speaker: "Pix", text: "먼저 Watch. Master에게 오늘의 영어를 배워." },
      { speaker: "Pix", text: "다음은 Do. 직접 사용하며 안개를 걷어내." },
      { speaker: "Pix", text: "마지막은 Teach. 말을 잃은 주민들에게 다시 가르쳐줘." },
      { speaker: "Pix", text: "배우고, 해보고, 가르칠 때 그 영어는 진짜 네 것이 돼." },
    ],
    narration: "Watch → Do → Teach. 이것이 잉글란티스를 구하는 방법이다.",
  },
  {
    id: "first-quest",
    title: "첫 번째 퀘스트",
    pageLabel: "06",
    background: `${bg}/bg-grand-academy-hall.png`,
    backgroundPosition: "center",
    overlay: "warm",
    characters: [
      { id: "aureon", src: `${chars}/aureon-welcome.png`, x: 20, y: 70, width: 280, opacity: 0.55, zIndex: 3 },
      { id: "lexi", src: `${chars}/dr-lexi-praise.png`, x: 80, y: 70, width: 270, opacity: 0.6, flipX: true, zIndex: 3 },
      { id: "jiho", src: `${chars}/jiho-ready-fist.png`, x: 48, y: 72, width: 320, zIndex: 7 },
      { id: "pix", src: `${chars}/pix-flying-dash.png`, x: 67, y: 40, width: 175, zIndex: 8, className: "story-float" },
    ],
    effects: [
      { id: "door-light", src: `${fx}/fx-story-door-light-gold.png`, x: 50, y: 47, width: 620, opacity: 0.85, zIndex: 4, className: "story-pulse" },
      { id: "lv-particles", src: `${fx}/fx-story-lv-particles-cluster.png`, x: 50, y: 42, width: 620, opacity: 0.76, zIndex: 5, className: "story-float-slow" },
    ],
    dialogues: [
      { speaker: "Pix", text: "이제 시작이야." },
      { speaker: "Pix", text: "Master에게 배우고, 안개를 걷어내고, 잉글란티스의 빛을 되찾자!" },
      { speaker: "Pix", text: "준비됐지? 첫 번째 퀘스트가 너를 기다리고 있어!" },
    ],
    narration: "영어를 배우는 아이에서, 잉글란티스를 구하는 주인공으로.",
    primaryAction: { label: "첫 번째 퀘스트 시작", route: "course-select" },
  },
];

export const STORY_INTRO_STORAGE_KEY = "englantis_story_intro_viewed";
