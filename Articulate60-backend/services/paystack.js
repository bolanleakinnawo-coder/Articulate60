// Paystack API calls. The secret key is read from the server environment
// only and never sent to the app.
//
//   PAYSTACK_SECRET_KEY  sk_live_... takes real payments, sk_test_... takes
//                        Paystack test payments. Swapping the key is all it
//                        takes to go live (PAYSTACK_LIVE is no longer used).
const crypto = require("crypto");

const API = "https://api.paystack.co";

function rawKey() {
  return (process.env.PAYSTACK_SECRET_KEY || "").trim();
}

// Live or test follows the key itself.
function mode() {
  return rawKey().startsWith("sk_live_") ? "live" : "test";
}

function secretKey() {
  const key = rawKey();
  return key.startsWith("sk_live_") || key.startsWith("sk_test_") ? key : null;
}

function isConfigured() {
  return Boolean(secretKey());
}

async function call(path, { method = "GET", body } = {}) {
  const key = secretKey();
  if (!key) throw Object.assign(new Error("Paystack is not configured."), { code: "NOT_CONFIGURED" });
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok || !data?.status) {
    const err = new Error(data?.message || `Paystack error ${res.status}`);
    err.httpStatus = res.status;
    throw err;
  }
  return data.data;
}

// https://paystack.com/docs/api/transaction/#initialize
// amountMinor is in kobo (NGN) or cents (USD).
function initializeTransaction({ email, amountMinor, currency, reference, callbackUrl, metadata }) {
  return call("/transaction/initialize", {
    method: "POST",
    body: {
      email,
      amount: amountMinor,
      currency,
      reference,
      ...(callbackUrl ? { callback_url: callbackUrl } : {}),
      metadata,
    },
  });
}

// https://paystack.com/docs/api/transaction/#verify
function verifyTransaction(reference) {
  return call(`/transaction/verify/${encodeURIComponent(reference)}`);
}

// Webhook signature: HMAC-SHA512 of the raw request body with the secret key.
function isValidSignature(rawBody, signature) {
  const key = secretKey();
  if (!key || !signature || !Buffer.isBuffer(rawBody)) return false;
  const expected = crypto.createHmac("sha512", key).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(String(signature), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = {
  mode,
  isConfigured,
  initializeTransaction,
  verifyTransaction,
  isValidSignature,
};
