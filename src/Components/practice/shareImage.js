import brandLogo from "../../assets/brandlogo.PNG";

// Builds the downloadable "I just practised on Loquiex" image (1080 x 1920,
// the size TikTok and Instagram stories use) on a canvas.

export const SHARE_CAPTION =
  "I just finished practicing on Loquiex. You can start practicing too here: loquiex.app";

const W = 1080;
const H = 1920;
const CREAM = "#ece3cf";
const CREAM_SOFT = "rgba(236, 227, 207, 0.72)";
const SAGE = "#c4d1a8";
const OLIVE = "#79774e";
const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';

// The logo artwork sits in the middle of a 2000 x 2000 transparent canvas.
const LOGO_CROP = { x: 716, y: 886, w: 493, h: 305, canvas: 2000 };

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

function spaced(ctx, text, x, y, spacing) {
  // Letter-spaced uppercase label, centred on x.
  const chars = [...text];
  const width =
    chars.reduce((sum, ch) => sum + ctx.measureText(ch).width, 0) +
    spacing * (chars.length - 1);
  let cursor = x - width / 2;
  ctx.textAlign = "left";
  for (const ch of chars) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + spacing;
  }
  ctx.textAlign = "center";
}

function formatSeconds(total) {
  const s = Math.max(0, Math.round(Number(total) || 0));
  if (s < 60) return `${s} sec`;
  const m = Math.floor(s / 60);
  return s % 60 ? `${m} min ${s % 60} sec` : `${m} min`;
}

export async function renderShareImage({ score, verdict, topic, seconds, words }) {
  if (document.fonts?.ready) await document.fonts.ready.catch(() => {});

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Background: deep ink with soft olive light.
  ctx.fillStyle = "#0c0e0b";
  ctx.fillRect(0, 0, W, H);
  const glows = [
    [180, 260, 620, "rgba(121, 119, 78, 0.28)"],
    [940, 1500, 700, "rgba(124, 156, 111, 0.18)"],
    [540, 900, 520, "rgba(196, 209, 168, 0.06)"],
  ];
  for (const [x, y, r, color] of glows) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // Inset frame
  roundRect(ctx, 48, 48, W - 96, H - 96, 56);
  ctx.strokeStyle = "rgba(196, 209, 168, 0.22)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Logo
  try {
    const logo = await loadImage(brandLogo);
    const k = logo.naturalWidth / LOGO_CROP.canvas;
    const drawW = 400;
    const drawH = Math.round((drawW * LOGO_CROP.h) / LOGO_CROP.w);
    // The head outline is drawn in dark ink; lift it to cream so it shows
    // on the dark card.
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
    const pixels = octx.getImageData(0, 0, drawW, drawH);
    const d = pixels.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 0 && d[i] + d[i + 1] + d[i + 2] < 150) {
        d[i] = 236;
        d[i + 1] = 227;
        d[i + 2] = 207;
      }
    }
    octx.putImageData(pixels, 0, 0);
    ctx.drawImage(off, (W - drawW) / 2, 120);
  } catch {
    ctx.fillStyle = CREAM;
    ctx.font = `800 96px ${FONT}`;
    ctx.fillText("loquiex", W / 2, 280);
  }

  // Kicker
  ctx.fillStyle = SAGE;
  ctx.font = `700 28px ${FONT}`;
  spaced(ctx, "SPEAKING PRACTICE · COMPLETED", W / 2, 440, 5);

  // Score ring
  const cx = W / 2;
  const cy = 680;
  const r = 180;
  ctx.lineCap = "round";
  ctx.lineWidth = 30;
  ctx.strokeStyle = "rgba(196, 209, 168, 0.14)";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  const pct = score === null || score === undefined ? 1 : score / 100;
  const ring = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  ring.addColorStop(0, SAGE);
  ring.addColorStop(1, "#9cb88b");
  ctx.strokeStyle = ring;
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
  ctx.stroke();

  ctx.fillStyle = CREAM;
  if (score === null || score === undefined) {
    ctx.font = `800 120px ${FONT}`;
    ctx.fillText("✓", cx, cy + 42);
  } else {
    ctx.font = `800 168px ${FONT}`;
    ctx.fillText(String(score), cx, cy + 45);
    ctx.fillStyle = CREAM_SOFT;
    ctx.font = `500 36px ${FONT}`;
    ctx.fillText("/100", cx, cy + 100);
  }

  // Verdict
  ctx.fillStyle = CREAM;
  ctx.font = `800 76px ${FONT}`;
  ctx.fillText(
    score === null || score === undefined ? "Practice complete" : verdict,
    W / 2,
    975,
  );

  // Prompt card
  let cardBottom = 1040;
  if (topic) {
    ctx.font = `italic 500 40px ${FONT}`;
    const lines = wrapLines(ctx, topic, W - 300, 4);
    const cardH = 120 + lines.length * 56;
    const cardY = 1035;
    roundRect(ctx, 110, cardY, W - 220, cardH, 36);
    ctx.fillStyle = "rgba(26, 34, 22, 0.85)";
    ctx.fill();
    ctx.strokeStyle = "rgba(196, 209, 168, 0.2)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = SAGE;
    ctx.font = `700 24px ${FONT}`;
    spaced(ctx, "MY PROMPT", W / 2, cardY + 62, 4);

    ctx.fillStyle = CREAM;
    ctx.font = `italic 500 40px ${FONT}`;
    lines.forEach((line, i) => ctx.fillText(line, W / 2, cardY + 122 + i * 56));
    cardBottom = cardY + cardH;
  }

  // Stats
  const stats = [
    seconds ? [formatSeconds(seconds), "Speaking time"] : null,
    words > 0 ? [`${words}`, "Words spoken"] : null,
  ].filter(Boolean);
  if (stats.length) {
    const statY = cardBottom + 100;
    const colW = (W - 220) / stats.length;
    stats.forEach(([value, label], i) => {
      const x = 110 + colW * i + colW / 2;
      ctx.fillStyle = CREAM;
      ctx.font = `800 52px ${FONT}`;
      ctx.fillText(value, x, statY);
      ctx.fillStyle = CREAM_SOFT;
      ctx.font = `500 28px ${FONT}`;
      ctx.fillText(label, x, statY + 46);
    });
    if (stats.length === 2) {
      ctx.strokeStyle = "rgba(196, 209, 168, 0.2)";
      ctx.beginPath();
      ctx.moveTo(W / 2, statY - 50);
      ctx.lineTo(W / 2, statY + 56);
      ctx.stroke();
    }
  }

  // Footer call to action
  ctx.fillStyle = CREAM;
  ctx.font = `600 38px ${FONT}`;
  ctx.fillText("I just finished practising on Loquiex.", W / 2, 1650);

  const pillText = "Practise with me · loquiex.app";
  ctx.font = `800 38px ${FONT}`;
  const pillW = ctx.measureText(pillText).width + 120;
  const pillH = 96;
  const pillX = (W - pillW) / 2;
  const pillY = 1688;
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fillStyle = SAGE;
  ctx.fill();
  ctx.fillStyle = "#1a2216";
  ctx.fillText(pillText, W / 2, pillY + 61);

  ctx.fillStyle = OLIVE;
  ctx.font = `500 24px ${FONT}`;
  ctx.fillText(
    new Date().toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    W / 2,
    1836,
  );

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
