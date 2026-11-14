// Where Paystack sends the member back to after paying on Paystack's own page.
//
// The app normally pays in Paystack's pop-up inside the app (no return trip),
// so this is only the back-up for when the pop-up can't open. It uses the
// address the member is actually on (the browser's Origin header), so the
// payment comes back to the same site and Home Screen app where they are
// signed in, whatever APP_URL is set to. APP_URL is only a last resort.
function returnUrlFor(req, path) {
  const origin = String(req.get("origin") || "").trim().replace(/\/+$/, "");
  let base = "";
  try {
    const u = new URL(origin);
    const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    if (u.protocol === "https:" || (local && u.protocol === "http:")) base = u.origin;
  } catch {
    base = "";
  }
  if (!base) base = (process.env.APP_URL || "").trim().replace(/\/+$/, "");
  return base ? `${base}${path}` : null;
}

module.exports = { returnUrlFor };
