const openAiResponsesUrl = "https://api.openai.com/v1/responses";
const defaultWatchModel = "gpt-4.1-mini";

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 400_000) {
        request.destroy();
        reject(new Error("Request body is too large."));
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Request body must be valid JSON."));
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function extractOutputText(payload) {
  if (typeof payload.output_text === "string") return payload.output_text;

  const parts = [];
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string") parts.push(content.text);
    }
  }

  return parts.join("\n").trim();
}

function parseJsonFromModel(text) {
  const withoutFence = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    const match = withoutFence.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("OpenAI response did not contain JSON.");
    return JSON.parse(match[0]);
  }
}

function normalizeWatchPixResult(modelResult) {
  const answer = String(modelResult.answer || "")
    .trim()
    .replace(/\s+(\d+\.\s)/g, "\n$1")
    .replace(/^\n/, "");

  return {
    answer,
    quickCheck: String(modelResult.quickCheck || "").trim(),
    followUp: String(modelResult.followUp || "").trim(),
    source: "openai",
  };
}

function requestedExampleCount(question) {
  const text = String(question ?? "");
  const digitMatch = text.match(/(\d+)\s*(개|문장|sentences?|examples?)/i);
  if (digitMatch) return Math.max(1, Math.min(6, Number(digitMatch[1])));
  if (/세\s*개|세\s*문장|three/i.test(text)) return 3;
  if (/두\s*개|두\s*문장|two/i.test(text)) return 2;
  return 3;
}

function wantsExamples(question) {
  return /예시|예문|문장|활용|sentence|example/i.test(String(question ?? ""));
}

function numberedExamples(word, examples) {
  return examples.map((example, index) => `${index + 1}. ${example}`).join("\n");
}

function buildLocalWatchPixAnswer(payload) {
  const question = String(payload.question ?? "").toLowerCase();
  const keySentence = payload.keySentence || "He is standing between a bank and a hospital.";
  const count = requestedExampleCount(question);

  if (question.includes("near") && wantsExamples(question)) {
    const examples = [
      "There is a park near my house.",
      "The library is near the school.",
      "I sit near the window in class.",
      "The bus stop is near the hospital.",
      "My bag is near the desk.",
      "The bakery is near the bank.",
    ].slice(0, count);
    return {
      answer: `near를 활용한 예시 문장 ${examples.length}개예요.\n${numberedExamples("near", examples)}`,
      quickCheck: "near는 한 기준점 가까이에 있을 때 씁니다.",
      followUp: "직접 하나 더 만들면: The ___ is near the ___.",
      source: "local",
    };
  }

  if (question.includes("between") && wantsExamples(question)) {
    const examples = [
      "The bank is between the school and the hospital.",
      "I sit between Mina and Joon.",
      "The cat is between the boxes.",
      "The park is between the library and the museum.",
      "My pencil is between two books.",
      "The station is between City Hall and the market.",
    ].slice(0, count);
    return {
      answer: `between을 활용한 예시 문장 ${examples.length}개예요.\n${numberedExamples("between", examples)}`,
      quickCheck: "between은 두 기준점 사이에 있을 때 씁니다.",
      followUp: "직접 하나 더 만들면: The ___ is between ___ and ___.",
      source: "local",
    };
  }

  if (question.includes("on") && wantsExamples(question)) {
    const examples = [
      "The book is on the desk.",
      "My sister puts a magazine on the box.",
      "There is a cup on the table.",
      "The picture is on the wall.",
      "My phone is on the chair.",
      "The sticker is on the notebook.",
    ].slice(0, count);
    return {
      answer: `on을 활용한 예시 문장 ${examples.length}개예요.\n${numberedExamples("on", examples)}`,
      quickCheck: "on은 표면 위에 닿아 있을 때 씁니다.",
      followUp: "직접 하나 더 만들면: The ___ is on the ___.",
      source: "local",
    };
  }

  if (question.includes("between") || question.includes("사이")) {
    return {
      answer: "between은 두 대상의 가운데나 사이를 말할 때 써요. 예문처럼 bank와 hospital 두 장소가 기준이면 between이 가장 자연스럽습니다.",
      quickCheck: "두 기준점이 보이면 between을 먼저 의심해요.",
      followUp: `다시 말해볼까요? ${keySentence}`,
      source: "local",
    };
  }

  if (question.includes("near") || question.includes("근처") || question.includes("가까")) {
    return {
      answer: "near는 정확히 사이에 있는 것이 아니라 가까운 위치를 말해요. 한 장소 주변에 있다는 느낌이면 near가 잘 맞습니다.",
      quickCheck: "기준점이 하나이고 가까움만 말하면 near예요.",
      followUp: "예: There is a park near Tiger's apartment.",
      source: "local",
    };
  }

  if (question.includes("on") || question.includes("위")) {
    return {
      answer: "on은 물건이 표면 위에 닿아 있을 때 사용해요. 상자 위, 책상 위처럼 아래에서 받쳐주는 느낌이 있으면 on을 떠올리면 됩니다.",
      quickCheck: "표면에 닿아 있으면 on을 고르세요.",
      followUp: "예: My sister puts a magazine on the box.",
      source: "local",
    };
  }

  if (question.includes("요약") || question.includes("정리") || question.includes("핵심")) {
    return {
      answer: `${payload.lectureTitle}의 핵심은 위치 관계를 먼저 보고 전치사를 고르는 거예요. 두 대상 사이면 between, 가까운 곳이면 near, 표면 위면 on입니다.`,
      quickCheck: "장소 단서의 개수와 위치 관계를 먼저 확인하세요.",
      followUp: "지금 화면에서 기준 장소가 몇 개인지 찾아볼래요?",
      source: "local",
    };
  }

  return {
    answer: "좋은 질문이에요. 지금 강의에서는 장면 속 장소 단서를 먼저 찾고, 그 관계가 사이인지, 근처인지, 위인지 판단하면 됩니다.",
    quickCheck: `오늘의 기준 문장: ${keySentence}`,
    followUp: "헷갈리는 단어가 between, near, on 중 무엇인지 한 번 더 물어봐도 좋아요.",
    source: "local",
  };
}

