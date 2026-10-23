// The ONLY file that talks to Gemini. If you ever switch AI providers,
// this is the one file to change. It receives text only (never audio).

const fs = require("node:fs");
const path = require("node:path");

const LOQUIEX_GUIDE = fs.readFileSync(
  path.join(__dirname, "loquiex-guide.md"),
  "utf8",
);

const { GoogleGenAI, Type, ThinkingLevel } = require("@google/genai");

const SCORE_KEYS = [
  "grammar",
  "vocabulary",
  "structure",
  "clarity",
  "repetition",
  "pace",
  "pauses",
  "fillers",
];

const SYSTEM_INSTRUCTION = `${LOQUIEX_GUIDE}

IMPLEMENTATION CONTRACT

The complete Loquiex guide above is authoritative for teaching philosophy,
diagnostic reasoning, assessment, evidence, corrections and coaching.

Follow every applicable instruction in the guide. Do not replace its
principles with generic grammar-checking or public-speaking advice.

The following requirements define the existing application's data
contract. They do not replace or override the guide's teaching philosophy.

1. Assess all eight criteria in their required order:
grammar, vocabulary, structure, clarity, repetition, pace, pauses, fillers.

2. Return numeric scores from 1 to 10 only for the five AI-scored
criteria: grammar, vocabulary, structure, clarity and repetition.

3. Return notes for all eight criteria. Use verified measurements for
pace, pauses and fillers. Do not invent missing measurements or
classify a measurement as a problem without evidence.

4. Review the complete transcript. Return all meaningful,
evidence-supported findings without an arbitrary correction limit.
Do not manufacture errors to fill categories.

5. Every correction must preserve intended meaning and include:
original, better, why, type and criterion.
Allowed types: genuine_error, optional_suggestion, observation.
Allowed criteria: grammar, vocabulary, structure, clarity, repetition,
pace, pauses, fillers.
Include tryItYourself when useful.

6. Return biggestOpportunity as an object containing:
title, focus, evidence, whyItMatters and technique.
The focus must be form, shape or deliver, whichever is appropriate.

7. Return clearerVersion as a string. Use an empty string if a
full revised response would not add meaningful value.

8. Return nextSkill as an object containing name and action.
Recommend exactly one next skill.

9. Return evidenceNote as a string. Use an empty string when no
additional evidence limitation needs to be explained.

10. Return summary and topTip as strings. The topTip must be
consistent with the single priority identified in biggestOpportunity.

11. Return only valid JSON matching the supplied response schema.
Do not add Markdown fences or properties outside that schema.
`;

const CORRECTION_TYPES = [
  "genuine_error",
  "optional_suggestion",
  "observation",
];

const FOCUS_TYPES = ["form", "shape", "deliver"];

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    scores: {
      type: Type.OBJECT,
      properties: Object.fromEntries(
        SCORE_KEYS.map((key) => [key, { type: Type.INTEGER }]),
      ),
      required: SCORE_KEYS,
    },
    notes: {
      type: Type.OBJECT,
      properties: Object.fromEntries(
        [...SCORE_KEYS, "pace", "pauses", "fillers"].map((key) => [
          key,
          { type: Type.STRING },
        ]),
      ),
      required: [...SCORE_KEYS, "pace", "pauses", "fillers"],
    },
    corrections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          original: { type: Type.STRING },
          better: { type: Type.STRING },
          why: { type: Type.STRING },
          type: {
            type: Type.STRING,
            enum: CORRECTION_TYPES,
          },
          criterion: {
            type: Type.STRING,
            enum: [...SCORE_KEYS, "pace", "pauses", "fillers"],
          },
          tryItYourself: { type: Type.STRING },
        },
        required: ["original", "better", "why", "type", "criterion"],
      },
    },
    biggestOpportunity: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        focus: {
          type: Type.STRING,
          enum: FOCUS_TYPES,
        },
        evidence: { type: Type.STRING },
        whyItMatters: { type: Type.STRING },
        technique: { type: Type.STRING },
      },
      required: ["title", "focus", "evidence", "whyItMatters", "technique"],
    },
    clearerVersion: { type: Type.STRING },
    nextSkill: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        action: { type: Type.STRING },
      },
      required: ["name", "action"],
    },
    evidenceNote: { type: Type.STRING },
    topTip: { type: Type.STRING },
  },
  required: [
    "summary",
    "scores",
    "notes",
    "corrections",
    "biggestOpportunity",
    "clearerVersion",
    "nextSkill",
    "evidenceNote",
    "topTip",
  ],
};

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("Gemini request timed out")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function buildPrompt({ transcript, topic, category, level, metrics }) {
  const m = metrics || {};
  return `Topic: ${topic || "(not given)"}
Category: ${category || "(not given)"}
Difficulty level: ${level ?? "(not given)"}

Measurements from code (do not recalculate; use them as context):
- Words per minute: ${m.wordsPerMinute ?? "unknown"} (${m.paceLabel || "unknown"})
- Filler sounds (um, uh...): ${m.fillers?.total ?? "unknown"}
- Long pauses (1s or more): ${(m.pauses?.long ?? 0) + (m.pauses?.veryLong ?? 0)}
- Immediate word repeats: ${m.repetition?.immediateRepeats ?? 0}
- Frequently repeated words: ${
    (m.repetition?.frequentWords || [])
      .map((w) => `${w.word} x${w.count}`)
      .join(", ") || "none"
  }

<transcript>
${transcript}
</transcript>`;
}

