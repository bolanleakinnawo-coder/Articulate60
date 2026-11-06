# Group practice calls (live audio)

Built on: ARTICULATE 60 (2).zip + revisions-round-2 + profile-redesign + share-image
+ streak-notifications. Copy these files over your project, keeping the folder paths.

## Why it didn't work before

The group room was a preview screen only. It showed four made-up members
("Member 02" and so on), never turned on the microphone, had no call
connection, and nothing on the server knew about rooms. Minutes were counted
on the phone only, and the server only knew "free" / "pro", so it could not
tell Bloom from Flourish.

## What it does now

- **Open rooms**: Flourish and Infinity members see the rooms that are live
  right now (topic, prompt, who's in, "3 of 6 speaking") and can join, or
  start a room by picking a topic and a first prompt. The list updates live.
- **Live audio call**: real voices between members, up to 6 per room.
  Mute, raise hand, "Speaking" ring on whoever is talking, host badge, and
  the host can pull a new prompt for everyone. If the host leaves, the
  longest-standing member becomes host. The room closes when the last person
  leaves. If someone's connection drops, they rejoin the same room on their own.
- **Bloom and Free**: no group practice. The app sends them to the
  "Your voice belongs in the room" page, and the server refuses them too
  (even with a direct link).
- **Minutes, enforced by the server**: one minute is used for each full minute
  a member spends in a call **with at least one other person** (waiting alone
  is free). Stored day by day in the member's own time zone, so Practice and
  Profile > Usage & Limits show today / this month from real data. The
  5-minute and 1-minute warnings still show, and at 0 the member leaves the
  call ("Your practice time is up"); the others carry on.
- If the microphone is blocked, the member can still listen and is told how
  to allow it.
- Restyled the group pages in the Home colours and type scale (the old room
  used the brighter greens).

## Changed files

Backend (Articulate60-backend/)
- index.js: adds `/api/group`
- MODELS/User.js: `plan` now allows bloom / flourish / infinity (old "pro" still means Bloom); new `groupMinutes` (minutes per local day)
- ROUTES/group.js (new): `/api/group/ice`, `/api/group/usage`, `/api/group/plan` (testing only, see below)
- ROUTES/practice.js: AI feedback allowed for every paid plan, not just "pro"
- services/groupRooms.js (new): rooms, call signalling, plan check, minute counting
- services/realtime.js: plugs group rooms into the existing Socket.IO connection
- utils/plans.js (new): group minutes per plan (keep in step with src/data/plans.js)
- utils/groupUsage.js (new)

Frontend
- src/Pages/GroupPractice.jsx: intro, open rooms + start a room, live call, time-up
- src/styles/GroupCall.css (new)
- src/lib/groupCall.js (new): microphone, WebRTC connections, speaking meter
- src/lib/realtime.js: shares its Socket.IO connection
- src/Routes/AppRoutes.jsx: new route `/app/group-practice/room/:roomId`
- src/data/plans.js: saves the chosen plan on the server; group minutes come from the server
- src/Pages/Practice.jsx, src/Pages/ProfileUsage.jsx: load group minutes from the server

No new npm packages (socket.io / socket.io-client came with the streak notifications update).

## To deploy

1. Redeploy the backend on Render and the frontend on Vercel. No new
   environment keys are required.
2. Optional, recommended before launch: a relay (TURN) server so members on
   strict mobile networks can always connect. Add ONE of these on Render:
   - Cloudflare Realtime TURN: `CLOUDFLARE_TURN_KEY_ID` and `CLOUDFLARE_TURN_KEY_API_TOKEN`
   - Any provider's list: `ICE_SERVERS` = JSON array of ICE servers
   - Or `TURN_URLS` (comma separated), `TURN_USERNAME`, `TURN_CREDENTIAL`
3. Optional: `GROUP_ROOM_MAX` (default 6).
4. When real payments go live, set `PAYMENTS_LIVE=true` so the app can no
   longer set its own plan; the payment webhook should set `user.plan`.

## Good to know

- Testing until payments are live: choosing a plan on the Membership page now
  also saves it on the server, so group access and AI feedback match the plan
  shown. Anyone can still "subscribe" for free in this testing mode.
- Rooms live in the server's memory: a redeploy or restart ends calls in
  progress. Keep the backend on one instance.
- Render free plan: after 15 idle minutes the server sleeps, so the first
  person to open group practice may wait up to a minute (the app says so).
- Calls are not recorded. Headphones avoid echo.
- "Unlimited participants" on Infinity: rooms are capped at 6 because each
  member's phone sends audio to every other member. Bigger rooms need a paid
  audio server (SFU); see the options in the thread.
