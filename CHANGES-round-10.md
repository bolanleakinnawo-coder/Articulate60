# Loquiex launch corrections, round 10 (19 November 2026)

Built on Sheriff's own upload, ARTICULATE 60 3.zip. Frontend and backend both changed this round, so deploy both (Netlify and Render).

## Small corrections

- **Your Practices:** the "Prompts & research" box now says "Jar and research".
- **Group tab:** "Are you ready to speak out?" is 19px (was 22px), its subtext is 13px (was 14px), and "Choose how you want to practise" is 14px (was 16px). The call time left circle is 52px (was 88px) and sits on the same row as the picker. The "Speaking" label, the mic icon and the Jasmine and David quotes are smaller.
- **Practice tab, "Ready to practise with others?":** the subtext is smaller, "and build confidence together." starts the second line, and the "Join or host a practice session" button is centred.
- **That's a wrap!:** "Would you like detailed feedback?" is 16px (was 18px), its subtext is 13px, and the "What you'll get" box is smaller (14.5px heading, 13px lines, smaller ticks).
- **Share caption:** now Sheriff's text: "I just had another speaking practice on Loquiex. What are you waiting for?😂 Let’s practice together: https://loquiex.app". Copy caption and Share both use it.
- **Profile:** the avatar circle is 52px (was 64px). The letter keeps its size. "Active until" and its date on the membership card are smaller.
- **Durations:** 30 sec, 45 sec and 1 min everywhere: Spin the Jar, Yap Mode, Research Mode and Practice again. A saved 2 min choice falls back to one of these three.
- **Jar prompts:** three prompts now say "one minute" instead of "90 seconds" or "two minutes" (Sheriff said yes). Nothing else in them changed.

## New subscription flow (Sheriff's 7 + 16 screenshots, in Loquiex colours)

The Compare plans area on Manage Membership is now the new flow:

1. **Choose your subscription:** Individual Subscription or Team Subscription.
2. **Individual Plans:** Bloom ₦6,800 / $6.80, Flourish ₦12,500 / $12.50 (Recommended), Infinity ₦25,000 / $25, with Sheriff's feature lists word for word. Choosing a plan goes to Billing preferences as before.
3. **Team Plans:** "How it works", then Bloom Team ₦24,500, Flourish Team ₦49,500 (Recommended), Infinity Team ₦99,500, each with the per-person price and Sheriff's features, and the note at the end.
4. **Create your team:** team name and the selected plan, then "Continue to payment" (Paystack, monthly).
5. **Your team is ready!:** team, plan and "1 of 5 occupied", with "Invite your team" and "Do this later".
6. **Invite your team:** invite by email (add another email, send invitations), or copy the invitation link. The admin can revoke the link, and the old one then stops working. The link can only fill free places.
7. **You've been invited!** (public page at loquiex's /team/join/CODE): team plan, invited by and "Covered by the team", then Accept invitation. New people sign up and existing members sign in, and either way they come straight back and join. Nobody pays again.
8. **My Team** (Profile, then Manage Membership, then My Team, or at /app/team): plan and price, members x / 5, invitations pending, your role, the member list with Active or Invited status, Invite members, and Manage subscription (current plan, billing, renewal date). The Team Admin can rename the team, remove members, cancel or undo invitations, renew or change the plan, and cancel the team plan. A member can leave the team.
9. **Practice as a team:** a new option in Group Practice. It starts a private room for the team, and every other team member gets a phone notification and a "Your team is practising now" card on My Team so they can join. If the team is already practising, choosing the option joins that call. A member who isn't in a team is taken to the team plans.

**Privacy:** the Team Admin only sees names, photos, roles and invitation status. They can never see members' recordings, transcripts or AI feedback.

## Plan rules (app and server)

- **New prices:** Bloom ₦6,800, Flourish ₦12,500, Infinity ₦25,000; Bloom Team ₦24,500, Flourish Team ₦49,500, Infinity Team ₦99,500. Dollar prices are the same numbers in $ (USD only works once Paystack enables it).
- **Bloom now includes Group Practice:** 45 minutes a day, and it can host calls of 2 people including the host. Flourish can host up to 6 people. Infinity is unlimited. The server enforces this.
- **Team plans:** up to 5 people including the Team Admin, who pays. Every member gets the plan's own allowance (their own AI feedback and call time). If someone has their own plan and a team plan, the better one counts. Team plans are prepaid monthly and don't renew on their own.
- The Help page answers now mention Bloom's group practice.

