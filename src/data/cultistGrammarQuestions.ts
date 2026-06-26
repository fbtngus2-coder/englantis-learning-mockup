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
    id: "between-two-places",
    title: "between vs near",
    mission: "두 장소 사이를 말해야 하는 문장에서 전치사 신호가 깨진 한 명을 찾으세요.",
    clue: "bank와 hospital처럼 기준 장소가 두 개이고 그 사이를 말하면 between을 씁니다.",
    focus: "between for two places",
    npcs: [
      {
        id: "a",
        label: "Candidate A",
        sentence: "He is standing between a bank and a hospital.",
        isCultist: false,
        reactionType: "femaleInnocent",
      },
      {
        id: "b",
        label: "Candidate B",
        sentence: "He is standing near a bank and a hospital.",
        isCultist: true,
        correctSentence: "He is standing between a bank and a hospital.",
        grammarPoint: "두 장소 사이를 말하므로 near가 아니라 between을 써야 합니다.",
      },
      {
        id: "c",
        label: "Candidate C",
        sentence: "The gate is between the bank and the hospital.",
        isCultist: false,
        reactionType: "maleInnocent",
      },
    ],
  },
  {
    id: "near-one-place",
    title: "near with one reference",
    mission: "한 장소 가까이에 있다는 뜻인데 between을 잘못 쓴 후보를 찾으세요.",
    clue: "기준 장소가 하나이고 가까움을 말하면 near를 씁니다.",
    focus: "near for one nearby place",
    npcs: [
      {
        id: "a",
        label: "Candidate A",
        sentence: "There is a park near Tiger's apartment.",
        isCultist: false,
        reactionType: "femaleInnocent",
      },
      {
        id: "b",
        label: "Candidate B",
        sentence: "The old bakery is near the bank.",
        isCultist: false,
        reactionType: "maleInnocent",
      },
      {
        id: "c",
        label: "Candidate C",
        sentence: "There is a park between Tiger's apartment.",
        isCultist: true,
        correctSentence: "There is a park near Tiger's apartment.",
        grammarPoint: "Tiger's apartment라는 기준 장소가 하나뿐이므로 between이 아니라 near가 자연스럽습니다.",
      },
    ],
  },
  {
    id: "on-surface",
    title: "on for touching a surface",
    mission: "표면 위에 닿아 있는 상황인데 다른 전치사를 쓴 후보를 찾으세요.",
    clue: "물건이 상자나 책상 같은 표면 위에 닿아 있으면 on을 씁니다.",
    focus: "on for surface contact",
    npcs: [
      {
        id: "a",
        label: "Candidate A",
        sentence: "The book is on the desk.",
        isCultist: false,
        reactionType: "maleInnocent",
      },
      {
        id: "b",
        label: "Candidate B",
        sentence: "My sister puts a magazine between the box.",
        isCultist: true,
        correctSentence: "My sister puts a magazine on the box.",
        grammarPoint: "magazine이 box의 표면 위에 닿아 있으므로 between이 아니라 on을 써야 합니다.",
      },
      {
        id: "c",
        label: "Candidate C",
        sentence: "The cup is on the table.",
        isCultist: false,
        reactionType: "femaleInnocent",
      },
    ],
  },
];
