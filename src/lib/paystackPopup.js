// Paystack's pop-up checkout, opened inside the app (no trip away from
// Loquiex, so the member stays signed in on whatever device or Home Screen
// app they're using). The server starts the payment and gives us its
// access code; Paystack's own script shows the secure payment form.
//
// Resolves { status: "success", reference } or { status: "closed" }.
// Rejects with code "POPUP_UNAVAILABLE" if Paystack's script can't load.
const SCRIPT_SRC = "https://js.paystack.co/v2/inline.js";
let scriptPromise = null;

function loadScript() {
  if (window.PaystackPop) return Promise.resolve(window.PaystackPop);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = SCRIPT_SRC;
    el.async = true;
    const timer = setTimeout(() => fail(), 15000);
    function fail() {
      clearTimeout(timer);
      scriptPromise = null;
      el.remove();
      reject(Object.assign(new Error("Paystack pop-up unavailable"), { code: "POPUP_UNAVAILABLE" }));
    }
    el.onload = () => {
      clearTimeout(timer);
      if (window.PaystackPop) resolve(window.PaystackPop);
      else fail();
    };
    el.onerror = fail;
    document.head.appendChild(el);
  });
  return scriptPromise;
}

// Starts loading early (e.g. when the payment screen opens) so the pop-up
// appears instantly when the member taps Pay.
export function preloadPaystack() {
  loadScript().catch(() => {});
}

export async function openPaystackPopup(accessCode, reference) {
  const PaystackPop = await loadScript();
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    try {
      const popup = new PaystackPop();
      popup.resumeTransaction(accessCode, {
        onSuccess: (tx) => finish({ status: "success", reference: tx?.reference || reference }),
        onCancel: () => finish({ status: "closed", reference }),
        onError: () => finish({ status: "closed", reference }),
      });
    } catch {
      reject(Object.assign(new Error("Paystack pop-up unavailable"), { code: "POPUP_UNAVAILABLE" }));
    }
  });
}

// True for Paystack's own checkout page (the back-up when the pop-up fails).
export function isPaystackUrl(raw) {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && /(^|\.)paystack\.(co|com)$/.test(url.hostname);
  } catch {
    return false;
  }
}
