const humanLectureEmbed = "https://www.youtube.com/embed/v-B0sHNtuyU";
const vrLectureEmbed = "https://www.youtube.com/embed/Gg3qXjERUbk";

const textbookPages = [1, 2, 3, 4].map((page) => ({
  src: new URL(`../../교재 예시/${page}.png`, import.meta.url).href,
  label: `교재 ${page}`,
}));

export type WatchLectureKind = "human" | "vr" | "master";

export type WatchLecture = {
  id: WatchLectureKind;
  title: string;
  label: string;
  instructor: string;
  format: string;
  description: string;
  videoSrc?: string;
  embedSrc?: string;
  bookPages?: typeof textbookPages;
  objective: string;
  keySentence: string;
  captions: string[];
  masterLines?: string[];
  pixPrompt: string;
  quickQuestions: string[];
};

export const watchScenes: WatchLecture[] = [
  {
    id: "human",
    title: "실제 사람의 실제 강의",
    label: "REAL CLASS",
    instructor: "EIE Teacher",
    format: "동영상 강의",
    description: "선생님의 실제 설명을 보며 오늘 표현을 자연스럽게 이해합니다.",
    embedSrc: humanLectureEmbed,
    objective: "between, near, on을 실제 수업 흐름 안에서 구분하기",
    keySentence: "He is standing between a bank and a hospital.",
    captions: [
      "두 장소 사이에 있을 때는 between을 사용합니다.",
      "가까이에 있지만 사이가 아닐 때는 near가 더 자연스럽습니다.",
      "표면 위에 닿아 있으면 on으로 위치를 설명합니다.",
    ],
    pixPrompt: "실제 선생님 설명을 듣다가 헷갈리는 표현을 바로 물어보세요.",
    quickQuestions: [
      "between과 near 차이를 다시 알려줘.",
      "이 문장을 초등학생에게 쉽게 설명해줘.",
      "방금 강의에서 꼭 기억할 한 문장을 골라줘.",
    ],
  },
  {
    id: "vr",
    title: "VR 캐릭터의 강의",
    label: "VR CLASS",
    instructor: "VR Master",
    format: "동영상 강의",
    description: "가상 캐릭터가 장면 속에서 표현의 의미를 시각적으로 보여줍니다.",
    embedSrc: vrLectureEmbed,
    objective: "장면과 움직임으로 위치 표현의 의미를 연결하기",
    keySentence: "There is a park near Tiger's apartment.",
    captions: [
      "VR 장면에서는 장소의 거리와 방향을 먼저 관찰합니다.",
      "near는 정확한 접촉보다 가까운 위치 관계를 말합니다.",
      "문장 속 장소 단어를 먼저 찾으면 전치사 선택이 쉬워집니다.",
    ],
    pixPrompt: "VR 장면에서 무엇을 봐야 하는지 Pix에게 물어보세요.",
    quickQuestions: [
      "VR 장면에서 어디를 보면 정답을 찾을 수 있어?",
      "near를 쓰는 상황을 하나 더 만들어줘.",
      "헷갈리는 전치사를 구분하는 순서를 알려줘.",
    ],
  },
  {
    id: "master",
    title: "도시 MASTER의 강의",
    label: "MASTER CLASS",
    instructor: "Dr. Lexi",
    format: "교재 기반 강의",
    description: "도시 MASTER가 실제 교재 사진을 보며 핵심 문장과 규칙을 짚어줍니다.",
    bookPages: textbookPages,
    objective: "교재 예시를 보며 규칙, 예문, 확인 질문으로 정리하기",
    keySentence: "My sister puts a magazine on the box.",
    captions: [
      "교재의 그림, 예문, 질문을 순서대로 보며 규칙을 정리합니다.",
      "Dr. Lexi는 학생이 놓치기 쉬운 단서를 먼저 짚어줍니다.",
      "Pix에게 물어보면 교재 내용을 더 쉬운 설명이나 추가 예시로 바꿔줍니다.",
    ],
    masterLines: [
      "이 페이지는 오늘 배울 단원 전체를 보여줘요. 먼저 제목과 Grammar Point를 훑어보며 흐름을 잡아봅시다.",
      "그림과 예문을 같이 보면 위치 표현이 더 빨리 이해돼요. 장소가 하나인지, 두 개인지 먼저 확인하세요.",
      "on은 표면 위에 닿아 있는 느낌이에요. 문장 속 물건과 받침이 되는 대상을 함께 찾아봅시다.",
      "마지막에는 내가 직접 설명할 수 있어야 해요. 예문을 하나 고르고 Pix에게 더 쉬운 말로 바꿔 달라고 해도 좋아요.",
    ],
    pixPrompt: "교재 사진에서 이해되지 않는 부분을 Pix에게 바로 질문하세요.",
    quickQuestions: [
      "이 교재 페이지를 쉬운 말로 요약해줘.",
      "on을 쓰는 예문을 하나 더 만들어줘.",
      "교재에서 시험에 나올 만한 질문을 만들어줘.",
    ],
  },
];
