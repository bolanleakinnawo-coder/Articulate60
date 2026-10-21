// Sends audio to Deepgram and returns the transcript plus word-level timing.
// Uses Node's built-in fetch (Node 18+), so no extra package is needed.

async function transcribeAudio(buffer, mimeType = "audio/webm") {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) throw new Error("DEEPGRAM_API_KEY is not set");

  const params = new URLSearchParams({
    model: process.env.DEEPGRAM_MODEL || "nova-3",
    language: "en",
    smart_format: "true",
    punctuate: "true",
    filler_words: "true", // keep "um" / "uh" so we can count them
  });

  // Ask Deepgram not to use this audio to improve its models.
  // Set DEEPGRAM_MIP_OPT_OUT=false in .env only if you want to turn this off.
  if (process.env.DEEPGRAM_MIP_OPT_OUT !== "false") {
    params.set("mip_opt_out", "true");
  }

  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${key}`,
      "Content-Type": mimeType || "audio/webm",
    },
    body: buffer,
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Deepgram ${res.status}: ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  const alt = data?.results?.channels?.[0]?.alternatives?.[0];

  return {
    transcript: alt?.transcript || "",
    words: alt?.words || [],
  };
}

module.exports = { transcribeAudio };
