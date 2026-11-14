// Landing page pictures (route "/").
//
// These are PLACEHOLDERS until the real page screenshots are ready.
// To swap one: drop the new file into src/assets/landing/ (or anywhere in
// src/assets), change the import below, and update its `alt` text.
// Nothing else on the page needs to change. Any shape works; each picture
// is cropped to fit its frame.

import heroPhoto from "../assets/hero.jpeg";
import soloPhoto from "../assets/pratice.jpeg";
import groupPhoto from "../assets/learn-hero.jpeg";
import feedbackPhoto from "../assets/hero2.jpeg";
import learnPhoto from "../assets/learn1.jpeg";
import progressPhoto from "../assets/profile.jpeg";
import dashboardPhoto from "../assets/waitlist.png";

export const LANDING_IMAGES = {
  hero: {
    src: heroPhoto,
    alt: "A Loquiex member smiling while practising speaking on her phone",
  },
  solo: {
    src: soloPhoto,
    alt: "The Loquiex practice screen with the topic jar and practice levels",
  },
  group: {
    src: groupPhoto,
    alt: "Two people talking in a group practice conversation",
  },
  feedback: {
    src: feedbackPhoto,
    alt: "A member recording a practice session at her desk",
  },
  learn: {
    src: learnPhoto,
    alt: "The Loquiex Learn page with books and learning resources",
  },
  progress: {
    src: progressPhoto,
    alt: "A Loquiex profile showing practice stats",
  },
  dashboard: {
    src: dashboardPhoto,
    alt: "The Loquiex Home page with today's practice and streak",
  },
};
