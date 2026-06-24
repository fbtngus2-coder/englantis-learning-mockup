export type FogCreature = [name: string, koreanName: string, visual: string, behavior: string];

export type FogFamily = {
  city: string;
  focus: string;
  tone: string;
  modes: string[];
  creatures: FogCreature[];
  prompt: string;
  choices: string[];
  answer: string;
};

export type FogSetupStep = "city" | "creature" | "battle";

export type FogBattleState = "setup" | "battle" | "victory" | "defeat";
