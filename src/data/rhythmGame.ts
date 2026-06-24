import type { RhythmKey } from "../types/activity";

export const rhythmBeatMs = 640;
export const rhythmLeadMs = 1850;

export const rhythmNotes: { key: RhythmKey; label: string; beat: number }[] = [
  { key: "A", label: "The", beat: 0 },
  { key: "S", label: "CRYS-tal", beat: 1 },
  { key: "D", label: "GLOWED", beat: 2 },
  { key: "S", label: "all", beat: 3.15 },
  { key: "F", label: "NIGHT", beat: 4.15 },
  { key: "D", label: "glowed", beat: 5.2 },
  { key: "A", label: "again", beat: 6.05 },
  { key: "F", label: "CAST", beat: 7.1 },
];

export const rhythmLaneTop: Record<RhythmKey, number> = {
  A: 16,
  S: 38,
  D: 60,
  F: 82,
};

export const rhythmTotalMs =
  rhythmNotes[rhythmNotes.length - 1].beat * rhythmBeatMs + rhythmLeadMs + 750;
