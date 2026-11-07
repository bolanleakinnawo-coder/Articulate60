# Round 3 changes (2026-11-06)

1. Streak pop-up: the close (X) button now sits in the top-right corner in
   the card colours (dark, olive on hover), not white.
   src/Components/StreakPopup.jsx, src/styles/StreakPopup.css
2. Leaderboard: speaking time is ranked highest first and shown as hours,
   minutes and seconds (e.g. 1h 04m 09s, 12m 30s, 45s).
   src/Pages/Home.jsx, Articulate60-backend/ROUTES/practice.js
3. AI analysis page ("Analysing your response" and "You did it!"): the
   small text under the three points is removed, the points are smaller,
   and the page uses the Home brand colours (olive, card, cream).
   src/Pages/PracticeSession.jsx, src/Components/practice/FeedbackReport.css
4. Practice: "Your limits" (AI feedback, group practice) removed from the
   Solo and Group tabs. src/Pages/Practice.jsx
5. Profile: Privacy & security removed. src/Pages/Profile.jsx
6. Plans (enforced by the server too):
   - Free: no AI feedback, except a 3-day free trial from sign-up (up to 3
     a day). After that they see "You did it!" with "Unlock my AI feedback".
   - Bloom: AI feedback, no group practice.
   - Flourish and Infinity: AI feedback and group practice.
   Articulate60-backend/utils/plans.js, ROUTES/practice.js, ROUTES/billing.js,
   src/data/plans.js, src/Pages/ProfileUsage.jsx, src/Pages/PracticeSession.jsx,
   src/data/support.js
   IMPORTANT: on Render, set ANALYZER_FOR_ALL=false (or delete it), or every
   member keeps getting AI feedback.
7. Research page: the topic card, the toolkit card and the buttons now fill
   the width (two wide columns on a computer). src/styles/ResearchMode.css
8. Feedback page: on big screens it uses the full width (score and
   recording on the left, feedback on the right).
   src/Components/practice/FeedbackReport.jsx / .css
9. Share image: the new design (your picture) is in
   src/Components/practice/shareImage.js and ShareSheet.jsx. It was never
   live because those files weren't in your project; they are now.
