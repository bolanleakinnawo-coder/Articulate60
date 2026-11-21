# Round 15 corrections (2026-11-21)

Built on round 14. Only the 3 things Sheriff asked for. Screenshot is in `launch-round-15/`.

1. **Notifications show only your message.** The phone already shows the app name (Loquiex) at the top, so the extra "Loquiex" title is gone. The notification now shows just what you typed.
2. **"Not recorded (before round 14)" is gone from the admin page.** Practices with no feature name now show as **"Other"**, and the "Sessions are counted from round 14 onwards." line under Group Practice is removed.
3. **The notification form clears after you press Send.** The group, message and schedule time are emptied, and the "Sent to … members" line stays so you know it went.

## Deploy
Both parts changed: copy the backend folder into the Render repo and the rest into the Netlify repo, then push both. No new Render settings.
