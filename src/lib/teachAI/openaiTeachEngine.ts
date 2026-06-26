import type { TeachEvaluation, TeachMissionStep, TeachSessionState } from "./teachTypes";
import { defaultTeachLesson } from "../../data/teachLessons";
import { sendTeachAiMessage } from "./teachApiClient";

export async function submitTeachAnswerWithOpenAI(
  session: TeachSessionState,
  step: TeachMissionStep,
  answer: string,
): Promise<TeachEvaluation> {
  const response = await sendTeachAiMessage({
    sessionId: session.sessionId,
    lessonId: session.lessonId,
    teachLevel: session.scaffoldLevel,
    currentStep: step.type,
    studentMessage: answer,
    conversationHistory: session.history,
    lesson: defaultTeachLesson,
    step,
  });

  return {
    correct: response.isCorrect,
    scoreDelta: response.isCorrect ? response.scoreDelta : 0,
    npcMessage: response.npcMessage,
    pixGuide: response.pixGuide,
    teacherNote: response.teacherNote ?? (response.isCorrect ? step.teacherNote : "아직 설명 신호가 부족합니다. 예시와 규칙을 다시 연결해보세요."),
    normalizedAnswer: response.normalizedAnswer ?? answer.trim(),
    understandingDelta: response.isCorrect ? response.npcStateUpdate.understandingDelta : 0,
    confidenceDelta: response.isCorrect ? response.npcStateUpdate.confidenceDelta : 0,
    skillKey: step.skillKey,
  };
}
