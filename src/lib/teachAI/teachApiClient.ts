import type {
  TeachEvaluateRequest,
  TeachEvaluateResponse,
  TeachMessageRequest,
  TeachMessageResponse,
  TeachStartRequest,
  TeachStartResponse,
} from "./teachTypes";

export const teachApiRoutes = {
  start: "/api/teach/start",
  message: "/api/teach/message",
  evaluate: "/api/teach/evaluate",
} as const;

async function postTeachJson<TRequest, TResponse>(url: string, payload: TRequest): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`TeachAI API request failed: ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}

export function startTeachAiSession(payload: TeachStartRequest) {
  return postTeachJson<TeachStartRequest, TeachStartResponse>(teachApiRoutes.start, payload);
}

export function sendTeachAiMessage(payload: TeachMessageRequest) {
  return postTeachJson<TeachMessageRequest, TeachMessageResponse>(teachApiRoutes.message, payload);
}

export function evaluateTeachAiSession(payload: TeachEvaluateRequest) {
  return postTeachJson<TeachEvaluateRequest, TeachEvaluateResponse>(teachApiRoutes.evaluate, payload);
}
