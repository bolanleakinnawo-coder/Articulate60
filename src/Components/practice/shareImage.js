import brandLogo from "../../assets/brandlogo.PNG";

// Builds the shareable "I just finished a speaking practice!" image on a
// canvas. Two versions, picked from the real result:
//   - score: "MY SPEAKING SCORE" out of 100, time spoken, and a quick look at
//     progress (strongest skill + next focus) when AI feedback exists;
//   - time:  "TIME SPENT SPEAKING" when there is no feedback score.
// Colours are the Home tab palette from src/styles/globals.css.

const W = 1080;
const MIN_H = 1620; // 2:3, same shape as the design
const PAD = 100; // text inset from the image edge
const FONT =
  'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const C = {
  page: "#0e0f11", // --bg-primary
  card: "#131513", // --bg-card
  border: "#30302a", // --border
  tile: "#1e2019", // --pf-tile on --bg-card
  olive: "#646742", // --olive-primary
  accent: "#b3b083", // light olive used for labels on the Profile pages
  track: "rgba(121, 119, 78, 0.28)", // --olive-bright, faded
  text: "#f1ecde", // --text-primary
  textSoft: "#a9a392", // --text-secondary
};

// The logo artwork sits in the middle of a 2000 x 2000 transparent canvas.
const LOGO_CROP = { x: 716, y: 886, w: 493, h: 305, canvas: 2000 };

// ---------- the member's own invite link ----------

export function getStoredUser() {
  for (const store of [localStorage, sessionStorage]) {
    try {
      const user = JSON.parse(store.getItem("user"));
      if (user) return user;
    } catch {
      /* ignore */
    }
  }
  return null;
}

// Same link as Profile > Invite & Earn, so referrals land in one place.
export function getInviteLink(user = getStoredUser()) {
  const origin = window.location.origin;
  const username = user?.username;
  return username
    ? `${origin}/register?ref=${encodeURIComponent(username)}`
    : `${origin}/register`;
}

export function getShareCaption(user) {
  return `I just finished a speaking practice on Loquiex. I'm using it to improve my communication skills. Join me: ${getInviteLink(user)}`;
}

// ---------- helpers ----------

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.includes(" "))
      last = last.slice(0, last.lastIndexOf(" "));
    kept[maxLines - 1] = `${last}…`;
    return kept;
  }
  return lines;
}

// Letter-spaced uppercase label. align: "left" | "center" | "right".
function spaced(ctx, text, x, y, spacing, align = "center") {
  const chars = [...text];
  const width =
    chars.reduce((sum, ch) => sum + ctx.measureText(ch).width, 0) +
    spacing * (chars.length - 1);
  let cursor =
    align === "left" ? x : align === "right" ? x - width : x - width / 2;
  const prev = ctx.textAlign;
  ctx.textAlign = "left";
  for (const ch of chars) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + spacing;
  }
  ctx.textAlign = prev;
}

// Fit text to a width by stepping the font size down.
function fitFont(ctx, text, weight, size, minSize, maxWidth) {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  while (s > minSize && ctx.measureText(text).width > maxWidth) {
    s -= 1;
    ctx.font = `${weight} ${s}px ${FONT}`;
  }
  return s;
}

export function formatClock(total) {
  const s = Math.max(0, Math.round(Number(total) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function formatDuration(total) {
  const s = Math.max(0, Math.round(Number(total) || 0));
  if (s < 60) return `${s} sec`;
  const m = Math.floor(s / 60);
  return s % 60 ? `${m} min ${s % 60} sec` : `${m} min`;
}

// Small line icons, drawn so they look the same on every phone.
function drawCheck(ctx, x, y, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.13;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x, y - size * 0.4);
  ctx.lineTo(x + size * 0.35, y - size * 0.05);
  ctx.lineTo(x + size, y - size * 0.8);
  ctx.stroke();
  ctx.restore();
}

function drawTarget(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 0.18;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.48, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawClock(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 0.16;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.55);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx + r * 0.4, cy + r * 0.3);
  ctx.stroke();
  ctx.restore();
}

function drawArrow(ctx, x, y, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2.5, size * 0.16);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + size, y - size);
  ctx.moveTo(x + size * 0.3, y - size);
  ctx.lineTo(x + size, y - size);
  ctx.lineTo(x + size, y - size * 0.3);
  ctx.stroke();
  ctx.restore();
}

