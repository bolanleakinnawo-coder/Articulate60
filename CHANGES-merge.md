# Merge: streak notifications + group calls + Paystack (USD) + Research Mode

Your uploaded project already had most of these updates. These files were
still old versions, so they are replaced here:

## Server (Articulate60-backend) - this is why Render gave 404
- index.js: now mounts /api/billing and /api/group, the Paystack webhook
  (before express.json) and "trust proxy" for Render.
- MODELS/User.js: paid plan fields (bloom/flourish/infinity, planExpiresAt,
  payment refs, group minutes). Streak/notification fields kept.
- ROUTES/practice.js: AI feedback for any active paid plan (was "pro" only).
- services/realtime.js: plugs group practice rooms into Socket.IO.

## App (src, public)
- public/push-sw.js: this file had been overwritten with a copy of
  src/api/axios.js, which breaks the service worker and phone reminders.
  Restored.
- src/Components/StreakPopup.jsx: streak-notifications version (restore
  countdown, "Turn on" phone reminders).
- src/Pages/Profile.css: Paystack checkout styles added at the end.
- src/Components/practice/ShareSheet.jsx, shareImage.js, FeedbackReport.jsx:
  the newer share image (the session page was already calling them with
  the new props).
- src/assets: four image file names now match the case used in the code
  (ArticulateLogo.png, Jar2.PNG, jar.png, jar3.PNG), so the build works on
  Linux (Vercel/Render) too.

Everything else is exactly as you uploaded it, including your own edits.

## Render environment variables (backend)
Required for the new features: PAYSTACK_SECRET_KEY, ADMIN_API_KEY,
VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (e.g. mailto:you@example.com). Optional: PAYSTACK_USD_ENABLED,
PAYSTACK_LIVE, APP_URL, TURN_URLS / TURN_USERNAME / TURN_CREDENTIAL.
Paystack dashboard webhook URL: https://<your-render-url>/api/billing/paystack/webhook
