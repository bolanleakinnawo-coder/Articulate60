# Group call setup, scheduling and room rework

Built on: merged-project/ARTICULATE 60 (group tab).zip

## Start a practice
- "How would you like to practise?": **Host a discussion** (type your own
  topic) or **Practise with Loquiex** (choose a category, first prompt,
  Another prompt, Write your own prompt). No "Optional" labels.
- A host's own topic is the room's title everywhere: Find a practice, the
  join screen and the call. Loquiex-guided rooms show the prompt as the
  title with "Category · Loquiex-guided" underneath.
- Who can join, Seats, then **When do you want to practise?** Start now /
  Schedule for later (date + start time, up to 30 days ahead).

## Scheduling
- Planned practices are saved in the database (new ScheduledPractice model).
- Group tab: "Your planned practices" (code, Start now, Cancel) and
  "Upcoming" (public practices by others, with Remind me).
- Reminder 10 minutes before for the host and everyone who tapped Remind me:
  in-app banner, plus a phone notification when push is set up.
- A private planned practice's code works on Join with a code: it shows when
  it starts and offers Remind me.

## Call room
- Small invite code at the top (tap to copy). The big invite card is gone.
- Call time box at the top: minutes left, used today, this month, timer.
- "Group practice room" box and open seats removed: only people in the call.
  Host alone on the first row, everyone else two by two.
- Compact **Discussion prompt** card with Next prompt and Write (host).
- Host can switch category: tap the title (Loquiex-guided) or the
  "Prompt ideas" dropdown (host-led).

## Staying on the call
- The call no longer ends when you leave the call screen. A bar at the top
  of every page shows "You're on a call" with Mute, Return and Leave.
- Installed app / phone: if the connection drops (screen locked, app in the
  background, network blip) the server keeps your seat for 2 minutes and the
  app rejoins automatically when you come back, getting the mic back if the
  phone stopped it. Screen is kept awake during calls where supported.
- iPhone limit: iOS pauses web apps in the background, so audio stops while
  you're away. Nothing a web app can do prevents that; the app tells iPhone
  users to keep Loquiex open and reconnects them when they return.

## Changed files
Backend (Articulate60-backend/)
- MODELS/ScheduledPractice.js (new)
- services/scheduledPractice.js (new): 10-minute reminders, every minute
- services/groupRooms.js: room mode/topic, start a planned practice,
  planned-code lookup, 2-minute seat grace on disconnect, host kept on rejoin
- services/realtime.js: longer ping timeout for phones
- services/accountDeletion.js: deletes a member's planned practices
- ROUTES/group.js: GET/POST /api/group/scheduled, POST .../:id/remind,
  DELETE .../:id
- index.js: starts the reminder job

Frontend
- src/Pages/GroupPractice.jsx, src/styles/GroupCall.css
- src/lib/activeCall.js (new), src/lib/groupCall.js
- src/Components/layout/CallBar.jsx (new), AppLayout.jsx
- src/data/support.js

No new npm packages. No new required environment variables
(optional: GROUP_AWAY_GRACE_MS, default 120000).
Redeploy the backend (Render) and the frontend (Vercel).
