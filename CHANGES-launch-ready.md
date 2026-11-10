# Launch-ready fixes (2026-11-09)

Built on: merged-project/ARTICULATE 60 (choose feedback).zip (includes the Amazing page fix)
Full project: merged-project/ARTICULATE 60 (launch ready).zip

## Backend (Render)
- index.js: stops with a clear log if MONGO_URL or JWT_SECRET is missing; warns
  for R2, Deepgram, Gemini, APP_URL, Paystack; logs unhandled errors; new
  GET /health route for uptime pings; clean JSON answer for bad requests.
- DB_CONFIG/db.js: if MongoDB can't connect at start-up the server exits so
  Render restarts it (before, it kept running with no database and every
  login hung).
- ROUTES/user.js + utils/usernames.js: login/sign-up/forgot-password find
  usernames with the index instead of a slow case-insensitive scan. Older
  mixed-case usernames are lowercased once at start-up. Sign-in still works
  whatever case the member types.
- ROUTES/user.js: sign-up limit of 30 per hour per network; sign-up no longer
  fails if phoneNumber is missing or improvements isn't valid JSON;
  forgot-password per-IP limit raised 5 -> 15 per 15 min (shared mobile IPs);
  login rejects non-text input.
- ROUTES/practice.js: leaderboard cached for 5 minutes (was re-reading every
  recording on every Home visit); AI daily cap also counts analyses still
  running, so tapping several at once can't go over.
- MODELS/Recording.js: indexes {user, createdAt} and {user, analysisStatus, analyzedAt}.

## Frontend (Vercel)
- Members stay signed in: token and user moved from sessionStorage to
  localStorage (before, closing the app or tab signed them out). Anyone
  signed in when this ships is carried over. Log out still clears it.
- Components/layout/ErrorBoundary.jsx/.css: a broken screen shows
  "Something went wrong" with Try again / Back to home instead of a blank
  page. An old tab after a new release reloads itself once.

Admin key and reset-link token stay in sessionStorage on purpose.
