# Launch corrections, round 4 (2026-11-10)

Frontend (Vercel) and backend (Render, Articulate60-backend/) both changed. No new env vars are required.

## Home
- Word of the Day voice: phones now pick a natural British voice (never the robotic iPhone novelty voices like Flo/Shelley/Grandma, which the old picker could choose) and stop nudging pitch/rate on phones, which made Android sound strained. Laptops keep the same voice.
- "Your Recent Practices"; "View all" opens Profile on Your practices.
- Leaderboard ranks by current streak. Speaking time = time spoken during that streak (ties go to more streak speaking time). Backend: ROUTES/practice.js.

## Practice (Solo)
- "Join or host a practice session" button: brand CTA colour, white text, 10px radius, smaller card.
- "AI FEEDBACK" label is now "FEEDBACK" (and "feedback" in its texts).
- All CTAs in normal case (I'm ready, Start preparing, Join the challenge, Subscribe...).

## Research Mode
- Smaller "How to research better" section and cards; normal-case CTAs; smaller Start 15-min timer; "I'm done researching" above the toolkit; Surprise me on the CTA colour.

## Group practice
- "Practise Together" + new subtext; spacing fixed; tighter Start/Join buttons; smaller Find a practice; no divider lines; private invitation box removed.
- Small "Today's call time" card above Start a practice ("You have 1 hr 12 min left for calls today", minutes under an hour). Real numbers from /api/group/usage, refreshed every minute.
- DAILY call limit replaces the monthly one: Flourish 90 min/day, Infinity unlimited (utils/plans.js groupMinutesPerDay). When today's time runs out the server removes the member from the call automatically.
- Free/Bloom: lobby blurred behind "Upgrade your plan".
- Start a practice: Who can join first, then Seats, then topic/category; no wrapper box; Public/Private no background until selected; host topic max 60 characters (server enforces too) with smaller "E.g." placeholder; seat chips smaller + "Unlimited" (Infinity only); 12-hour time picker (hour, minutes, am/pm). Times are saved as one moment and shown in every member's own time zone, with a note saying so.
- Call room: smaller call-time card, bar counts down smoothly; daily wording; topic smaller than "Discussion prompt"; meta subtext removed; member boxes removed, smaller labels, crown instead of Host pill; avatars shrink as more people join.
- Host gets hosting back when they return to the call (services/groupRooms.js ownerId).
- Unlimited seats: peer-to-peer calls can't carry truly unlimited people; capped at GROUP_ROOM_MAX_UNLIMITED (default 12). True unlimited needs a media server (SFU).

## Reminders
- Planned practices remind 5 minutes before.
- Why they weren't arriving: phone notifications only go to devices that turned notifications on in Profile, and nothing asked when someone planned a practice or tapped Remind me. Now those taps ask for notification permission and subscribe the device.
- Backup: while Loquiex is open (even in a background tab) the app keeps its own timer and shows the notification itself (src/lib/practiceReminders.js).
- Still needed on Render: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, and the paid plan (the free plan sleeps, so its reminder timer stops). iPhone users must add Loquiex to the Home Screen to get notifications.

## After a practice
- That's a wrap sits higher and uses the same page edges as other pages.
- "Amazing" (no exclamation mark); Back to home and Share my practice closer together.
- Share link is just loquiex.app (no username).

## Feedback page
- "What you did well" section removed; "Grammar and wording" is now "Grammar"; new Repetition tab separate from Fillers.
