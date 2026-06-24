import type { TeachLesson } from "../lib/teachAI/teachTypes";

export const teachLessons: TeachLesson[] = [
  {
    id: "lets_001",
    title: "Let's + base verb",
    targetGrammar: "Let's + base verb",
    koreanMeaning: "~하자",
    missionGoal: "NPC에게 Let's 뒤에는 동사의 기본형을 쓴다는 규칙을 가르친다.",
    unitTheme: "Action invitation",
    successConcept: "Let's 다음에는 goes, plays처럼 바꾸지 않고 go, play 같은 기본형을 사용한다.",
    correctExamples: [
      "Let's go.",
      "Let's play soccer.",
      "Let's read a book.",
    ],
    keyRules: [
      "Let's는 '~하자'라는 뜻이다.",
      "Let's 뒤에는 동사원형을 쓴다.",
      "Let's goes, Let's plays, Let's reading은 틀린 표현이다.",
    ],
    allowedWords: ["go", "play", "read", "make", "school", "soccer", "book", "home"],
    npc: {
      npcId: "npc_milo_001",
      npcName: "Milo",
      title: "New Archivist",
      role: "teachable_npc",
      knowledgeState: {
        knows: ["Let's means '~하자'."],
        doesNotKnow: ["Let's 뒤에는 동사원형이 온다."],
        misconceptions: [
          "Let's 뒤에 goes, plays처럼 s가 붙는다고 생각한다.",
          "Let's 뒤에 reading처럼 ing 형태를 써도 된다고 생각한다.",
        ],
        confidence: 35,
        understanding: 30,
      },
    },
    misconceptionBank: [
      {
        type: "third_person_s_error",
        wrong: "Let's goes to school.",
        correct: "Let's go to school.",
        reason: "Let's 뒤에는 go처럼 동사원형을 써야 한다.",
        hint: "goes에서 s를 빼야 해요.",
        difficulty: 1,
      },
      {
        type: "third_person_s_error",
        wrong: "Let's plays soccer.",
        correct: "Let's play soccer.",
        reason: "Let's 뒤에는 plays가 아니라 play를 쓴다.",
        hint: "Let's 뒤에는 play처럼 기본 모양을 써요.",
        difficulty: 1,
      },
      {
        type: "ing_error",
        wrong: "Let's reading a book.",
        correct: "Let's read a book.",
        reason: "Let's 뒤에는 reading이 아니라 read를 쓴다.",
        hint: "reading을 기본 모양 read로 바꿔요.",
        difficulty: 2,
      },
    ],
    pixHints: [
      "오늘 배운 Let's 규칙을 떠올려봐.",
      "Let's 뒤에는 기본 모양의 동사가 와.",
      "goes가 아니라 go를 써야 해.",
      "정답 문장은 \"Let's go to school.\"이야.",
    ],
  },
];

export const defaultTeachLesson = teachLessons[0];
