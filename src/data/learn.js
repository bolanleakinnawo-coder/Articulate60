// Learn shop copy. Prices here are for display before the server answers;
// the server (Articulate60-backend/utils/learn.js) decides what is charged
// and whether the launch offer is still running. Keep the numbers in step.

export const OFFER_FALLBACK_ENDS_AT = "2026-12-01T23:59:59+01:00";

export const PRODUCTS = {
  "not-bad-at-speaking": {
    id: "not-bad-at-speaking",
    title: "You’re not bad at speaking. You just need this.",
    shortTitle: "You’re Not Bad at Speaking",
    coverTitle: ["You’re not bad", "at speaking."],
    coverSub: "You just need this.",
    description:
      "A practical, mentor-like guide to help you work through your speaking struggles, express your thoughts clearly and become a more confident communicator.",
    cover: "cover-featured",
    books: ["not-bad-at-speaking"],
    prices: { NGN: { full: 12000, now: 9600 }, USD: { full: 12, now: 9.6 } },
  },
  "word-playbook": {
    id: "word-playbook",
    title: "Word Playbook",
    shortTitle: "Word Playbook",
    coverTitle: ["Word", "Playbook"],
    description:
      "500 carefully selected words to help you find the right words & express yourself with greater precision & clarity.",
    cover: "cover-word",
    books: ["word-playbook"],
    prices: { NGN: { full: 3500, now: 2800 }, USD: { full: 3.5, now: 2.8 } },
  },
  "grammar-playbook": {
    id: "grammar-playbook",
    title: "Grammar Playbook",
    shortTitle: "Grammar Playbook",
    coverTitle: ["Grammar", "Playbook"],
    description:
      "Understand how English works, construct better sentences and express yourself correctly.",
    cover: "cover-grammar",
    books: ["grammar-playbook"],
    prices: { NGN: { full: 3500, now: 2800 }, USD: { full: 3.5, now: 2.8 } },
  },
  // No longer sold (round 7). Kept only so an earlier purchase still shows.
  "language-upgrade": {
    retired: true,
    id: "language-upgrade",
    title: "The Language Upgrade",
    shortTitle: "The Language Upgrade",
    tagline: "Word Playbook + Grammar Playbook",
    description:
      "Get both playbooks and work on your vocabulary and sentence construction together.",
    cover: "cover-bundle",
    books: ["word-playbook", "grammar-playbook"],
    prices: { NGN: { full: 7000, now: 4000 }, USD: { full: 7, now: 4 } },
  },
};

export const FEATURED_ID = "not-bad-at-speaking";
export const SHOP_ORDER = ["word-playbook", "grammar-playbook"];

// Books (what ends up in the library). A bundle gives two books.
export const BOOKS = {
  "not-bad-at-speaking": PRODUCTS["not-bad-at-speaking"],
  "word-playbook": PRODUCTS["word-playbook"],
  "grammar-playbook": PRODUCTS["grammar-playbook"],
};

export function formatPrice(amount, currency) {
  if (amount == null) return "";
  // $12, $9.6, $3.5 (as on the price list), never $12.00.
  if (currency === "USD") return `$${Number(Number(amount).toFixed(2))}`;
  return `₦${Number(amount).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

// "20% off" from a full and a discounted price.
export function percentOff(full, now) {
  if (!full || now >= full) return 0;
  return Math.round(((full - now) / full) * 100);
}