// Make sure the model's answer is safe to store and show.
function sanitise(raw, transcript) {
  const str = (value) => (typeof value === "string" ? value.trim() : "");

  const validScore = (value) =>
    Number.isInteger(value) && value >= 1 && value <= 10;

  const lowerTranscript = transcript.toLowerCase();

  const scores = {};
  const notes = {};

  for (const key of SCORE_KEYS) {
    if (!validScore(raw?.scores?.[key])) {
      throw new Error(`Invalid Gemini score: ${key}`);
    }

    scores[key] = raw.scores[key];
  }

  for (const key of [...SCORE_KEYS, "pace", "pauses", "fillers"]) {
    notes[key] = str(raw?.notes?.[key]);
  }

  const validTypes = new Set(CORRECTION_TYPES);
  const validCriteria = new Set([...SCORE_KEYS, "pace", "pauses", "fillers"]);

  const corrections = (Array.isArray(raw?.corrections) ? raw.corrections : [])
    .map((c) => ({
      original: str(c?.original),
      better: str(c?.better),
      why: str(c?.why),
      type: str(c?.type),
      criterion: str(c?.criterion),
      tryItYourself: str(c?.tryItYourself),
    }))
    .filter(
      (c) =>
        c.original &&
        c.better &&
        c.why &&
        validTypes.has(c.type) &&
        validCriteria.has(c.criterion) &&
        lowerTranscript.includes(c.original.toLowerCase()),
    );

  const opportunity = raw?.biggestOpportunity || {};
  const nextSkill = raw?.nextSkill || {};

  return {
    summary: str(raw?.summary),
    scores,
    notes,
    corrections,
    biggestOpportunity: {
      title: str(opportunity.title),
      focus: FOCUS_TYPES.includes(opportunity.focus)
        ? opportunity.focus
        : "shape",
      evidence: str(opportunity.evidence),
      whyItMatters: str(opportunity.whyItMatters),
      technique: str(opportunity.technique),
    },
    clearerVersion: str(raw?.clearerVersion),
    nextSkill: {
      name: str(nextSkill.name),
      action: str(nextSkill.action),
    },
    evidenceNote: str(raw?.evidenceNote),
    topTip: str(raw?.topTip),
  };
}

function isOverloaded(err) {
  return (
    err?.status === 503 ||
    /UNAVAILABLE|"code":\s*503/.test(String(err?.message || ""))
  );
}

function isTimeout(err) {
  return (
    err?.name === "TimeoutError" ||
    err?.name === "AbortError" ||
    /timed out|timeout/i.test(String(err?.message || ""))
  );
}

