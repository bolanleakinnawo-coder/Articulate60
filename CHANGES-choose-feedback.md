# Choose feedback after recording (2026-11-09)

Built on: merged-project/ARTICULATE 60 (jar categories).zip
Full project: merged-project/ARTICULATE 60 (choose feedback).zip
Frontend only. No backend changes (uses the existing GET /api/practice/ai-allowance
and POST /api/practice/recordings/:id/analyze, which still enforce plans and daily caps).

## New flow after "I'm done speaking"
1. Practice saves automatically (streak counts straight away). Reflect page removed.
2. "That's a wrap!" page (src/Components/practice/WrapUp.jsx + WrapUp.css):
   - Paid / free trial: recording + live allowance (e.g. 7 / 12, trial 3 / 3 with days left),
     "What you'll get", cost "1 feedback credit" (Infinity: "Included in your plan"),
     Get my feedback, Save practice without feedback.
   - Allowance used up today: button greyed "No reviews left today" (+ Explore all plans for trial).
   - Free, trial ended: "Unlock detailed feedback" (Bloom badge), Explore all plans,
     Save practice without feedback.
3. Get my feedback -> "Let's unpack your response." with an animated loading bar and
   changing step text (Listening, Transcribing, Analysing, Preparing) -> feedback report.
4. Save practice without feedback:
   - Members with AI feedback (paid, or Free in the 3-day trial) -> "Amazing!" page
     (time spent, topic completed, recording saved, day streak, Back to home,
     Share my practice, link to Your practices for feedback later). The
     "Reflection completed" row is gone with the Reflect page.
   - Free members without AI feedback -> "You did it!" page: time practised, streak,
     recording player, Share my practice, Practise again, Back to practice,
     Unlock detailed feedback.
5. Analysis errors "Skip for now" go to the same page as Save without feedback.

Feedback later: Profile > Your practices already shows "Get AI feedback" on any practice
without feedback (uses 1 from that day's allowance).

## Files
- src/Pages/PracticeSession.jsx (changed)
- src/Components/practice/WrapUp.jsx, WrapUp.css, wrapUpText.js (new)
