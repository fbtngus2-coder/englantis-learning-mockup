import { defaultTeachLesson } from "../../data/teachLessons";
import { letsTeachMissionSteps } from "../../data/teachMissions";
import { evaluateTeachStep, getTeachInputForLevel } from "./teachEvaluator";
import type {
  ScaffoldLevel,
  TeachEvaluation,
  TeachMissionStep,
  TeachResult,
  TeachSessionState,
} from "./teachTypes";

export { getTeachInputForLevel };

export function startTeachSession(
  lessonId = defaultTeachLesson.id,
  scaffoldLevel: ScaffoldLevel = 2,
): TeachSessionState {
  return {
    sessionId: `teach_session_${Date.now()}`,
    lessonId,
    currentStepIndex: 0,
    score: 0,
    attempts: 0,
    hintUsed: 0,
    scaffoldLevel,
    completed: false,
    npcUnderstanding: defaultTeachLesson.npc.knowledgeState.understanding,
    npcConfidence: defaultTeachLesson.npc.knowledgeState.confidence,
    history: [],
  };
}

export function getCurrentTeachStep(session: TeachSessionState): TeachMissionStep {
  return letsTeachMissionSteps[Math.min(session.currentStepIndex, letsTeachMissionSteps.length - 1)];
}

export function submitTeachAnswer(
  session: TeachSessionState,
  step: TeachMissionStep,
  answer: string,
  hintLevel = 0,
): { evaluation: TeachEvaluation; nextSession: TeachSessionState } {
  const evaluation = evaluateTeachStep(step, session.scaffoldLevel, answer);
  const nextIndex = evaluation.correct ? session.currentStepIndex + 1 : session.currentStepIndex;
  const completed = nextIndex >= letsTeachMissionSteps.length;

  return {
    evaluation,
    nextSession: {
      ...session,
      attempts: session.attempts + 1,
      score: Math.min(100, session.score + evaluation.scoreDelta),
      currentStepIndex: nextIndex,
      completed,
      npcUnderstanding: Math.min(100, session.npcUnderstanding + evaluation.understandingDelta),
      npcConfidence: Math.min(100, session.npcConfidence + evaluation.confidenceDelta),
      history: [
        ...session.history,
        {
          stepId: step.id,
          answer,
          correct: evaluation.correct,
          feedback: evaluation.npcMessage,
          inputType: getTeachInputForLevel(step, session.scaffoldLevel).inputType,
          scoreDelta: evaluation.scoreDelta,
          hintLevel,
        },
      ],
    },
  };
}

function skillValue(session: TeachSessionState, stepId: string, max: number) {
  const correct = session.history.some((item) => item.stepId === stepId && item.correct);
  const attempts = session.history.filter((item) => item.stepId === stepId).length;
  if (!correct) return 45;
  return Math.max(65, max - Math.max(0, attempts - 1) * 10);
}

export function buildTeachResult(session: TeachSessionState): TeachResult {
  const correctionSkill = skillValue(session, "detect_error", 92);
  const explanationSkill = skillValue(session, "explain_rule", 88);
  const exampleSkill = skillValue(session, "make_example", 84);
  const validationSkill = skillValue(session, "npc_retry", 90);
  const independence = Math.max(45, 100 - session.hintUsed * 12);
  const persistence = session.history.some((item) => !item.correct) ? 5 : 0;
  const teachScore = Math.min(
    100,
    Math.round(
      correctionSkill * 0.25
      + explanationSkill * 0.25
      + exampleSkill * 0.2
      + validationSkill * 0.15
      + independence * 0.1
      + persistence,
    ),
  );

  return {
    missionTitle: "NPC에게 between / near / on 가르치기",
    score: teachScore,
    understanding: session.npcUnderstanding,
    confidence: session.npcConfidence,
    studentSummary:
      "오늘 너는 Milo에게 between, near, on을 장소 단서에 맞게 고르는 법을 가르쳤어. 틀린 문장을 고치고, 이유를 설명하고, on 예문까지 만들어 보였어.",
    parentSummary:
      "오늘 학생은 위치 전치사 between / near / on을 학습한 뒤, NPC의 틀린 위치 표현을 직접 교정하고 왜 틀렸는지 설명했습니다. 단순히 문제를 맞히는 수준을 넘어 배운 내용을 다른 대상에게 설명하는 단계까지 도달했습니다.",
    teacherSummary:
      `TeachAI 분석: 오류 교정 ${correctionSkill}점, 이유 설명 ${explanationSkill}점, 예문 생성 ${exampleSkill}점, NPC 재교정 ${validationSkill}점입니다. 힌트 사용 ${session.hintUsed}회 기준으로 독립 수행도는 ${independence}점입니다.`,
    nextPractice:
      session.hintUsed > 2
        ? "다음에는 PIX 힌트를 한 단계 늦게 열고, between과 near의 차이를 한 문장 더 말해보면 좋아요."
        : "다음에는 같은 위치 단서로 between, near, on 예문을 각각 하나씩 더 만들어보면 좋아요.",
    metrics: [
      { label: "Correction", value: `${correctionSkill}`, tone: correctionSkill >= 80 ? "good" : "care" },
      { label: "Explanation", value: `${explanationSkill}`, tone: explanationSkill >= 80 ? "good" : "care" },
      { label: "Example", value: `${exampleSkill}`, tone: exampleSkill >= 80 ? "good" : "care" },
      { label: "Validation", value: `${validationSkill}`, tone: validationSkill >= 80 ? "good" : "care" },
      { label: "Independence", value: `${independence}`, tone: independence >= 75 ? "good" : "neutral" },
    ],
  };
}
