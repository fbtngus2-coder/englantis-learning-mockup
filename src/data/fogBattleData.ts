import type { FogFamily } from "../types/fog";

export const fogFamilies: FogFamily[] = [
  {
    city: "Vocania",
    focus: "Vocabulary",
    tone: "amber",
    modes: ["Choose It", "Recall It", "Fill It"],
    creatures: [
      ["Swapple", "뒤바꾸미", "두 얼굴이 도는 구슬", "단어 뜻을 서로 뒤바꿈"],
      ["Foglet", "흐리미", "안개 솜뭉치", "단어 의미를 흐릿하게 만듦"],
      ["Gulper", "삼키미", "입이 큰 풍선", "단어를 통째로 삼킴"],
    ],
    prompt: "Which word means very bright?",
    choices: ["radiant", "silent", "slow"],
    answer: "radiant",
  },
  {
    city: "Speakia",
    focus: "Speaking",
    tone: "rose",
    modes: ["Say It", "Pronounce It", "Complete It"],
    creatures: [
      ["Hushie", "쉬쉬", "입에 손가락 댄 구름", "주변 목소리를 흡수함"],
      ["Mumbler", "웅얼이", "발음이 뭉개진 젤리", "발음을 알아듣기 어렵게 만듦"],
      ["Stutter", "더듬이", "몸이 떨리는 작은 생물", "말을 반복하거나 막히게 함"],
    ],
    prompt: "Complete the clear sentence.",
    choices: ["I can explain it clearly.", "I can... can... explain.", "I explain unclear."],
    answer: "I can explain it clearly.",
  },
  {
    city: "Listenia",
    focus: "Listening",
    tone: "blue",
    modes: ["Hear It", "Correct It", "Remember It"],
    creatures: [
      ["Noiser", "소음이", "여러 입이 달린 공", "비슷한 문장을 동시에 말함"],
      ["Twister", "왜곡이", "나선형 안개 뱀", "소리를 다른 뜻으로 왜곡함"],
      ["Fader", "흘려듣기", "투명해지는 귀", "소리를 한쪽으로 흘려보냄"],
    ],
    prompt: "Echo signal: “The bell rang twice.”",
    choices: ["rang", "shone", "sang"],
    answer: "rang",
  },
  {
    city: "Readia",
    focus: "Reading",
    tone: "violet",
    modes: ["Read It", "Reorder It", "Find It"],
    creatures: [
      ["Blurry", "번지미", "안개를 뿜는 나비", "글자를 흐릿하게 만듦"],
      ["Scrambler", "섞기미", "문장을 섞는 도마뱀", "단어 순서를 무작위로 섞음"],
      ["Hider", "숨기미", "투명 카멜레온", "핵심 단어를 보이지 않게 숨김"],
    ],
    prompt: "The lantern was still warm. What can you infer?",
    choices: ["It was used recently.", "It was never used.", "It was frozen."],
    answer: "It was used recently.",
  },
  {
    city: "Grammia",
    focus: "Grammar",
    tone: "green",
    modes: ["Build It", "Fix It", "Fill the Gap"],
    creatures: [
      ["Jumbler", "뒤죽이", "블록을 얹은 거북이", "문장 어순을 뒤죽박죽으로 만듦"],
      ["Bubbler", "부글이", "방울을 뿜는 개구리", "문법 오류 방울을 퍼뜨림"],
      ["Dropper", "빠뜨리미", "구멍 난 주머니", "기능어를 문장에서 빠뜨림"],
    ],
    prompt: "Fix: She walk to school yesterday.",
    choices: ["walked", "walks", "walking"],
    answer: "walked",
  },
  {
    city: "Writia",
    focus: "Writing",
    tone: "cyan",
    modes: ["Write It", "Express It", "Complete It"],
    creatures: [
      ["Eraser", "지우미", "지우개 달팽이", "쓴 글자를 지나가며 지움"],
      ["Freezer", "얼음이", "차가운 안개 펭귄", "생각을 굳혀 표현을 막음"],
      ["Scatter", "흩뜨리미", "바람을 일으키는 새", "쓰려던 생각을 흩뜨림"],
    ],
    prompt: "Complete the recipe ending.",
    choices: ["Finally, turn off the flame.", "Blue flame because.", "Next finally first."],
    answer: "Finally, turn off the flame.",
  },
];

export const fogBossModes = [
  "복합형 · 어휘+문법",
  "연쇄형 · 듣기→말하기",
  "전환형 · 읽기↔쓰기",
  "종합형 · 6개 영역",
  "침묵의 탑 · 스토리",
];

export const fogCityDescriptions: Record<string, string> = {
  Vocania: "단어의 뜻과 기억을 방해하는 어휘 안개 지역",
  Speakia: "목소리와 발음을 방해하는 말하기 안개 지역",
  Listenia: "소리와 문장 신호를 왜곡하는 듣기 안개 지역",
  Readia: "글자와 문장 이해를 흐리는 읽기 안개 지역",
  Grammia: "어순과 규칙을 뒤섞는 문법 안개 지역",
  Writia: "생각을 문장으로 표현하기 어렵게 만드는 쓰기 안개 지역",
};

export const fogModeDescriptions: Record<string, string> = {
  "Choose It": "뜻에 맞는 답을 보기에서 골라 정화합니다.",
  "Recall It": "보기 없이 알맞은 단어를 직접 떠올립니다.",
  "Fill It": "문장의 빈칸에 들어갈 단어를 찾습니다.",
  "Say It": "제시된 문장을 정확하고 자연스럽게 말합니다.",
  "Pronounce It": "발음 차이를 듣고 소리를 교정합니다.",
  "Complete It": "문장을 말하거나 써서 완성합니다.",
  "Hear It": "여러 음성 중 맞는 문장을 골라냅니다.",
  "Correct It": "왜곡되어 들린 문장을 바르게 고칩니다.",
  "Remember It": "들은 문장을 기억해 다시 표현합니다.",
  "Read It": "흐릿한 글을 읽고 의미를 추론합니다.",
  "Reorder It": "섞인 문장을 올바른 순서로 복원합니다.",
  "Find It": "글에서 핵심 단어와 근거를 찾습니다.",
  "Build It": "문장 부품을 올바른 어순으로 조립합니다.",
  "Fix It": "문법 오류를 발견하고 바르게 고칩니다.",
  "Fill the Gap": "빠진 기능어와 문법 요소를 채웁니다.",
  "Write It": "조건에 맞는 문장을 직접 씁니다.",
  "Express It": "자신의 생각을 자유롭게 문장으로 표현합니다.",
};

export const fogBossDescriptions = [
  "어휘 문제와 문법 문제를 한 전투에서 함께 해결합니다.",
  "듣고 이해한 내용을 바로 말하며 연속 임무를 수행합니다.",
  "읽은 내용을 쓰기로, 쓴 내용을 읽기로 전환합니다.",
  "여섯 학습 영역을 차례로 통과하는 종합 전투입니다.",
  "도움 표시 없이 스토리 단서를 따라가는 최종 도전입니다.",
];
