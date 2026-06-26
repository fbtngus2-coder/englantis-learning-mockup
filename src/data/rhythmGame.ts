import type { RhythmKey } from "../types/activity";

export const rhythmBeatMs = 980;
export const rhythmLeadMs = 2600;

export const rhythmNotes: {
  key: RhythmKey;
  label: string;
  beat: number;
  pairId: number;
  correct: boolean;
  prompt: string;
}[] = [
  { key: "A", label: "near", beat: 0, pairId: 0, correct: false, prompt: "bank와 hospital 사이에 있으면?" },
  { key: "S", label: "between", beat: 0, pairId: 0, correct: true, prompt: "bank와 hospital 사이에 있으면?" },
  { key: "D", label: "on", beat: 2.2, pairId: 1, correct: false, prompt: "park가 apartment 근처에 있으면?" },
  { key: "F", label: "near", beat: 2.2, pairId: 1, correct: true, prompt: "park가 apartment 근처에 있으면?" },
  { key: "A", label: "between", beat: 4.4, pairId: 2, correct: false, prompt: "book이 desk 위에 닿아 있으면?" },
  { key: "S", label: "on", beat: 4.4, pairId: 2, correct: true, prompt: "book이 desk 위에 닿아 있으면?" },
  { key: "D", label: "near", beat: 6.6, pairId: 3, correct: false, prompt: "gate가 bank와 hospital 사이에 있으면?" },
  { key: "F", label: "between", beat: 6.6, pairId: 3, correct: true, prompt: "gate가 bank와 hospital 사이에 있으면?" },
];

export const rhythmLaneTop: Record<RhythmKey, number> = {
  A: 16,
  S: 38,
  D: 60,
  F: 82,
};

export const rhythmTotalMs =
  rhythmNotes[rhythmNotes.length - 1].beat * rhythmBeatMs + rhythmLeadMs + 750;
