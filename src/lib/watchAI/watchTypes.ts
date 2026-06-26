export type WatchPixRequest = {
  lectureId: string;
  lectureTitle: string;
  instructor: string;
  objective: string;
  keySentence: string;
  captions: string[];
  question: string;
};

export type WatchPixResponse = {
  answer: string;
  quickCheck: string;
  followUp: string;
  source: "openai" | "local";
};
