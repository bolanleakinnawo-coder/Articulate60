import everydayConversations from "./everyday-conversations.js";
import difficultConversations from "./difficult-conversations.js";
import workAndProfessional from "./work-and-professional.js";
import interviews from "./interviews.js";
import explainClearly from "./explain-clearly.js";
import opinionsAndArguments from "./opinions-and-arguments.js";
import storytelling from "./storytelling.js";
import publicSpeaking from "./public-speaking.js";
import businessAndPitching from "./business-and-pitching.js";

export const CATEGORIES = [
  { id: "everyday-conversations", title: "Everyday Conversations", description: "Practise real-life conversations." },
  { id: "difficult-conversations", title: "Difficult Conversations", description: "Handle conflict, boundaries and disagreement." },
  { id: "work-and-professional", title: "Work & Professional", description: "Communicate clearly and confidently at work." },
  { id: "interviews", title: "Interviews", description: "Answer questions clearly under pressure." },
  { id: "explain-clearly", title: "Explain Clearly", description: "Make complex thoughts easy to understand." },
  { id: "opinions-and-arguments", title: "Opinions & Arguments", description: "Think clearly, reason and defend your ideas." },
  { id: "storytelling", title: "Storytelling", description: "Tell stories people want to hear." },
  { id: "public-speaking", title: "Public Speaking", description: "Speak clearly and keep people listening." },
  { id: "business-and-pitching", title: "Business & Pitching", description: "Explain, persuade and sell your ideas." },
];

export const PROMPTS = {
  "everyday-conversations": everydayConversations,
  "difficult-conversations": difficultConversations,
  "work-and-professional": workAndProfessional,
  "interviews": interviews,
  "explain-clearly": explainClearly,
  "opinions-and-arguments": opinionsAndArguments,
  "storytelling": storytelling,
  "public-speaking": publicSpeaking,
  "business-and-pitching": businessAndPitching,
};
