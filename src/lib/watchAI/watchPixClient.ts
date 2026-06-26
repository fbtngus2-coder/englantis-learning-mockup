import type { WatchPixRequest, WatchPixResponse } from "./watchTypes";

const watchPixRoute = "/api/watch/pix";

async function postWatchJson<TRequest, TResponse>(url: string, payload: TRequest): Promise<TResponse> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 6000);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: controller.signal,
  }).finally(() => window.clearTimeout(timeout));

  if (!response.ok) {
    throw new Error(`Watch Pix API request failed: ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}

export function sendWatchPixQuestion(payload: WatchPixRequest) {
  return postWatchJson<WatchPixRequest, WatchPixResponse>(watchPixRoute, payload);
}
