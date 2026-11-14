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
4. Save practice without feedback -> "Amazing!" page for everyone (time spent, topic
   completed, recording saved, day streak, Back to home, Share my practice). Under it:
   members with AI see "Find it in Your practices" for feedback later; Free members
   without AI see "Unlock detailed feedback". The "You did it!" page and the
   "Reflection completed" row are removed (Sheriff, 2026-11-09).
5. Analysis errors "Skip for now" go to the same page as Save without feedback.

Feedback later: Profile > Your practices already shows "Get AI feedback" on any practice
without feedback (uses 1 from that day's allowance).

## Files
- src/Pages/PracticeSession.jsx (changed)
- src/Components/practice/WrapUp.jsx, WrapUp.css (new)

Update 2026-11-09 late: applied on top of merged-project/ARTICULATE 60 (launch ready).zip; full project is now merged-project/ARTICULATE 60 (launch ready + amazing).zip.
