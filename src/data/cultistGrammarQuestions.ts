export type CultistNpc = {
  id: string;
  label: string;
  sentence: string;
  isCultist: boolean;
  correctSentence?: string;
  grammarPoint?: string;
  reactionType?: "maleInnocent" | "femaleInnocent";
};

export type CultistGrammarCase = {
  id: string;
  title: string;
  mission: string;
  clue: string;
  focus: string;
  npcs: CultistNpc[];
};

export const cultistGrammarCases: CultistGrammarCase[] = [
  {
    id: "present-third-person",
    title: "3인칭 현재형",
    mission: "같은 의미를 말하는 세 주민 중 문법 신호가 깨진 한 명을 찾으세요.",
    clue: "주어가 She, He, It이면 현재시제 일반동사에 -s가 필요합니다.",
    focus: "Present simple -s",
    npcs: [
      {
        id: "a",
        label: "Candidate A",
        sentence: "She likes apples.",
        isCultist: false,
        reactionType: "femaleInnocent",
      },
      {
        id: "b",
        label: "Candidate B",
        sentence: "She like apples.",
        isCultist: true,
        correctSentence: "She likes apples.",
        grammarPoint: "주어가 She일 때 현재시제 일반동사는 like가 아니라 likes처럼 -s를 붙여야 합니다.",
      },
      {
        id: "c",
        label: "Candidate C",
        sentence: "She eats lunch.",
        isCultist: false,
        reactionType: "maleInnocent",
      },
    ],
  },
  {
    id: "be-verb-match",
    title: "be동사 일치",
    mission: "문장 속 주어와 be동사가 서로 맞지 않는 후보를 찾으세요.",
    clue: "He와 She에는 is, You에는 are, I에는 am을 사용합니다.",
    focus: "Subject + be verb",
    npcs: [
      {
        id: "a",
        label: "Candidate A",
        sentence: "I am happy.",
        isCultist: false,
        reactionType: "femaleInnocent",
      },
      {
        id: "b",
        label: "Candidate B",
        sentence: "You are kind.",
        isCultist: false,
        reactionType: "maleInnocent",
      },
      {
        id: "c",
        label: "Candidate C",
        sentence: "He are tall.",
        isCultist: true,
        correctSentence: "He is tall.",
        grammarPoint: "주어가 He일 때는 are가 아니라 is를 써야 자연스럽고 정확합니다.",
      },
    ],
  },
  {
    id: "past-time-marker",
    title: "과거 시간 표현",
    mission: "yesterday, last night처럼 과거 시간이 있는 문장에서 틀린 동사를 찾으세요.",
    clue: "과거를 나타내는 말이 있으면 동사도 과거형으로 바뀌어야 합니다.",
    focus: "Past tense",
    npcs: [
      {
        id: "a",
        label: "Candidate A",
        sentence: "I played soccer yesterday.",
        isCultist: false,
        reactionType: "maleInnocent",
      },
      {
        id: "b",
        label: "Candidate B",
        sentence: "She watched TV last night.",
        isCultist: false,
        reactionType: "femaleInnocent",
      },
      {
        id: "c",
        label: "Candidate C",
        sentence: "He play soccer yesterday.",
        isCultist: true,
        correctSentence: "He played soccer yesterday.",
        grammarPoint: "yesterday가 있으므로 현재형 play가 아니라 과거형 played를 써야 합니다.",
      },
    ],
  },
];

