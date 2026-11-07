# Group Practice tab, live rooms, microphone prompt, Invite & Earn

Built on: merged-project/ARTICULATE 60 (account security).zip

## What changed

- **Practice > Group Practice** now has the new layout: "Practise together.",
  Start a practice (public or private), Join with a code, Find a practice with
  All / Open seats / Nearly full filters, room cards with Join, and the
  "Have a private invitation?" card. Home tab colours (olive), same fonts and
  sizes. 2 columns on tablet, 3 on wide screens.
- **Everything is live.** The room cards come from the server in real time:
  real topic, host name and seats (e.g. 3/4 participants). No sample rooms.
  When nobody is live it says so. Private practices never appear in the list.
- **Start a practice** (new page): Public or Private, topic, seats (2 to 6
  people), first prompt.
- **The room screen** follows the screenshot: Leave room, topic, "Public
  practice · Audio-only group", In room timer, the Group practice room card
  with each real person (You, the host, others) plus open seats, the Speaking
  prompt with Next prompt and Write your prompt (host), the invite code, and
  Mute / Raise hand / Leave buttons. Nothing is demo; audio is live WebRTC.
- **Microphone prompt before joining** (like Zoom): "Allow microphone?" with
  Allow microphone / Don't allow, just listen. If the phone or browser has
  blocked the mic, members get step-by-step help for iPhone, Android or
  computer, with Try again. Members who joined without a mic can tap Unmute
  any time and we ask again; the mic starts working without leaving the call.
- **Profile > Invite & Earn** shows "Coming soon" and can't be opened. The
  Help answer for Invite & Earn says it's coming soon.
- Plan rules unchanged: Free and Bloom see the rooms, but Start and Join take
  them to the membership page. The server still refuses them.

## Changed files

Backend (Articulate60-backend/)
- services/groupRooms.js: host picks the number of seats (2 up to 6)

Frontend
- src/Pages/GroupPractice.jsx: new Group tab, Start a practice page, mic
  prompt and help, new room screen
- src/lib/microphone.js (new): asks for the mic and the help steps
- src/lib/groupCall.js: joins with the allowed mic, turn the mic on mid-call
- src/Pages/Practice.jsx: Group tab uses the new layout
- src/Routes/AppRoutes.jsx: /app/group-practice/start
- src/styles/GroupCall.css, src/styles/PracticeExtras.css: styles
- src/Pages/Profile.jsx, src/Pages/Profile.css: Invite & Earn "Coming soon"
- src/data/support.js: Help answers for group practice and Invite & Earn

No new npm packages and no new environment variables.
Redeploy the backend (Render) and the frontend (Vercel).
