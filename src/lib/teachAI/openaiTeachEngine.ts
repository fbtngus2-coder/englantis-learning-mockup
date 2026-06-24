import type { TeachEvaluation, TeachMissionStep, TeachSessionState } from "./teachTypes";

export async function submitTeachAnswerWithOpenAI(
  _session: TeachSessionState,
  _step: TeachMissionStep,
  _answer: string,
): Promise<TeachEvaluation> {
  throw new Error(
    "OpenAI TeachAI engine is not wired yet. Use a server API route and keep OPENAI_API_KEY out of browser code.",
  );
}
