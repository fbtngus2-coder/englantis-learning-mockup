export type ActivityPhase = "watch" | "do" | "teach";

export type RhythmKey = "A" | "S" | "D" | "F";

export type RhythmJudgement = "perfect" | "good" | "miss";

export type ActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  input: string;
  description: string;
  badge: string;
  group?: string;
};

export type ActivityGuide = {
  activity: string;
  control: string;
  learning: string;
};
