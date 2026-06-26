import type { TeachLesson } from "../lib/teachAI/teachTypes";

export const teachLessons: TeachLesson[] = [
  {
    id: "prepositions_001",
    title: "between / near / on",
    targetGrammar: "between / near / on",
    koreanMeaning: "위치 전치사",
    missionGoal: "NPC에게 장소 관계를 보고 between, near, on을 고르는 법을 가르친다.",
    unitTheme: "Magic coordinates",
    successConcept: "두 기준점 사이면 between, 한 장소 가까이면 near, 표면 위에 닿아 있으면 on을 사용한다.",
    correctExamples: [
      "He is standing between a bank and a hospital.",
      "There is a park near Tiger's apartment.",
      "My sister puts a magazine on the box.",
    ],
    keyRules: [
      "between은 두 장소나 두 대상 사이에 있을 때 쓴다.",
      "near는 한 기준점 가까이에 있을 때 쓴다.",
      "on은 물건이 표면 위에 닿아 있을 때 쓴다.",
    ],
    allowedWords: ["between", "near", "on", "bank", "hospital", "park", "apartment", "magazine", "box"],
    npc: {
      npcId: "npc_milo_001",
      npcName: "Milo",
      title: "Lost Market Guide",
      role: "teachable_npc",
      knowledgeState: {
        knows: ["near means close to one place."],
        doesNotKnow: ["between needs two reference points.", "on means touching the surface."],
        misconceptions: [
          "두 장소 사이를 말할 때도 near를 쓰면 된다고 생각한다.",
          "상자 위에 닿아 있는 물건도 between으로 말할 수 있다고 생각한다.",
        ],
        confidence: 35,
        understanding: 30,
      },
    },
    misconceptionBank: [
      {
        type: "between_vs_near",
        wrong: "He is standing near a bank and a hospital.",
        correct: "He is standing between a bank and a hospital.",
        reason: "bank와 hospital 두 장소 사이에 있으므로 near가 아니라 between을 써야 한다.",
        hint: "두 장소가 기준이면 between을 먼저 떠올려요.",
        difficulty: 1,
      },
      {
        type: "near_reference",
        wrong: "There is a park between Tiger's apartment.",
        correct: "There is a park near Tiger's apartment.",
        reason: "기준 장소가 하나이고 가까운 위치를 말하므로 near가 자연스럽다.",
        hint: "기준점이 하나면 near가 잘 맞아요.",
        difficulty: 1,
      },
      {
        type: "on_surface",
        wrong: "My sister puts a magazine between the box.",
        correct: "My sister puts a magazine on the box.",
        reason: "magazine이 box의 표면 위에 닿아 있으므로 on을 써야 한다.",
        hint: "표면 위에 닿아 있으면 on이에요.",
        difficulty: 2,
      },
    ],
    pixHints: [
      "오늘 배운 위치 전치사 단서를 떠올려봐.",
      "두 장소 사이면 between, 한 장소 근처면 near야.",
      "표면 위에 닿아 있으면 on을 써.",
      "정답 문장은 \"He is standing between a bank and a hospital.\"이야.",
    ],
  },
];

export const defaultTeachLesson = teachLessons[0];