async function drawLogo(ctx, x, y, drawW) {
  const drawH = Math.round((drawW * LOGO_CROP.h) / LOGO_CROP.w);
  try {
    const logo = await loadImage(brandLogo);
    const k = logo.naturalWidth / LOGO_CROP.canvas;
    const off = document.createElement("canvas");
    off.width = drawW;
    off.height = drawH;
    const octx = off.getContext("2d");
    octx.drawImage(
      logo,
      LOGO_CROP.x * k,
      LOGO_CROP.y * k,
      LOGO_CROP.w * k,
      LOGO_CROP.h * k,
      0,
      0,
      drawW,
      drawH,
    );
    // The head outline is dark ink; lift it to cream so it shows on the card.
    const pixels = octx.getImageData(0, 0, drawW, drawH);
    const d = pixels.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 0 && d[i] + d[i + 1] + d[i + 2] < 150) {
        d[i] = 241;
        d[i + 1] = 236;
        d[i + 2] = 222;
      }
    }
    octx.putImageData(pixels, 0, 0);
    ctx.drawImage(off, x, y);
  } catch {
    ctx.fillStyle = C.text;
    ctx.font = `800 64px ${FONT}`;
    ctx.textAlign = "left";
    ctx.fillText("loquiex", x, y + drawH * 0.85);
    ctx.textAlign = "center";
  }
  return drawH;
}

// ---------- the image ----------

/**
 * @param {object} p
 * @param {number|null} p.score  0-100 overall score, or null for the time version
 * @param {number} p.seconds     real speaking time
 * @param {string} [p.strength]  what went well (score version)
 * @param {string} [p.focus]     next focus (score version)
 * @param {object} [p.user]      signed-in user (for the invite link)
 */
