const { spawn } = require("child_process");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { randomUUID } = require("crypto");

// Recordings play in every browser (round 10, Sheriff 2026-11-19).
//
// Chrome, Android and Firefox record webm/ogg (Opus), which iPhone Safari
// and older Safari can't play: the feedback page said "couldn't play on this
// device" and the play buttons on Home and Practice history did nothing.
// Every recording is now kept as AAC in an .m4a file, which all browsers
// play. ffmpeg comes from the ffmpeg-static package (no system install
// needed on Render); a system ffmpeg is used if that package is missing.
let FFMPEG = "ffmpeg";
try {
  FFMPEG = require("ffmpeg-static") || "ffmpeg";
} catch {
  /* fall back to ffmpeg on the PATH */
}

const PLAYABLE_TYPES = ["audio/mp4", "audio/x-m4a", "audio/m4a", "audio/aac", "audio/mpeg"];

// True when every browser can already play this file as it is.
function isPlayableEverywhere(contentType = "", url = "") {
  const type = String(contentType).split(";")[0].trim().toLowerCase();
  if (type) return PLAYABLE_TYPES.includes(type);
  return /\.(m4a|mp4|aac|mp3)(\?|$)/i.test(url);
}

function run(args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(FFMPEG, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (d) => {
      stderr = (stderr + d).slice(-2000);
    });
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with ${code}: ${stderr}`));
    });
  });
}

// Any audio buffer -> AAC .m4a buffer (mono, 64 kbps: clear speech, small).
async function toM4a(buffer, { timeoutMs = 60_000 } = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loquiex-audio-"));
  const input = path.join(dir, `${randomUUID()}.in`);
  const output = path.join(dir, `${randomUUID()}.m4a`);
  try {
    await fs.writeFile(input, buffer);
    await run(
      [
        "-hide_banner",
        "-loglevel", "error",
        "-y",
        "-i", input,
        "-vn",
        "-ac", "1",
        "-c:a", "aac",
        "-b:a", "64k",
        "-movflags", "+faststart",
        output,
      ],
      timeoutMs,
    );
    return await fs.readFile(output);
  } finally {
    fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = { toM4a, isPlayableEverywhere };
