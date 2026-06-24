export type Screen =
  | "home"
  | "story-intro"
  | "course-select"
  | "map"
  | "daily-intro"
  | "watch"
  | "do-hub"
  | "sentence"
  | "rune"
  | "npc"
  | "cultist"
  | "teach"
  | "daily-result"
  | "weekly-intro"
  | "weekly-boss"
  | "weekly-result"
  | "monthly-intro"
  | "monthly-boss"
  | "monthly-summary"
  | "final-teach"
  | "activity-lab"
  | "parent";

export type CourseNodeStatus = "done" | "today" | "locked";

export type CourseNode = {
  id: string;
  label: string;
  title: string;
  subtitle: string;
  status: CourseNodeStatus;
  x: number;
  y: number;
};

export type DoMission = {
  id: string;
  screen: Screen;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  objective: string;
  reward: string;
  skill: string;
};
