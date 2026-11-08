# Feedback colours + daily AI feedback limit (2026-11-08)

## Feedback page (src/Components/practice/FeedbackReport.css)
All the mint/sage green is now the Home tab CTA colour (olive #646742, hover #79774e, off-white text):
- Active focus tab (Overview, Clarity, Delivery...) is olive; the other tabs are quiet dark pills.
- Grammar / vocabulary / clarity progress lines are olive (the gold "needs work" bar stays gold).
- Share button, score ring around the /100, Try again button, play button and seek bar are olive.
- Score card and practice card use the Home card colours (--bg-card, --border) instead of the dark green.

## Daily AI feedback limit on Solo practice
Frontend
- NEW src/Components/practice/AiFeedbackMeter.jsx: "AI FEEDBACK  3 left" beside "Choose your level",
  pips (or a bar for Flourish's 12), tap for a one-line explanation, and a slim nudge card for free members
  (trial with days left / trial used up today / trial ended "Locked" + Unlock).
- src/Pages/Practice.jsx: loads the allowance and shows the meter + nudge.
- src/data/plans.js: fetchAiAllowance().
- src/Pages/PracticeSession.jsx: when a paid member hits today's cap, it says so (no pointless "Try again").
- src/styles/PracticeExtras.css: styles at the end of the file (responsive down to 320px).

Backend (Articulate60-backend)
- utils/plans.js: AI_FEEDBACK_PER_DAY (Bloom 5, Flourish 12, Infinity unlimited) + aiDailyLimit().
- ROUTES/practice.js: NEW GET /api/practice/ai-allowance (real count from the database, member's own day),
  and the analyser now enforces the paid daily caps too (before, only the free trial's 3/day was enforced).
  Monthly totals (150 / 360) are still not enforced by the server.

Deploy: backend AND frontend both changed. No new environment variables.
