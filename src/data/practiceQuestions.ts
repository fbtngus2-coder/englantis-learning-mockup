export const sentenceQuestions = [
  {
    prompt: "He is standing ____ a bank and a hospital.",
    choices: ["between", "near", "on", "in"],
    answer: "between",
    correct: "맞아! 두 장소 사이니까 between이야.",
    wrong: "near는 가까이에 있다는 뜻이야. 여기서는 두 곳의 사이에 있어.",
  },
  {
    prompt: "There is a park ____ Tiger's apartment.",
    choices: ["near", "between", "on", "at"],
    answer: "near",
    correct: "좋아! 아파트 근처에 있으니까 near가 맞아.",
    wrong: "공원이 한 장소의 가까이에 있으니 near를 골라야 해.",
  },
  {
    prompt: "My sister puts a magazine ____ the box.",
    choices: ["on", "near", "between", "to"],
    answer: "on",
    correct: "표면 위에 놓을 때는 on을 써.",
    wrong: "잡지는 상자의 표면 위에 놓여 있어.",
  },
];

export const runePuzzles = [
  {
    hint: "그는 은행과 병원 사이에 서 있어요.",
    blocks: ["a hospital", "standing", "He", "between", "and", "is", "a bank"],
    answer: "He is standing between a bank and a hospital",
  },
  {
    hint: "Tiger의 아파트 근처에 공원이 있어요.",
    blocks: ["near", "There", "Tiger's apartment", "a park", "is"],
    answer: "There is a park near Tiger's apartment",
  },
  {
    hint: "내 여동생은 잡지를 상자 위에 올려놓아요.",
    blocks: ["on", "puts", "the box", "My sister", "a magazine"],
    answer: "My sister puts a magazine on the box",
  },
];

export const npcQuestions = [
  {
    line: "I can't find the boy. Is he near the bank?",
    choices: [
      "He is standing between a bank and a hospital.",
      "He is standing on the bank.",
      "He is going to the university.",
    ],
    answer: "He is standing between a bank and a hospital.",
    response: "Oh! He is between the bank and the hospital. Now I understand!",
  },
  {
    line: "Where is the park?",
    choices: [
      "There is a park near Tiger's apartment.",
      "There is a park between the box and the magazine.",
      "There is a park on the hospital.",
    ],
    answer: "There is a park near Tiger's apartment.",
    response: "I found it! The park is near Tiger's apartment.",
  },
];

export const weeklyQuestions = [
  ["Which word means '~사이에'?", ["between", "near", "hospital", "east"], "between"],
  ["He is standing ____ a bank and a hospital.", ["between", "near", "on", "in"], "between"],
  ["Tiger의 아파트 근처에 공원이 있어요.", ["There is a park near Tiger's apartment.", "There is a park on the apartment.", "A park is between the bank."], "There is a park near Tiger's apartment."],
  ["Where is the pharmacy?", ["I see a pharmacy to the west.", "I see a pharmacy on the box.", "It is a magazine."], "I see a pharmacy to the west."],
  ["What is the difference?", ["Between is in the middle of two things. Near is close.", "They mean exactly the same thing.", "Near means under something."], "Between is in the middle of two things. Near is close."],
] as const;

export const monthlyQuestions = [
  ["Choose the correct vehicle.", ["airplane", "subway", "taxi", "truck"], "airplane"],
  ["Which sentence is correct?", ["East is that way.", "East are that way.", "East is on the box."], "East is that way."],
  ["He is standing ____ a bank and a hospital.", ["between", "near", "under"], "between"],
  ["같이 식당에 가자고 말하려면?", ["Let's go to that restaurant.", "There is a restaurant.", "I live in a restaurant."], "Let's go to that restaurant."],
  ["I want to go fishing.", ["Let's go fishing at the lake.", "Fishing is a hospital.", "Go north the box."], "Let's go fishing at the lake."],
] as const;
