# Launch corrections, round 5 (2026-11-11)

Built on ARTICULATE 60 (launch round 4).zip. Frontend (Vercel) and backend (Render) both changed. No new env vars.

## Going live with Paystack
- All "test mode" / "no real money" messages are gone from Manage Membership.
- Live or test now follows the key itself: put your `sk_live_...` key in PAYSTACK_SECRET_KEY on Render and payments are live. PAYSTACK_LIVE is no longer needed (services/paystack.js). Remember the webhook in the Paystack live dashboard.

## Profile
- New top section: picture (or first letter), name, "Member since Sep 2026", Edit profile button, then the Loquiex membership card: plan, price, Active until date, days left and a bar of the paid time left. Tapping the card opens Manage Membership.
- Free members see "Free plan"; during the 3-day AI trial the card shows when the trial ends.
- New shared component: src/Components/MembershipCard.jsx (+ .css).

## Your Practices
- "Your journey" removed.
- Bento stats: big ring card = recordings left to the next milestone (10, 50, 100, 250, 500, 1000, then every 500), plus three small cards: Yap mode, Vocabulary, Prompts & research (together). On a laptop they sit in one row of four.
- Every practice is its own box: date and 12-hour time, title, category · level · length, a "See your feedback" button in the brand CTA colour (or "Get your feedback" when there is none yet), and a play button for the recording.
- All / Speaking / Vocabulary buttons are smaller.

## Manage Membership
- The membership card sits at the top, followed by Upgrade (picks the next plan up), Compare plans and Renew, all in the CTA colour.
- Cancel plan is the last thing on the page, after Subscription details. It asks "Are you sure you want to cancel your plan?" and explains they keep everything they paid for until the expiry date, then move to Free and nothing more is charged.
- After cancelling, the card says "Cancelled, ends on ..." and a note offers "Keep my plan" to undo. Paying again also clears the cancel.
- Backend: User.planCancelledAt, POST /api/billing/cancel and /api/billing/resume, subscription now returns cancelledAt.

## Usage & Limits
- The big "current plan" card is gone. The plan is now a small pill under "Today".
- Daily: "Daily limits reset at midnight."
- Monthly: the allowance resets every month on the date they paid (not the 1st), and the page shows the next reset date. "This month" counts from that date too.
- How usage works rewritten: "waiting alone in a room is free" removed; call time is used whether you host or join; monthly allowance resets on the date you paid; the plan lasts the period paid for; solo practice without AI feedback doesn't use your allowance.

## Notification pop-ups
- iPhone Safari ignored the "Allow notifications" pop-up because the app checked other things before asking. The permission is now asked first, straight from the tap (Profile > Notifications switch, streak card, Plan a practice, Remind me).
- If the notification service worker hasn't finished installing on a first visit, the app now waits for it (or registers it) instead of saying notifications aren't supported.
- Still needed for phone notifications: VAPID keys on Render, and on iPhone Loquiex must be added to the Home Screen.

## Files changed
Frontend: src/Pages/Profile.jsx, Profile.css, ProfilePractices.jsx, Membership.jsx, ProfileUsage.jsx, src/Components/MembershipCard.jsx (new), MembershipCard.css (new), src/data/plans.js, src/lib/push.js, src/lib/practiceReminders.js
Backend: Articulate60-backend/services/paystack.js, services/billing.js, ROUTES/billing.js, MODELS/User.js, utils/plans.js
