# Loquiex round 11 (19 November 2026)

Built on round 10. **Deploy both: Render (backend) and Netlify (frontend).** The upgrade price, the team warning check and team calls on the Group tab all need the new backend.

## Plan changes (Sheriff agreed)

- **Upgrading an individual plan** (for example Flourish to Infinity): the unused days on the current plan come off the new price. Value of a day = what was paid per month for the current plan ÷ 30, so 19 days left on Flourish (₦12,500) is a credit of ₦7,917, and Infinity costs ₦17,083 today. The server works this out and charges exactly that amount through Paystack. The new plan starts at once and a fresh period begins (a month, or the period chosen).
- Before paying, Billing preferences shows the full price, "Credit for 19 unused days on Loquiex Flourish", and "To pay today". The Pay button shows the amount after credit.
- If the unused days are worth more than the new plan for the chosen period (for example 10 months left on a yearly plan, upgrading monthly), the app asks for a longer billing period.
- **Moving to a lower plan** while a higher one is active isn't sold until the current plan ends, so nothing paid for is lost. The app says when they can switch.
- **"Joining a team" warning**, in Sheriff's words, with Continue and Cancel. It shows to anyone with an active individual plan before they accept a team invitation, and before they pay for their own team (Team Admin). On Continue their individual plan ends with no credit. The server checks this too, so it can't be skipped.

## Manage Membership

- **Upgrade** now asks "What would you like to upgrade to?": Individual plan or Team plan. Individual shows only the plans above theirs, each with the credit and "You pay today". Team goes to the team plans.
- **Compare plans** shows Bloom, Flourish and Infinity side by side: price, team of 5 price, AI feedback, personal practice, Spin the Jar / Yap / Research, Group Practice time, people in a call, Learn discounts. Their plan is marked "Your plan". "Choose a plan" goes to the subscription choice.

## Group Practice tab

- The practice option picker no longer has the small "OPTION" label, and the call time left column is narrower with a smaller value, so "Choose how you want to practise" fits on one line on a phone.
- The illustration section has no box. Continue is sized to its text and centred, like Spin the Jar. "There's more than one way to see it." is 1px smaller.
- **Find a practice** is one rounded card (Sheriff's reference, in Loquiex colours): "Join a session and practise with others.", the All / Open seats / Nearly full chips, and an inner panel with "No sessions available right now", "Why not start one? Others can join when you're ready." and a "Start a practice →" link.
- **Your team's calls:** a team call planned by any team member now shows on the main Group tab for every member of that team (and only them), with the time, Remind me, and Join now once it starts. A running team call shows "Team Call live". The whole team gets the 5-minute reminder. Starting a planned team call opens it as a team room and notifies the team.

## Other pages

- **Help:** the answer to "What happens when I reach my usage limits?" is now Sheriff's text, word for word.
- **Learn (coming soon):** Sheriff's chosen design (option 2): "Learn" and its subtitle on the left, one soft card centred below with the book icon, COMING SOON, the heading with the member's name, the text, a thin line, then LAUNCHING IN with Days, Hours, Mins and Secs.
- **Team invitation page:** visitors who aren't signed in see "Haven't registered? Sign up now" (it signs them up and brings them back to accept). "You're already in a team" now only shows for a signed-in member who really is in another team, and names that team.
- **My Team:** the "Your team plan" card is olive green, with a thin line between the price and Members / Invitations pending / Your role.

## Files

- **Backend changed:** `utils/plans.js` (checkoutQuote, ownPlan in the subscription), `ROUTES/billing.js` (GET /api/billing/quote, checkout charges the price after credit, 409 codes DOWNGRADE_LATER, CREDIT_TOO_LARGE, ENDS_INDIVIDUAL_PLAN), `services/billing.js`, `services/team.js`, `ROUTES/team.js`, `ROUTES/group.js`, `services/groupRooms.js`, `services/scheduledPractice.js`, `MODELS/Payment.js`, `MODELS/User.js`, `MODELS/ScheduledPractice.js`.
- **Frontend new:** `src/Components/membership/JoiningTeamDialog.jsx` and `.css`, `src/Components/membership/PlanComparison.jsx` and `.css`.
- **Frontend changed:** `src/Pages/Membership.jsx`, `src/Pages/TeamJoin.jsx`, `src/Pages/GroupPractice.jsx`, `src/Components/membership/SubscriptionPicker.jsx` and `.css`, `src/Components/membership/MyTeam.css`, `src/Components/learn/LearnComingSoon.jsx`, `src/styles/Learn.css`, `src/styles/GroupCall.css`, `src/Pages/Profile.css`, `src/data/plans.js`, `src/data/support.js`, `src/lib/team.js`, `src/lib/activeCall.js`.

No new settings are needed on Render or Netlify.

## Deploy

1. **Render:** copy the contents of `Articulate60-backend` into your backend git folder and push. Don't touch `JWT_SECRET`.
2. **Netlify:** copy the rest into your frontend git folder and push. Build with the backend folder present.
3. **Phone test:** with a paid plan, tap Upgrade, Individual plan, and check the credit before paying. Open a team invite while on a plan and check the warning. Plan a team call and check another member sees it on the Group tab.
