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

export const LEVEL_META = [
  {
    id: 1,
    title: "Find Your Voice",
    description: "60 sec prep, speak for 60 seconds.",

    prepareSeconds: 60,
    speakSeconds: 60,
  },
  {
    id: 2,
    title: "Think Faster",
    description: "30 seconds prep, speak for 60 seconds.",

    prepareSeconds: 30,
    speakSeconds: 60,
  },
  {
    id: 3,
    title: "Speak Under Pressure",
    description: "No prep, speak for 60 seconds.",

    prepareSeconds: 0,
    speakSeconds: 60,
  },
];

export function getRandomPrompt(categoryId) {
  const pool = PROMPTS[categoryId];
  if (!Array.isArray(pool) || pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getRandomCategoryPrompt() {
  const availableCategories = CATEGORIES.filter(
    ({ id }) => Array.isArray(PROMPTS[id]) && PROMPTS[id].length > 0,
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