## Notifications: what Sheriff needs to do

The app code for notifications was already in place, but the server had no notification keys, so no phone notification could be sent. Render's free plan also sleeps, so timed reminders couldn't go out on time.

1. **On Render** (backend service, then Environment), add the four settings from `round-10/notifications-render-settings.txt` in the project files: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:` plus your email) and `CRON_SECRET`. Keep that file private.
2. **Free wake-up timer:** on cron-job.org, add a job for `https://articulate60.onrender.com/api/push/run-reminders`. Set it to every 5 minutes, method POST, with the header `X-Cron-Secret` set to your CRON_SECRET. This call now sends both the streak reminders and the 5-minute group call reminders.
3. **iPhone:** notifications only work once Loquiex is added to the Home Screen and opened from there.

## Other settings

- **Team email invitations** use the same email service as Forgot password: `RESEND_API_KEY` and `EMAIL_FROM` on Render. Without them, the app asks admins to copy the invitation link instead.

## Files

- **Backend, new:** `MODELS/Team.js`, `services/team.js`, `ROUTES/team.js` (`/api/team`).
- **Backend, changed:** `utils/plans.js`, `services/billing.js`, `ROUTES/billing.js`, `MODELS/User.js`, `MODELS/Payment.js`, `services/groupRooms.js`, `ROUTES/group.js`, `ROUTES/practice.js`, `utils/groupUsage.js`, `ROUTES/push.js`, `services/email.js`, `services/accountDeletion.js`, `index.js`, `src/data/prompts/the-speaking-stage.js`.
- **Frontend, new:** `src/Components/membership/SubscriptionPicker.jsx` and `.css`, `src/Components/membership/MyTeam.css`, `src/Pages/MyTeam.jsx`, `src/Pages/TeamJoin.jsx`, `src/lib/team.js`.
- **Frontend, changed:** `src/data/plans.js`, `src/data/prompts.js`, `src/data/support.js`, `src/Pages/Membership.jsx`, `src/Components/MembershipCard.jsx` and `.css`, `src/Pages/GroupPractice.jsx`, `src/Pages/Practice.jsx`, `src/Pages/Profile.jsx`, `src/Pages/Profile.css`, `src/Pages/ProfilePractices.jsx`, `src/Pages/PracticeSession.jsx`, `src/Pages/Login.jsx`, `src/Components/registration/RegistrationLayout.jsx`, `src/Components/practice/` (WrapUp.css, shareImage.js, DurationPicker.jsx), `src/Components/landing/` (Hero.jsx, HowItWorks.jsx), `src/Routes/AppRoutes.jsx`, `src/styles/GroupCall.css`, `src/styles/PracticeExtras.css`.

**Build note:** the frontend imports `Articulate60-backend/src/data/prompts`, so build with the backend folder present.

## Fix (19 November, after delivery)

- **Team plan prices:** these showed as missing when the live server was still the older one, because the older server's price list has no team plans and it replaced the app's whole list. The app now fills in any price the server doesn't send, so team prices always show (₦24,500 / ₦49,500 / ₦99,500, with $ and the per-person line).
- **Deploy the backend too.** Only the new backend charges the new prices through Paystack: Bloom ₦6,800, Flourish ₦12,500, Infinity ₦25,000, Bloom Team ₦24,500, Flourish Team ₦49,500, Infinity Team ₦99,500. Until it's deployed, the individual plans still show and charge the old prices, and team payments can't start.

## Fix: members being signed out (19 November)

- A sign-in used to end exactly 7 days after signing in, even for someone using the app at that moment. Sign-ins now last 30 days and are renewed automatically every day the member uses Loquiex, so active members stay signed in. The server sends a fresh sign-in in the `X-Refreshed-Token` header and the app saves it. Changed: `utils/authToken.js`, `middleware/auth.js`, `index.js` (CORS exposes the header), `src/api/axios.js`.
- Everyone is also signed out at once if `JWT_SECRET` on Render changes. When adding the notification settings, don't edit or re-paste `JWT_SECRET`.