async function callOpenAiWatchPix(payload) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const model = process.env.OPENAI_WATCH_MODEL || process.env.OPENAI_TEACH_MODEL || defaultWatchModel;
  const response = await fetch(openAiResponsesUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions:
        "You are Pix, a friendly AI helper inside an elementary English Watch lesson. Answer in Korean with short English examples when useful. Help the student understand the current lecture without doing unrelated tutoring. Respect the student's exact requested format. If the student asks for a specific number of example sentences, provide exactly that many numbered English example sentences inside answer, with short Korean meanings if helpful. Do not replace an example-sentence request with only an explanation. Return only valid JSON with keys: answer, quickCheck, followUp.",
      input: JSON.stringify({
        lecture: {
          id: payload.lectureId,
          title: payload.lectureTitle,
          instructor: payload.instructor,
          objective: payload.objective,
          keySentence: payload.keySentence,
          captions: payload.captions,
        },
        studentQuestion: payload.question,
      }),
      max_output_tokens: 750,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed with ${response.status}: ${errorText.slice(0, 300)}`);
  }

  const result = normalizeWatchPixResult(parseJsonFromModel(extractOutputText(await response.json())));
  if (!result.answer) throw new Error("OpenAI response was empty.");
  return result;
}

export async function handleWatchPixApiRequest(request, response) {
  try {
    if (request.method !== "POST") {
      sendJson(response, 405, { error: "Watch Pix API only accepts POST requests." });
      return;
    }

    const path = new URL(request.url ?? "/", "http://localhost").pathname;
    if (path !== "/api/watch/pix") {
      sendJson(response, 404, { error: "Unknown Watch Pix API route." });
      return;
    }

    const payload = await readJson(request);
    if (!String(payload.question ?? "").trim()) {
      sendJson(response, 400, { error: "A question is required." });
      return;
    }

    try {
      sendJson(response, 200, await callOpenAiWatchPix(payload));
    } catch {
      sendJson(response, 200, buildLocalWatchPixAnswer(payload));
    }
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Watch Pix API failed.",
    });
  }
}