export async function renderShareImage({ score, seconds, strength, focus, user }) {
  if (document.fonts?.ready) await document.fonts.ready.catch(() => {});

  const hasScore = typeof score === "number" && Number.isFinite(score);
  const secs = Math.max(0, Math.round(Number(seconds) || 0));

  // Content is drawn first on a tall transparent layer so the image can grow
  // when a long "next focus" needs two lines; the card is then sized to fit.
  const layer = document.createElement("canvas");
  layer.width = W;
  layer.height = 2400;
  const ctx = layer.getContext("2d");
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const inner = W - PAD * 2;

  // Header: main logo + MY PROGRESS
  const logoY = 96;
  const logoH = await drawLogo(ctx, PAD - 6, logoY, 220);
  ctx.fillStyle = C.accent;
  ctx.font = `700 26px ${FONT}`;
  spaced(ctx, "MY PROGRESS", W - PAD, logoY + logoH * 0.82, 2, "right");

  // Title
  let y = logoY + logoH + 92;
  ctx.fillStyle = C.text;
  ctx.font = `700 68px ${FONT}`;
  ctx.fillText("I just finished a", W / 2, y);
  y += 82;
  ctx.fillText("speaking practice!", W / 2, y);

  // Ring
  const r = 172;
  const cx = W / 2;
  const cy = y + 62 + r;
  ctx.lineWidth = 18;
  ctx.lineCap = "round";
  ctx.strokeStyle = C.track;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  const pct = hasScore ? Math.min(1, Math.max(0, score / 100)) : 1;
  if (pct > 0) {
    ctx.strokeStyle = C.accent;
    ctx.beginPath();
    if (pct >= 1) ctx.arc(cx, cy, r, 0, Math.PI * 2);
    else ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
    ctx.stroke();
  }

  const big = hasScore
    ? String(Math.round(score))
    : secs >= 60
      ? formatClock(secs)
      : String(secs);
  const small = hasScore
    ? "OUT OF 100"
    : secs >= 60
      ? "MINUTES"
      : secs === 1
        ? "SECOND"
        : "SECONDS";
  ctx.fillStyle = C.text;
  ctx.font = `700 ${hasScore ? 124 : 104}px ${FONT}`;
  ctx.fillText(big, cx, cy + 26);
  ctx.fillStyle = C.textSoft;
  ctx.font = `500 30px ${FONT}`;
  spaced(ctx, small, cx, cy + 80, 1);

  // Label under the ring
  y = cy + r + 70;
  ctx.fillStyle = C.accent;
  ctx.font = `700 30px ${FONT}`;
  spaced(ctx, hasScore ? "MY SPEAKING SCORE" : "TIME SPENT SPEAKING", W / 2, y, 1.5);

  if (hasScore && secs > 0) {
    y += 54;
    ctx.font = `500 30px ${FONT}`;
    const text = formatDuration(secs);
    const tw = ctx.measureText(text).width;
    const iconR = 14;
    const startX = W / 2 - (tw + iconR * 2 + 14) / 2;
    drawClock(ctx, startX + iconR, y - 10, iconR, C.textSoft);
    ctx.fillStyle = C.textSoft;
    ctx.textAlign = "left";
    ctx.fillText(text, startX + iconR * 2 + 14, y);
    ctx.textAlign = "center";
  }

  // Panel: quick look at progress (score) or encouragement (time)
  const showProgress = hasScore && (strength || focus);
  const panelX = PAD - 20;
  const panelW = W - panelX * 2;
  const textX = panelX + 40;
  const textW = panelW - 80;
  const rows = [];
  ctx.font = `500 30px ${FONT}`;
  if (showProgress) {
    if (strength)
      rows.push({ icon: "check", lines: wrapLines(ctx, strength, textW - 50, 2) });
    if (focus)
      rows.push({
        icon: "target",
        lines: wrapLines(ctx, `Next focus: ${focus}`, textW - 50, 2),
      });
  } else {
    rows.push({
      icon: null,
      lines: wrapLines(
        ctx,
        "I'm building my confidence and getting better at expressing my thoughts.",
        textW,
        3,
      ),
    });
  }
  const lineH = 44;
  const rowGap = 14;
  const bodyH =
    rows.reduce((sum, row) => sum + row.lines.length * lineH, 0) +
    rowGap * (rows.length - 1);
  const panelY = y + 46;
  const labelY = panelY + 64;
  const panelH = 64 + 24 + bodyH + 30;
  roundRect(ctx, panelX, panelY, panelW, panelH, 30);
  ctx.fillStyle = C.tile;
  ctx.fill();

  ctx.fillStyle = C.accent;
  ctx.font = `700 26px ${FONT}`;
  spaced(
    ctx,
    showProgress ? "A QUICK LOOK AT MY PROGRESS" : "EVERY PRACTICE COUNTS.",
    textX,
    labelY,
    1.2,
    "left",
  );

  let ty = labelY + 54;
  ctx.textAlign = "left";
  ctx.font = `500 30px ${FONT}`;
  rows.forEach((row) => {
    if (row.icon === "check") drawCheck(ctx, textX, ty - 4, 26, C.text);
    if (row.icon === "target") drawTarget(ctx, textX + 13, ty - 10, 13, C.text);
    const lx = row.icon ? textX + 50 : textX;
    ctx.fillStyle = C.text;
    row.lines.forEach((line, i) => ctx.fillText(line, lx, ty + i * lineH));
    ty += row.lines.length * lineH + rowGap;
  });

  // "You should try this, too."
  y = panelY + panelH + 86;
  ctx.fillStyle = C.text;
  ctx.font = `700 50px ${FONT}`;
  ctx.fillText("You should try this, too.", PAD, y);
  y += 62;
  ctx.fillStyle = C.textSoft;
  ctx.font = `400 30px ${FONT}`;
  const pitch = wrapLines(
    ctx,
    "I'm using Loquiex to improve my communication skills. You should give it a try, too.",
    inner,
    3,
  );
  pitch.forEach((line, i) => ctx.fillText(line, PAD, y + i * 44));
  y += (pitch.length - 1) * 44 + 48;
  ctx.textAlign = "center";

  // Join button with the member's own invite link
  const link = getInviteLink(user).replace(/^https?:\/\//, "");
  const btnW = inner - 60;
  const btnX = (W - btnW) / 2;
  const btnH = 132;
  roundRect(ctx, btnX, y, btnW, btnH, 26);
  ctx.fillStyle = C.olive;
  ctx.fill();
  ctx.fillStyle = C.text;
  ctx.font = `700 26px ${FONT}`;
  spaced(ctx, "JOIN ME ON LOQUIEX", W / 2, y + 54, 1.2);
  const linkSize = fitFont(ctx, link, 600, 32, 20, btnW - 120);
  const lw = ctx.measureText(link).width;
  const arrow = Math.round(linkSize * 0.55);
  const lx = W / 2 - (lw + 16 + arrow) / 2;
  ctx.textAlign = "left";
  ctx.fillText(link, lx, y + 100);
  drawArrow(ctx, lx + lw + 16, y + 100 - 4, arrow, C.text);
  ctx.textAlign = "center";

  const contentEnd = y + btnH;

  // Final image: page, card, then the content layer.
  const H = Math.max(MIN_H, contentEnd + 84);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const out = canvas.getContext("2d");
  out.fillStyle = C.page;
  out.fillRect(0, 0, W, H);
  roundRect(out, 40, 40, W - 80, H - 80, 56);
  out.fillStyle = C.card;
  out.fill();
  out.strokeStyle = C.border;
  out.lineWidth = 3;
  out.stroke();
  // When the content is shorter than the card, centre it vertically.
  const shift = Math.max(0, Math.round((H - 84 - contentEnd) / 2));
  out.drawImage(layer, 0, 0, W, contentEnd + 10, 0, shift, W, contentEnd + 10);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
