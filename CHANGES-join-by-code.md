# Join a group call with a code

Built on: merged-project/ARTICULATE 60 (updated).zip

## What it does

- **Private calls**: when starting a room, the host now picks "Private call"
  (default) or "Open room". A private call is never listed under Open rooms;
  the only way in is its code or invite link.
- **Every call gets a 6-character code** (like `52B 5E2`). Letters and
  numbers that are easy to confuse (0/O, 1/I/L) are never used. Codes are
  not case sensitive and spaces are ignored when typing.
- **Copy and Share in the call**: everyone in the call sees the code with
  "Copy code" and "Share" (the phone's share sheet; on computers it copies
  an invite message with the link instead). The link is
  `https://<your site>/app/group-practice/join/<CODE>`.
- **Join with a code**: Practice > Group Practice has a new "Join with a code"
  card, and the rooms page has a "Have a code?" box. Before joining, members
  see the call: topic, prompt, who's hosting and how many are in it.
- **Plan rules still apply to everyone**: Free and Bloom members who open an
  invite see the call and an "Explore membership" button, and the server
  refuses them if they try to join. Minutes are counted exactly as before,
  and the 6-person limit still applies.
- If someone signs out or isn't signed in, the invite link takes them to
  login and then straight back to the call.
- The code stops working when the last person leaves. If the host's network
  drops while alone, the call reopens with the same code.
- Guessing is slowed down: after 10 wrong codes in 10 minutes, a member must
  wait.

## Changed files

Backend (Articulate60-backend/)
- services/groupRooms.js: codes, private rooms, `group:lookup`, join by code

Frontend
- src/Pages/GroupPractice.jsx: "Have a code?" box, Private/Open choice,
  invite card in the call, new join page
- src/lib/groupCall.js: join by code, code helpers, keeps the code on reconnect
- src/Routes/AppRoutes.jsx: `/app/group-practice/join` and `/join/:code`
- src/Pages/Practice.jsx: "Join with a code" card on the Group Practice tab
- src/styles/GroupCall.css: styles for the above (Home colours and type scale)

No new npm packages. No new Render or Vercel environment variables.
Redeploy the backend (Render) and the frontend (Vercel).
