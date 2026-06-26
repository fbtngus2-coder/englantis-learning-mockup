import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const openAiResponsesUrl = "https://api.openai.com/v1/responses";
const defaultTeachModel = "gpt-4.1-mini";

export function loadLocalEnv() {
  for (const filename of [".env.local", ".env"]) {
    const path = join(process.cwd(), filename);
    if (!existsSync(path)) continue;

    const text = readFileSync(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator < 0) continue;

      const key = trimmed.slice(0, separator).trim();
      const rawValue = trimmed.slice(separator + 1).trim();
      if (!key || process.env[key]) continue;
      process.env[key] = rawValue.replace(/^["']|["']$/g, "");
    }
  }
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
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

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function compactText(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[.,!?'"`“”‘’()[\]{}:;]/g, "")
    .replace(/\s+/g, "");
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function detectDeterministicMisconception(answer, step, inputConfig) {
  const compact = compactText(answer);
  const spaced = String(answer ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  const asksForReason = String(inputConfig.prompt ?? "").includes("이유") || inputConfig.inputType === "free_text";

  if (step.id !== "detect_error" && step.id !== "explain_rule" && step.id !== "npc_retry") {
    return null;
  }

  const saysGoesIsBase =
    compact.includes("goes는동사원형")
    || compact.includes("goes가동사원형")
    || compact.includes("goes은동사원형")
    || compact.includes("goes는기본형")
    || compact.includes("goes가기본형")
    || compact.includes("goes은기본형")
    || compact.includes("goes=동사원형")
    || compact.includes("goes=기본형")
    || /\bgoes\s+(is|are|means)\s+(a\s+)?(base|basic|root|plain)\s+(verb|form)\b/.test(spaced)
    || /\bgoes\s+(is|are)\s+the\s+(base|basic|root|plain)\b/.test(spaced);

  const saysLetsUsesGoes =
    compact.includes("lets뒤에는goes")
    || compact.includes("let's뒤에는goes")
    || compact.includes("lets다음에는goes")
    || compact.includes("let's다음에는goes")
    || /\bafter\s+lets?\s+use\s+goes\b/.test(spaced)
    || /\bafter\s+let's\s+use\s+goes\b/.test(spaced);

  const saysGoIsWrong =
    compact.includes("go는틀")
    || compact.includes("go가틀")
    || compact.includes("go은틀")
    || /\bgo\s+is\s+wrong\b/.test(spaced);

  if (saysGoesIsBase || saysLetsUsesGoes || saysGoIsWrong) {
    return {
      reason: "off_topic_or_contradictory_rule",
      npcMessage: "I am still confused. That explanation is about another grammar rule, not today's place clue.",
      pixGuide: "오늘은 between / near / on 단원이에요. 두 장소 사이인지, 한 장소 근처인지, 표면 위에 닿아 있는지를 기준으로 다시 설명해 주세요.",
      teacherNote: "학생 답변이 오늘 위치 전치사 단원과 맞지 않는 다른 문법 설명으로 흘러 오답 처리했습니다.",
    };
  }

  const saysNearForTwoPlaces =
    (compact.includes("bank") && compact.includes("hospital") && compact.includes("near") && !compact.includes("between"))
    || compact.includes("두장소사이는near")
    || compact.includes("두곳사이는near")
    || /\btwo\s+places?\s+.*\bnear\b/.test(spaced);

  const saysBetweenMeansClose =
    compact.includes("between은근처")
    || compact.includes("between은가까")
    || /\bbetween\s+(means|is)\s+(near|close)\b/.test(spaced);

  const saysOnIsOnlyNear =
    (compact.includes("magazine") && compact.includes("box") && compact.includes("near") && !compact.includes("on"))
    || compact.includes("on은근처")
    || compact.includes("on은사이");

  if (saysNearForTwoPlaces || saysBetweenMeansClose || saysOnIsOnlyNear) {
    return {
      reason: "preposition_misconception",
      npcMessage: "I am still confused. The place clue and the preposition do not match yet.",
      pixGuide: "장소 단서와 전치사 설명이 서로 맞아야 통과할 수 있어요. 두 장소 사이면 between, 한 장소 근처면 near, 표면 위에 닿으면 on으로 다시 설명해 주세요.",
      teacherNote: "학생 답변에 between / near / on 의미가 뒤섞인 설명이 포함되어 오답 처리했습니다.",
    };
  }

  if (asksForReason && inputConfig.inputType === "free_text") {
    const hasOffTopicLetsSentence = hasAny(compact, [/letsgotoschool/, /letsgotoschool/]);
    const hasOffTopicReasonSignal = hasAny(compact, [
      /동사원형/,
      /기본형/,
      /baseverb/,
      /baseform/,
      /withouts/,
      /s를빼/,
      /s가붙지/,
      /s없이/,
    ]);

    if (hasOffTopicLetsSentence && !hasOffTopicReasonSignal) {
      return {
        reason: "off_topic_sentence",
        npcMessage: "I can read that sentence, but it does not teach me today's place words.",
        pixGuide: "오늘 TeachAI는 between / near / on을 설명하는 미션이에요. bank, hospital, apartment, box 같은 위치 단서로 다시 말해 주세요.",
        teacherNote: "자유 설명 단계에서 오늘 단원과 다른 Let's 문장이 제시되어 오답 처리했습니다.",
      };
    }

    const hasCorrectPrepositionSentence = hasAny(compact, [
      /heisstandingbetweenabankandahospital/,
      /themagazineisonthebox/,
      /mysisterputsamagazineonthebox/,
    ]);
    const hasPrepositionReason = hasAny(compact, [
      /사이/,
      /두장소/,
      /두곳/,
      /twoplaces/,
      /between.*and/,
      /표면/,
      /위/,
      /touch/,
      /surface/,
      /가까/,
      /근처/,
    ]);

    if (hasCorrectPrepositionSentence && !hasPrepositionReason) {
      return {
        reason: "missing_preposition_reason",
        npcMessage: "I can copy the sentence, but I do not understand the place clue yet.",
        pixGuide: "문장은 맞았지만 이유 설명이 부족해요. 왜 between, near, on 중 그 전치사를 골랐는지 장소 단서까지 말해주세요.",
        teacherNote: "자유 설명 단계에서 정답 문장만 제시되고 위치 전치사 이유 설명 신호가 부족해 오답 처리했습니다.",
      };
    }
  }

  return null;
}

function buildRejectedTeachResult(rejection, step, inputConfig, answer) {
  return {
    isCorrect: false,
    scoreDelta: 0,
    nextStep: step.type,
    npcMessage: rejection.npcMessage,
    pixGuide: rejection.pixGuide,
    teacherNote: rejection.teacherNote,
    normalizedAnswer: String(answer ?? "").trim(),
    studentInputType: inputConfig.inputType,
    choices: inputConfig.choices ?? [],
    blankPrompt: inputConfig.starter ?? null,
    hint: step.hintLadder[0] ?? "",
    npcStateUpdate: {
      understandingDelta: 0,
      confidenceDelta: 0,
    },
    evaluation: {
      [step.skillKey]: 45,
    },
  };
}

async function callOpenAiJson(context) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const model = process.env.OPENAI_TEACH_MODEL || defaultTeachModel;
  const response = await fetch(openAiResponsesUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions:
        "You are TeachAI for an elementary English learning app. Evaluate whether the student successfully teaches the NPC for the current step. Accept Korean or English explanations. Return only valid JSON with these keys: isCorrect, npcMessage, pixGuide, teacherNote, scoreDelta, understandingDelta, confidenceDelta. npcMessage must be English as the NPC. pixGuide and teacherNote must be Korean. If incorrect, all deltas must be 0. Critical grading rule: if the student includes a correct sentence but gives an incorrect or contradictory grammar explanation, mark isCorrect false. For the current between / near / on unit, between is for two reference points or the middle of two things, near is close to one reference point, and on is touching a surface. Do not accept answers that say near is correct for a two-place between sentence, or that on means near/between.",
      input: JSON.stringify(context),
      max_output_tokens: 700,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed with ${response.status}: ${errorText.slice(0, 300)}`);
  }

  const payload = await response.json();
  return parseJsonFromModel(extractOutputText(payload));
}

function normalizeTeachMessageResult(modelResult, step, inputConfig, answer) {
  const isCorrect = Boolean(modelResult.isCorrect);
  const scoreDelta = isCorrect ? clampNumber(modelResult.scoreDelta, 0, step.scoreDelta, step.scoreDelta) : 0;
  const understandingDelta = isCorrect
    ? clampNumber(modelResult.understandingDelta, 0, step.understandingDelta, step.understandingDelta)
    : 0;
  const confidenceDelta = isCorrect
    ? clampNumber(modelResult.confidenceDelta, 0, step.confidenceDelta, step.confidenceDelta)
    : 0;

  return {
    isCorrect,
    scoreDelta,
    nextStep: isCorrect ? "complete" : step.type,
    npcMessage: String(
      modelResult.npcMessage
        || (isCorrect ? step.npcSuccessLine : step.npcRetryLine),
    ),
    pixGuide: String(
      modelResult.pixGuide
        || (isCorrect ? "좋아요. NPC가 방금 배운 규칙을 받아들이고 있어요." : "아직 설명이 부족해요. 핵심 규칙을 다시 말해보세요."),
    ),
    teacherNote: String(
      modelResult.teacherNote
        || (isCorrect ? step.teacherNote : "아직 설명 신호가 부족합니다. 예시와 규칙을 다시 연결해보세요."),
    ),
    normalizedAnswer: String(modelResult.normalizedAnswer || answer).trim(),
    studentInputType: inputConfig.inputType,
    choices: inputConfig.choices ?? [],
    blankPrompt: inputConfig.starter ?? null,
    hint: step.hintLadder[0] ?? "",
    npcStateUpdate: {
      understandingDelta,
      confidenceDelta,
    },
    evaluation: {
      [step.skillKey]: isCorrect ? Math.max(65, scoreDelta * 4) : 45,
    },
  };
}

async function handleTeachMessage(payload) {
  const { lesson, step, teachLevel, studentMessage, conversationHistory = [], hintLevel = 0 } = payload;
  if (!lesson || !step) {
    return {
      status: 400,
      body: { error: "TeachAI message requests must include lesson and step context." },
    };
  }

  const inputConfig = step.inputByLevel[String(teachLevel)] || step.inputByLevel[teachLevel] || step.inputByLevel[2];
  const deterministicRejection = detectDeterministicMisconception(studentMessage, step, inputConfig);
  if (deterministicRejection) {
    return {
      status: 200,
      body: buildRejectedTeachResult(deterministicRejection, step, inputConfig, studentMessage),
    };
  }

  const modelResult = await callOpenAiJson({
    lesson: {
      title: lesson.title,
      targetGrammar: lesson.targetGrammar,
      koreanMeaning: lesson.koreanMeaning,
      successConcept: lesson.successConcept,
      keyRules: lesson.keyRules,
      correctExamples: lesson.correctExamples,
      misconceptionBank: lesson.misconceptionBank,
    },
    step: {
      id: step.id,
      type: step.type,
      title: step.title,
      expectedAction: step.expectedAction,
      npcLine: step.npcLine,
      inputConfig,
      teacherNote: step.teacherNote,
      scoreDelta: step.scoreDelta,
      understandingDelta: step.understandingDelta,
      confidenceDelta: step.confidenceDelta,
    },
    teachLevel,
    studentMessage,
    conversationHistory,
    hintLevel,
  });

  return {
    status: 200,
    body: normalizeTeachMessageResult(modelResult, step, inputConfig, studentMessage),
  };
}

function handleTeachStart(payload) {
  return {
    status: 200,
    body: {
      sessionId: `teach_openai_${Date.now()}`,
      lessonId: payload.lessonId,
      teachLevel: 2,
      currentStep: "detect_error",
      npc: {
        npcId: "npc_milo_001",
        npcName: "Milo",
        understanding: 30,
      confidence: 35,
      },
      npcMessage: "I wrote a sentence! \"He is standing near a bank and a hospital.\" Is it right?",
      pixGuide: "NPC의 위치 전치사 오개념을 고쳐주며 TeachAI를 시작합니다.",
      studentInputType: "typing",
    },
  };
}

function handleTeachEvaluate(payload) {
  const correctItems = (payload.stepResults ?? []).filter((item) => item.correct).length;
  const independence = Math.max(45, 100 - Number(payload.hintUsed ?? 0) * 12);

  return {
    status: 200,
    body: {
      teachScore: Math.min(100, correctItems * 20 + Math.round(independence * 0.2)),
      correctionSkill: 80,
      explanationSkill: 80,
      exampleSkill: 80,
      validationSkill: 80,
      independence,
      studentSummary: "NPC에게 오늘 배운 규칙을 설명했습니다.",
      parentSummary: "학생이 배운 내용을 다른 대상에게 설명하며 이해를 확인했습니다.",
      teacherSummary: "TeachAI 서버 평가가 완료되었습니다.",
      nextRecommendation: "다음에는 힌트를 줄이고 자유 설명을 늘려보세요.",
    },
  };
}

export async function handleTeachApiRequest(request, response) {
  try {
    if (request.method !== "POST") {
      sendJson(response, 405, { error: "TeachAI API only accepts POST requests." });
      return;
    }

    const path = new URL(request.url ?? "/", "http://localhost").pathname;
    const payload = await readJson(request);
    const result =
      path === "/api/teach/start"
        ? handleTeachStart(payload)
        : path === "/api/teach/message"
          ? await handleTeachMessage(payload)
          : path === "/api/teach/evaluate"
            ? handleTeachEvaluate(payload)
            : { status: 404, body: { error: "Unknown TeachAI API route." } };

    sendJson(response, result.status, result.body);
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "TeachAI API failed.",
    });
  }
}
