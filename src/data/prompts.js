import {
  CATEGORIES,
  PROMPTS,
} from "../../Articulate60-backend/src/data/prompts/index.js";
export { CATEGORIES, PROMPTS };

export const YAP_HELP = [
  `Start with something you genuinely have to say.`,
  `Don’t stop at your first sentence. Explore the thought.`,
  `Say what you mean, and keep your thoughts connected.`,
  `If you stumble, keep going. You can pause, rethink, and continue.`,
];

export const YAP_QUOTE = `Yap isn’t talking for the sake of talking. It’s practising your ability to think, organise, and express your thoughts in real time.`;

// Speaking time is chosen per practice (see SPEAK_DURATIONS); the level only
// sets the preparation time.
export const LEVEL_META = [
  {
    id: 1,
    title: "The Warm-Up",
    description: "60 seconds to prepare",
    prepareSeconds: 60,
  },
  {
    id: 2,
    title: "The Quick Think",
    description: "30 seconds to prepare",
    prepareSeconds: 30,
  },
  {
    id: 3,
    title: "The Hot Seat",
    description: "No preparation time",
    prepareSeconds: 0,
  },
];

export const SPEAK_DURATIONS = [
  { seconds: 30, label: "30 sec" },
  { seconds: 60, label: "1 min" },
  { seconds: 120, label: "2 min" },
];

export const DEFAULT_SPEAK_SECONDS = 60;

// "up to 30 seconds", "up to one minute", "up to two minutes"
export function describeSpeakTime(seconds) {
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.round(seconds / 60);
  const words = ["", "one", "two", "three"];
  return `${words[minutes] || minutes} minute${minutes === 1 ? "" : "s"}`;
}

// Pick a prompt from one category. `avoid` is a list of prompts already shown,
// so a respin doesn't repeat one until the category has been used up.
export function getRandomPrompt(categoryId, avoid = []) {
  const pool = PROMPTS[categoryId];
  if (!Array.isArray(pool) || pool.length === 0) return null;
  const fresh = pool.filter((p) => !avoid.includes(p));
  const from = fresh.length > 0 ? fresh : pool.filter((p) => p !== avoid[avoid.length - 1]);
  const list = from.length > 0 ? from : pool;
  return list[Math.floor(Math.random() * list.length)];
}

// Pick a prompt from a random category. `excluded` is a category id or a list
// of ids to skip (e.g. the categories a random respin has already visited).
export function getRandomCategoryPrompt(excluded = [], avoid = []) {
  const skip = Array.isArray(excluded) ? excluded : [excluded];
  const withPrompts = CATEGORIES.filter(
    ({ id }) => Array.isArray(PROMPTS[id]) && PROMPTS[id].length > 0,
  );
  const availableCategories = withPrompts.filter(({ id }) => !skip.includes(id));
  if (availableCategories.length === 0) return null;

  const randomCategory =
    availableCategories[Math.floor(Math.random() * availableCategories.length)];
  return {
    categoryId: randomCategory.id,
    categoryTitle: randomCategory.title,
    prompt: getRandomPrompt(randomCategory.id, avoid),
  };
}
