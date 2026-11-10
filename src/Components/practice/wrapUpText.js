// "34 seconds", "1 minute 5 seconds"
export function describeSeconds(total) {
  const n = Math.max(0, Math.round(Number(total) || 0));
  const m = Math.floor(n / 60);
  const s = n % 60;
  const parts = [];
  if (m) parts.push(`${m} minute${m === 1 ? "" : "s"}`);
  if (s || !m) parts.push(`${s} second${s === 1 ? "" : "s"}`);
  return parts.join(" ");
}
