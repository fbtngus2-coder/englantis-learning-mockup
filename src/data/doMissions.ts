import type { DoMission } from "../types/navigation";

export const doHubMissions: DoMission[] = [
  {
    id: "sentence",
    screen: "sentence",
    title: "Sentence Purify",
    subtitle: "안개 문장을 정화하라",
    description: "문장 속 빈칸에 맞는 표현을 골라 안개가 낀 문장을 정화합니다.",
    icon: "S",
    objective: "3개의 안개 문장 정화",
    reward: "+120 LV",
    skill: "Meaning Choice",
  },
  {
    id: "rune",
    screen: "rune",
    title: "Rune Puzzle",
    subtitle: "흩어진 문장 룬을 맞춰라",
    description: "단어 조각을 올바른 순서로 선택해 Grammia의 문장 룬을 복원합니다.",
    icon: "R",
    objective: "3개의 문장 룬 복원",
    reward: "+140 LV",
    skill: "Sentence Build",
  },
  {
    id: "npc",
    screen: "npc",
    title: "NPC Mission Talk",
    subtitle: "길을 잃은 주민을 안내하라",
    description: "상황에 맞는 영어 문장을 선택해 Milo에게 길을 알려줍니다.",
    icon: "N",
    objective: "Milo를 목적지 2곳으로 안내",
    reward: "+160 LV",
    skill: "Situation Use",
  },
  {
    id: "cultist",
    screen: "cultist",
    title: "Find the Cultist",
    subtitle: "사이비 신도를 찾아라",
    description: "로브를 쓴 세 NPC의 문장을 들어보고 문법 신호가 깨진 한 명을 찾아냅니다.",
    icon: "C",
    objective: "문법 오류 후보 3라운드 검거",
    reward: "+180 LV",
    skill: "Grammar Check",
  },
];

