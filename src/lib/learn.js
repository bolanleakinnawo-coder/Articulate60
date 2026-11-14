import api from "../api/axios";

// Learn shop, library and reading progress. See
// Articulate60-backend/ROUTES/learn.js for what each call returns.

export async function loadLearn() {
  const { data } = await api.get("/api/learn");
  return data;
}

// popup: true = Paystack's pop-up inside the app (normal). false = Paystack's
// own page (back-up), which returns to this same site.
export async function startBookCheckout(productId, currency, popup = true) {
  const { data } = await api.post("/api/learn/checkout", { productId, currency, popup });
  return data;
}

export async function verifyBookPayment(reference) {
  const { data } = await api.post("/api/learn/verify", { reference });
  return data;
}

export async function saveReadingProgress(bookId, page, totalPages) {
  const { data } = await api.post("/api/learn/progress", { bookId, page, totalPages });
  return data.item;
}

export async function downloadBook(bookId, onProgress) {
  const { data } = await api.get(`/api/learn/books/${bookId}/file`, {
    responseType: "arraybuffer",
    onDownloadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
  return data;
}

export async function setNotifyMe(productId, on) {
  if (on) await api.post("/api/learn/notify", { productId });
  else await api.delete(`/api/learn/notify/${productId}`);
  return on;
}

// Time left until `endsAt`, using the server's clock (so a wrong phone clock
// can't stretch or end the offer early).
export function splitTimeLeft(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}
