import everydayConversations from "./everyday-conversations.js";
import wordPlay from "./word-play.js";
import opinionsAndDebates from "./opinions-and-debates.js";
import workplaceAndInterview from "./workplace-and-interview.js";
import theSpeakingStage from "./the-speaking-stage.js";
import storytelling from "./storytelling.js";
import businessIdeasAndPitches from "./business-ideas-and-pitches.js";

export const CATEGORIES = [
  {
    id: "everyday-conversations",
    title: "Everyday Conversations",
    description: "Practise real-life conversations.",
  },
  {
    id: "word-play",
    title: "Word Play",
    description: "Explore a single word and say what it means to you.",
  },
  {
    id: "opinions-and-debates",
    title: "Opinions & Debates",
    description: "Take a position and back it up.",
  },
  {
    id: "workplace-and-interview",
    title: "Workplace & Interview",
    description: "Answer clearly and confidently at work and in interviews.",
  },
  {
    id: "the-speaking-stage",
    title: "The Speaking Stage",
    description: "Speak to an audience and leave a clear message.",
  },
  {
    id: "storytelling",
    title: "Storytelling",
    description: "Tell stories people want to hear.",
  },
  {
    id: "business-ideas-and-pitches",
    title: "Business Ideas & Pitches",
    description: "Explain, persuade and sell your ideas.",
  },
];

export const PROMPTS = {
  "everyday-conversations": everydayConversations,
  "word-play": wordPlay,
  "opinions-and-debates": opinionsAndDebates,
  "workplace-and-interview": workplaceAndInterview,
  "the-speaking-stage": theSpeakingStage,
  storytelling: storytelling,
  "business-ideas-and-pitches": businessIdeasAndPitches,
};
