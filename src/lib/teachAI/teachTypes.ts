export type TeachStepType = "detect_error" | "explain_rule" | "make_example" | "npc_retry";

export type TeachAction = "correct_sentence" | "explain_reason" | "create_example" | "validate_or_correct";

export type StudentInputType = "choice" | "typing" | "blank" | "free_text" | "ox";

export type ScaffoldLevel = 1 | 2 | 3 | 4;

export type TeachSkillKey =
  | "correctionSkill"
  | "explanationSkill"
  | "exampleSkill"
  | "validationSkill";

export interface TeachKnowledgeState {
  knows: string[];
  doesNotKnow: string[];
  misconceptions: string[];
  confidence: number;
  understanding: number;
}

export interface TeachNpc {
  npcId: string;
  npcName: string;
  title: string;
  role: "teachable_npc";
  knowledgeState: TeachKnowledgeState;
}

export interface MisconceptionItem {
  type: string;
  wrong: string;
  correct: string;
  reason: string;
  hint: string;
  difficulty: 1 | 2 | 3;
}

export interface TeachLesson {
  id: string;
  title: string;
  targetGrammar: string;
  koreanMeaning: string;
  missionGoal: string;
  unitTheme: string;
  successConcept: string;
  correctExamples: string[];
  keyRules: string[];
  allowedWords: string[];
  npc: TeachNpc;
  misconceptionBank: MisconceptionItem[];
  pixHints: string[];
}

export interface LevelInputConfig {
  inputType: StudentInputType;
  prompt: string;
  choices?: string[];
  correctAnswer?: string;
  acceptableAnswers?: string[];
  requiredKeywords?: string[];
  exampleAnswer: string;
  placeholder?: string;
  starter?: string;
}

export interface TeachMissionStep {
  id: string;
  type: TeachStepType;
  skillKey: TeachSkillKey;
  title: string;
  missionLabel: string;
  npcLine: string;
  expectedAction: TeachAction;
  pixGuide: string;
  hintLadder: string[];
  inputByLevel: Record<ScaffoldLevel, LevelInputConfig>;
  npcSuccessLine: string;
  npcRetryLine: string;
  teacherNote: string;
  scoreDelta: number;
  understandingDelta: number;
  confidenceDelta: number;
}

export interface TeachHistoryItem {
  stepId: string;
  answer: string;
  correct: boolean;
  feedback: string;
  inputType: StudentInputType;
  scoreDelta: number;
  hintLevel: number;
}

export interface TeachSessionState {
  sessionId: string;
  lessonId: string;
  currentStepIndex: number;
  score: number;
  attempts: number;
  hintUsed: number;
  scaffoldLevel: ScaffoldLevel;
  completed: boolean;
  npcUnderstanding: number;
  npcConfidence: number;
  history: TeachHistoryItem[];
}

export interface TeachEvaluation {
  correct: boolean;
  scoreDelta: number;
  npcMessage: string;
  pixGuide: string;
  teacherNote: string;
  normalizedAnswer: string;
  understandingDelta: number;
  confidenceDelta: number;
  skillKey: TeachSkillKey;
}

export interface TeachResultMetric {
  label: string;
  value: string;
  tone: "good" | "care" | "neutral";
}

export interface TeachResult {
  missionTitle: string;
  score: number;
  understanding: number;
  confidence: number;
  studentSummary: string;
  parentSummary: string;
  teacherSummary: string;
  nextPractice: string;
  metrics: TeachResultMetric[];
}

export interface TeachStartRequest {
  studentId: string;
  lessonId: string;
  doResult?: {
    accuracy: number;
    wrongTypes: string[];
    hintUsed: number;
    averageResponseTime: number;
  };
}

export interface TeachStartResponse {
  sessionId: string;
  lessonId: string;
  teachLevel: ScaffoldLevel;
  currentStep: TeachStepType;
  npc: {
    npcId: string;
    npcName: string;
    understanding: number;
    confidence: number;
  };
  npcMessage: string;
  pixGuide: string;
  studentInputType: StudentInputType;
}

export interface TeachMessageRequest {
  sessionId: string;
  lessonId: string;
  teachLevel: ScaffoldLevel;
  currentStep: TeachStepType;
  studentMessage: string;
  conversationHistory: TeachHistoryItem[];
  lesson?: TeachLesson;
  step?: TeachMissionStep;
  hintLevel?: number;
}

export interface TeachMessageResponse {
  isCorrect: boolean;
  scoreDelta: number;
  nextStep: TeachStepType | "complete";
  npcMessage: string;
  pixGuide: string;
  teacherNote?: string;
  normalizedAnswer?: string;
  studentInputType: StudentInputType;
  choices: string[];
  blankPrompt: string | null;
  hint: string;
  npcStateUpdate: {
    understandingDelta: number;
    confidenceDelta: number;
  };
  evaluation: Partial<Record<TeachSkillKey | "independence", number>>;
}

export interface TeachEvaluateRequest {
  sessionId: string;
  lessonId: string;
  teachLevel: ScaffoldLevel;
  messages: TeachHistoryItem[];
  hintUsed: number;
  stepResults: TeachHistoryItem[];
}

export interface TeachEvaluateResponse {
  teachScore: number;
  correctionSkill: number;
  explanationSkill: number;
  exampleSkill: number;
  validationSkill: number;
  independence: number;
  studentSummary: string;
  parentSummary: string;
  teacherSummary: string;
  nextRecommendation: string;
}