// "Gemini is too busy or too slow right now" (as opposed to a bad key, quota...)
function isBusy(err) {
  return isOverloaded(err) || isTimeout(err);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Gemini 3 models "think" before answering. The default depth (medium) is slow
// and costs extra output tokens, which is too much for short speech feedback.
// We use "low" unless you set GEMINI_THINKING_LEVEL in .env (low / medium / high).
function thinkingConfigFor(model) {
  if (!/^gemini-3/.test(model)) return undefined; // older models use a different setting
  const wanted = (process.env.GEMINI_THINKING_LEVEL || "low").toUpperCase();
  return { thinkingLevel: ThinkingLevel?.[wanted] ?? wanted };
}

// What goes wrong with Gemini, and what we do about it:
//  - 503 "high demand": retry the same model a few times with a growing pause
//    (plus a little random jitter), then move on to the backup model.
//  - No answer within GEMINI_TIMEOUT_MS (default 25s): the model is too slow right
//    now, so give up on it at once and try the backup model instead of waiting again.
//  - Backup model: GEMINI_FALLBACK_MODEL (default gemini-3.1-flash-lite);
//    set it to "none" to turn the backup off.
//  - Whole thing stops after about 75 seconds so the app never waits forever
//    (the app itself gives up at 90 seconds).
//  - Other errors (bad key, quota) fail straight away, because retrying won't help.
async function generateWithRetry(ai, request) {
  const models = [process.env.GEMINI_MODEL || "gemini-3.8-flash"];
  const fallback = process.env.GEMINI_FALLBACK_MODEL ?? "gemini-3.1-flash-lite";
  if (fallback && fallback.toLowerCase() !== "none" && fallback !== models[0]) {
    models.push(fallback);
  }
  const baseDelay = Number(process.env.GEMINI_RETRY_BASE_MS) || 2000;
  const perCallMs = Number(process.env.GEMINI_TIMEOUT_MS) || 25_000;
  const budgetMs = Number(process.env.GEMINI_TOTAL_BUDGET_MS) || 75_000;
  const deadline = Date.now() + budgetMs;
  const attempts = 4;

  let busyError = null;
  let slowError = null;
  let otherError = null;

  for (let m = 0; m < models.length; m++) {
    const model = models[m];
    const thinkingConfig = thinkingConfigFor(model);

    for (let attempt = 0; attempt < attempts; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining < 3000) break; // out of time for this model

      const callMs = Math.min(perCallMs, remaining);
      const config = {
        ...request.config,
        ...(thinkingConfig ? { thinkingConfig } : {}),
        abortSignal: AbortSignal.timeout(callMs), // really cancels the request
      };

      try {
        const started = Date.now();
        const response = await withTimeout(
          ai.models.generateContent({ ...request, model, config }),
          callMs + 1000,
        );
        // Timing and token counts only, never the speech or feedback text.
        const usage = response.usageMetadata || {};
        console.log(
          `Gemini ${model} answered in ${((Date.now() - started) / 1000).toFixed(1)}s ` +
            `(thinking tokens: ${usage.thoughtsTokenCount ?? "n/a"}, ` +
            `output tokens: ${usage.candidatesTokenCount ?? "n/a"})`,
        );
        return response;
      } catch (err) {
        if (isTimeout(err)) {
          slowError = err;
          console.warn(
            `Gemini slow (${model}): no answer in ${Math.round(callMs / 1000)}s, moving on`,
          );
          break; // don't wait on the same slow model again
        }
        if (!isOverloaded(err)) {
          if (m === 0) throw err; // problem with the main model setup: stop now
          console.warn(
            `Backup model ${model} failed: ${String(err.message).slice(0, 120)}`,
          );
          otherError = err;
          break; // backup unusable, don't retry it
        }
        busyError = err;
        console.warn(
          `Gemini busy (${model}), attempt ${attempt + 1}/${attempts}`,
        );
        if (attempt < attempts - 1) {
          const jitter = Math.random() * 500;
          await sleep(baseDelay * 2 ** attempt + jitter);
        }
      }
    }
  }
  throw (
    busyError ||
    slowError ||
    otherError ||
    new Error("Gemini request timed out")
  );
}

async function analyzeSpeech({ transcript, topic, category, level, metrics }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const ai = new GoogleGenAI({ apiKey });

  const response = await generateWithRetry(ai, {
    contents: buildPrompt({ transcript, topic, category, level, metrics }),
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      // No temperature set on purpose: Gemini 3 models work best at the default.
    },
  });

  let parsed;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    throw new Error("Gemini returned a response that wasn't valid JSON");
  }

  return sanitise(parsed, transcript);
}

module.exports = { analyzeSpeech, sanitise, generateWithRetry, isBusy };
