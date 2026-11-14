// Learn shop: the books members can buy, their prices and the launch offer.
// This file is the server's truth for prices. src/data/learn.js holds the
// same numbers for display only; keep the two in step.
//
// LAUNCH OFFER
//   The discounted ("launch") prices apply until LAUNCH_OFFER_ENDS_AT, then
//   every price goes back to its full price on its own. To move the deadline,
//   set LAUNCH_OFFER_ENDS_AT on Render (any ISO date, e.g.
//   2026-12-01T23:59:59+01:00) or change DEFAULT_OFFER_ENDS_AT below.
//   The countdown in the app reads the same value from the server.

// Launch is 28 Nov 2026; the offer runs 3 days, ending 1 Dec, 11:59 pm Lagos.
const DEFAULT_OFFER_ENDS_AT = "2026-12-01T23:59:59+01:00";

// Prices are whole units (₦ / $). `launch` is the discounted price.
const BOOKS = {
  "not-bad-at-speaking": {
    title: "You're not bad at speaking. You just need this.",
    shortTitle: "You're Not Bad at Speaking",
    price: { NGN: 12000, USD: 12 },
    launch: { NGN: 9600, USD: 9.6 },
  },
  "word-playbook": {
    title: "Word Playbook",
    shortTitle: "Word Playbook",
    price: { NGN: 3500, USD: 3.5 },
    launch: { NGN: 2800, USD: 2.8 },
  },
  "grammar-playbook": {
    title: "Grammar Playbook",
    shortTitle: "Grammar Playbook",
    price: { NGN: 3500, USD: 3.5 },
    launch: { NGN: 2800, USD: 2.8 },
  },
};

// Things that can be bought. A bundle gives every book in `books`.
const PRODUCTS = {
  "not-bad-at-speaking": { ...BOOKS["not-bad-at-speaking"], books: ["not-bad-at-speaking"] },
  "word-playbook": { ...BOOKS["word-playbook"], books: ["word-playbook"] },
  "grammar-playbook": { ...BOOKS["grammar-playbook"], books: ["grammar-playbook"] },
  "language-upgrade": {
    title: "The Language Upgrade",
    shortTitle: "The Language Upgrade",
    price: { NGN: 7000, USD: 7 },
    launch: { NGN: 4000, USD: 4 },
    books: ["word-playbook", "grammar-playbook"],
  },
};

const BOOK_IDS = Object.keys(BOOKS);
const PRODUCT_IDS = Object.keys(PRODUCTS);

// Coming-soon items members can ask to hear about (Notify me).
const UPCOMING = {
  "communication-reset": "The 7-Day Communication Reset",
  "what-do-i-say": "What Do I Say?",
  "what-do-i-do": "What Do I Do?",
};

function offerEndsAt() {
  const raw = (process.env.LAUNCH_OFFER_ENDS_AT || "").trim() || DEFAULT_OFFER_ENDS_AT;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    console.error(`LAUNCH_OFFER_ENDS_AT "${raw}" is not a date; using ${DEFAULT_OFFER_ENDS_AT}.`);
    return new Date(DEFAULT_OFFER_ENDS_AT);
  }
  return d;
}

function offerActive(now = new Date()) {
  return now.getTime() < offerEndsAt().getTime();
}

// What the member pays right now, in the smallest unit (kobo / cents).
function priceMinorFor(productId, currency, now = new Date()) {
  const p = PRODUCTS[productId];
  if (!p) return null;
  const table = offerActive(now) ? p.launch : p.price;
  const amount = table[currency];
  if (amount == null) return null;
  return Math.round(amount * 100);
}

// Prices for the app: full price, price now, and whether the offer applies.
function publicCatalog(currencies, now = new Date()) {
  const active = offerActive(now);
  return PRODUCT_IDS.map((id) => {
    const p = PRODUCTS[id];
    const prices = {};
    currencies.forEach((c) => {
      prices[c] = { full: p.price[c], now: active ? p.launch[c] : p.price[c] };
    });
    return { id, title: p.title, books: p.books, prices };
  });
}

module.exports = {
  BOOKS,
  BOOK_IDS,
  PRODUCTS,
  PRODUCT_IDS,
  UPCOMING,
  offerEndsAt,
  offerActive,
  priceMinorFor,
  publicCatalog,
};
