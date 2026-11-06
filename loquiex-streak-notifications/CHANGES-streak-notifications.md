# Real-time streak notifications

Built on: ARTICULATE 60 (2).zip + revisions-round-2 + profile-redesign.
Copy these files over your project, keeping the folder paths.

## What it does

Four streak notifications, in the Home tab colours and type scale, each with
"Maybe later":

| Notice | Who gets it | In app (Home card) | Phone (push) |
|---|---|---|---|
| Keep it going | streak going, not practised today | SPEAKING STREAK, "7 days", Practise today | 19:00 local |
| Restore | missed yesterday; today is the 24h grace day | "7-day streak", live "Time left to restore", Restore my streak | 09:00 and 20:00 local, with time left |
| Comeback | lost their streak or inactive | YOUR PROGRESS, IN PRACTICE, Practise today | 18:00 local, 3/7/14/30 days after last practice, then monthly |
| First streak | registered, no practice yet | "Your first streak starts here.", Start my streak | 18:00 local, sign-up day (if 1h+ ago) and days 1/3/7 |

Grace period (member's own time zone): practised Monday, missed Tuesday ->
grace runs Wednesday 00:00 to 23:59 local. Practising on Wednesday restores the
streak (the missed day adds nothing). Missing Wednesday too loses it on Thursday.
The time zone comes from the member's device on every request.

Both switches on Profile > Notifications are respected for pop-ups AND phone
reminders ("Streak pop-ups" covers keep/restore/comeback; "First streak" shows
if either switch is on). That page also has a new "Phone reminders" switch
for the device, plus "Send a test notification".

Real-time: Socket.IO pushes the new streak to every open tab/device the
moment a practice is saved, and at reminder times. The Home badge and card
update without a refresh, and refresh again just after local midnight.

## Changed files

Backend (Articulate60-backend/)
- index.js: Socket.IO on the same port, push setup, reminder job
- package.json, package-lock.json: adds socket.io, web-push
- MODELS/User.js: timeZone, notificationPrefs, pushSubscriptions, reminderLog
- ROUTES/practice.js: /streak returns full status in local time; live update after a practice
- ROUTES/push.js (new): /api/push/public-key, subscribe, unsubscribe, prefs, test, run-reminders
- utils/streak.js: time-zone aware streak with the 24h grace day
- utils/timeZone.js (new)
- services/streakNotices.js, push.js, realtime.js, reminderJob.js (new)

Frontend
- package.json, package-lock.json: adds socket.io-client
- vite.config.js: service worker imports push-sw.js
- public/push-sw.js (new): shows phone notifications, "Maybe later" action
- src/api/axios.js: sends X-Time-Zone
- src/lib/push.js, src/lib/realtime.js, src/hooks/useLiveStreak.js (new)
- src/data/notifications.js: the four cards + prefs sync to server
- src/Components/StreakPopup.jsx, src/styles/StreakPopup.css: redesigned cards
- src/Pages/Home.jsx: live streak
- src/Pages/ProfileNotifications.jsx, src/Pages/Profile.css: Phone reminders section
- src/Pages/Profile.jsx, src/Components/layout/Sidebar.jsx: log out stops this device's reminders

## To deploy

1. Generate VAPID keys once (keep the private key secret):
   `npx web-push generate-vapid-keys`
2. Add to the backend env on Render:
   - VAPID_PUBLIC_KEY=...
   - VAPID_PRIVATE_KEY=...
   - VAPID_SUBJECT=mailto:you@yourdomain.com
   - CRON_SECRET=any long random string
   - DEFAULT_TIME_ZONE=Africa/Lagos (optional; used until a device reports its zone)
3. Redeploy the backend (npm install runs automatically) and the frontend on Vercel.
4. Render free instances sleep after 15 min idle, which pauses the reminder job.
   Either use a paid instance, or create a free cron job (e.g. cron-job.org) every
   15 minutes: POST https://articulate60.onrender.com/api/push/run-reminders
   with header `X-Cron-Secret: <CRON_SECRET>`.

No frontend env changes: it uses the existing VITE_API_URL.

## Notes
- iPhone/iPad: push works only after "Add to Home Screen" on iOS 16.4+, opened
  from the Home Screen icon. The app tells iOS members this instead of a button.
- Browsers only show the permission prompt after a tap, so it's offered under
  the streak card ("Turn on") and on Profile > Notifications, never on load.
- A missed day can be restored each time it happens (no weekly limit yet).
