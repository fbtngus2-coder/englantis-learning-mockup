import type { LevelInputConfig, ScaffoldLevel, TeachEvaluation, TeachMissionStep } from "./teachTypes";

const punctuationPattern = /["".?!,]/g;
const apostrophePattern = /[''`]/g;

export function normalizeTeachAnswer(answer: string) {
  return answer
    .toLowerCase()
    .replace(apostrophePattern, "'")
    .replace(/\blet\s*'?s\b/g, "lets")
    .replace(punctuationPattern, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getTeachInputForLevel(step: TeachMissionStep, scaffoldLevel: ScaffoldLevel): LevelInputConfig {
  return step.inputByLevel[scaffoldLevel];
}

function hasRequiredKeywords(normalized: string, keywords: string[] = []) {
  return keywords.every((keyword) => normalized.includes(normalizeTeachAnswer(keyword)));
}

function isChoiceCorrect(config: LevelInputConfig, normalized: string) {
  return normalizeTeachAnswer(config.correctAnswer ?? "") === normalized;
}

function acceptableAnswers(config: LevelInputConfig) {
  return (config.acceptableAnswers ?? []).map(normalizeTeachAnswer).filter(Boolean);
}

function isExactAcceptableAnswer(config: LevelInputConfig, normalized: string) {
  return acceptableAnswers(config).some((answer) => normalized === answer);
}

function includesAcceptableSentence(config: LevelInputConfig, normalized: string) {
  return acceptableAnswers(config).some((answer) => answer.length >= 12 && normalized.includes(answer));
}

function isLetsSentence(normalized: string) {
  const words = normalized.split(" ");
  const letsIndex = words.indexOf("lets");
  const verb = letsIndex >= 0 ? words[letsIndex + 1] ?? "" : "";
  const blockedForms = new Set(["goes", "plays", "going", "playing", "reading", "went", "reads", "makes"]);

  return letsIndex >= 0 && Boolean(verb) && !blockedForms.has(verb);
}

function isValidExplanation(normalized: string) {
  return (
    normalized.includes("base verb")
    || normalized.includes("verb")
    || normalized.includes("basic form")
    || normalized.includes("after lets")
    || normalized.includes("lets")
  );
}

function isNpcRetryCorrection(config: LevelInputConfig, normalized: string) {
  const usesTargetSentence =
    normalized.includes("lets play soccer")
    || normalized.includes("no lets play soccer")
    || normalized.includes("use play not plays")
    || normalized.includes("play not plays");

  return (
    isExactAcceptableAnswer(config, normalized)
    || includesAcceptableSentence(config, normalized)
    || (usesTargetSentence && !normalized.includes("plays soccer"))
  );
}

function evaluateByStep(step: TeachMissionStep, config: LevelInputConfig, normalized: string) {
  const keywordMatch = hasRequiredKeywords(normalized, config.requiredKeywords);

  if (config.inputType === "choice" || config.inputType === "ox") {
    return isChoiceCorrect(config, normalized);
  }

  if (step.type === "explain_rule") {
    return isExactAcceptableAnswer(config, normalized)
      || includesAcceptableSentence(config, normalized)
      || keywordMatch
      || isValidExplanation(normalized);
  }

  if (step.type === "make_example") {
    return isLetsSentence(normalized) && (keywordMatch || includesAcceptableSentence(config, normalized));
  }

  if (step.type === "npc_retry") {
    return isNpcRetryCorrection(config, normalized);
  }

  return isExactAcceptableAnswer(config, normalized) || includesAcceptableSentence(config, normalized) || keywordMatch;
}

export function evaluateTeachStep(
  step: TeachMissionStep,
  scaffoldLevel: ScaffoldLevel,
  answer: string,
): TeachEvaluation {
  const config = getTeachInputForLevel(step, scaffoldLevel);
  const normalizedAnswer = normalizeTeachAnswer(answer);
  const correct = evaluateByStep(step, config, normalizedAnswer);

  return {
    correct,
    scoreDelta: correct ? step.scoreDelta : 0,
    npcMessage: correct ? step.npcSuccessLine : step.npcRetryLine,
    pixGuide: correct
      ? "좋아요. NPC가 방금 배운 규칙을 받아들이고 있어요."
      : "아직 신호가 약해요. PIX 힌트를 보고 핵심 단어를 다시 확인해보세요.",
    teacherNote: correct ? step.teacherNote : "아직 설명 신호가 부족합니다. 예시와 규칙을 다시 연결해보세요.",
    normalizedAnswer,
    understandingDelta: correct ? step.understandingDelta : 0,
    confidenceDelta: correct ? step.confidenceDelta : 0,
    skillKey: step.skillKey,
  };
}