## More corrections (19 November)

- **Share a Win:** the Share my win button shows before anything is typed. Tapping it with no win typed asks the member to type their win first.
- **Profile, My Team:** members of a team now see "My Team" first in the Activity tab. It's no longer on Manage Membership, and people who aren't in a team don't see it. Back on My Team goes to Profile.
- **Individual Plans and Team Plans:** smaller fonts throughout (titles, prices, features, How it works, buttons).
- **Choose your subscription:** the box around the section is gone, and the fonts are a bit smaller.
- **Recordings play in every browser:** recordings made in Chrome, Android or Firefox were saved as webm, which iPhone Safari can't play. That's why the feedback page said the recording couldn't play, and why the play buttons on Home (your recent practice) and in Practice history did nothing. Every new recording is now saved as .m4a, which every browser plays. Older recordings are converted the first time someone opens them, and from then on they play everywhere. The play buttons also show a short message if a recording still can't play. The server uses the new `ffmpeg-static` package for this, which Render installs on its own during the deploy.
- **Learn (coming soon):** the subtitle "Build the skills to communicate better." is back under Learn, centred. "There's a lot to learn…" is 2px bigger and the text under it 1px smaller. The timer boxes have the same green background as the book icon.
- **Usernames keep their capital letters:** usernames were saved in lowercase. The app now also keeps the username exactly as the member typed it and shows that version, while sign-in still works with any mix of capitals. Usernames already saved before this change lost their capitals, so they're shown starting with a capital letter. A member can get their exact capitals back by saving their username again in Personal information.
- **Group Practice:** the heading is now "Practice Together", the same size as "Just You". The practice option and the call time left use the Solo tab's style: "PRACTICE OPTION" with a picker built like "Choose your level", and "CALL TIME LEFT" built like "FEEDBACK 11 left", with the same fonts and colours. Tapping the call time shows the details. The All, Open seats and Nearly full buttons are smaller.
- **Splash screen:** the Loquiex logo sits a bit higher.
- **Files changed:** backend `services/audioConvert.js` (new), `ROUTES/practice.js`, `ROUTES/user.js`, `MODELS/User.js`, `package.json`, `package-lock.json`. Frontend `src/lib/playableAudio.js` (new), `src/Pages/` (Home.jsx, ProfilePractices.jsx, Profile.jsx, Profile.css, ProfileShareWin.jsx, Membership.jsx, MyTeam.jsx, GroupPractice.jsx), `src/Components/practice/` (RecordingPlayer.jsx, FeedbackReport.jsx), `src/Components/learn/LearnComingSoon.jsx`, `src/Components/membership/SubscriptionPicker.css`, `src/styles/` (GroupCall.css, Learn.css, globals.css).
- **Group Practice illustration:** the Jasmine and David cards are replaced by Sheriff's illustration (people round a table with speech bubbles). It's a wide crop of the people and speech bubbles, kept short (about 150px tall on a phone), and its edges fade into the card, so no light border shows. "Different voices, different perspectives.", "There's more than one way to see it." and Continue stay as they were. New file: `src/assets/group-practice-together.webp`. Changed: `src/Pages/GroupPractice.jsx`, `src/styles/GroupCall.css`.

## Deploy checklist (do these in order)

1. **Backend (Render):** unzip, copy the contents of `Articulate60-backend` into your backend git folder, then push. Render installs the new `ffmpeg-static` package by itself (it's used to make recordings play on iPhone).
2. **Frontend (Netlify):** copy the rest of the project into your frontend git folder and push, or deploy as you usually do. Build with the backend folder present.
3. **Don't touch `JWT_SECRET` on Render.** Changing or re-pasting it signs everyone out.
4. **Notifications:** add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` and `CRON_SECRET` on Render (values in `round-10/notifications-render-settings.txt`), then set the cron-job.org timer described above (every 5 minutes, POST, header `X-Cron-Secret`).
5. **Team email invitations:** check `RESEND_API_KEY` and `EMAIL_FROM` are set on Render.
6. **Your username:** after deploying, open Profile, Account, Personal information and save your username with the capital A. From then on it shows exactly as you typed it. Other members can do the same.
7. **Phone test:** sign in, play an old recording from Home and Practice history, open Group Practice, and try a team payment and invite.
