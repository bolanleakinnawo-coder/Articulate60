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

export function getRandomPrompt(categoryId) {
  const pool = PROMPTS[categoryId];
  if (!Array.isArray(pool) || pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getRandomCategoryPrompt(excludedCategoryId) {
  const availableCategories = CATEGORIES.filter(
    ({ id }) =>
      id !== excludedCategoryId &&
      Array.isArray(PROMPTS[id]) &&
      PROMPTS[id].length > 0,
  );
  if (availableCategories.length === 0) return null;

  const randomCategory =
    availableCategories[Math.floor(Math.random() * availableCategories.length)];
  return {
    categoryId: randomCategory.id,
    categoryTitle: randomCategory.title,
    prompt: getRandomPrompt(randomCategory.id),
  };
}
