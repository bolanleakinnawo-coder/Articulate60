// Quick Gemini speed test. No recording, database or app needed.
//   node scripts/ping-gemini.js
// Tries each model with a tiny request, same settings the app uses, and prints
// how long it took or what went wrong. Uses the GEMINI_API_KEY in your .env.

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { GoogleGenAI, Type, ThinkingLevel } = require("@google/genai");

const MODELS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["gemini-3.8-flash", "gemini-3.1-flash-lite"];

(async () => {
  if (!process.env.GEMINI_API_KEY) {
    console.log("GEMINI_API_KEY is not set in .env");
    process.exit(1);
  }
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  for (const model of MODELS) {
    const started = Date.now();
    try {
      const response = await ai.models.generateContent({
        model,
        contents: "Give one short tip for speaking clearly.",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: { tip: { type: Type.STRING } },
            required: ["tip"],
          },
          ...(model.startsWith("gemini-3")
            ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
            : {}),
          abortSignal: AbortSignal.timeout(40_000),
        },
      });
      const secs = ((Date.now() - started) / 1000).toFixed(1);
      const u = response.usageMetadata || {};
      console.log(
        `${model}: OK in ${secs}s (thinking tokens: ${u.thoughtsTokenCount ?? "n/a"})`,
      );
    } catch (err) {
      const secs = ((Date.now() - started) / 1000).toFixed(1);
      console.log(
        `${model}: FAILED after ${secs}s -> ${String(err.message).slice(0, 160)}`,
      );
    }
  }
})();
