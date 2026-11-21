# Round 14 corrections (2026-11-21)

Built on round 13 (2026-11-19). Only the 18 items Sheriff listed. Phone screenshots are in `launch-round-14/`.

## Group tab
1. **Find a practice cards fill the row**, one card per row on phone, tablet and laptop.
2. **The Group Practice picture above Continue has no background.** The picture itself is now transparent (only that picture).
3. **Tabs are All, Live, Upcoming, Team** (Live before Upcoming).
4. **The call room topic line is a little bigger** (14px to 17px).
5. **A planned call that has started shows under Live only**, never under Upcoming. When the call ends it disappears from every list. (The host's own private planned call shows under Live with "Return to call" while it's live.)
6. **Team Call live: the person who started it sees "Continue call"** and it takes them back into the call. Before, "Join now" left the call and joined it again, which ended it when they were alone in it. Anyone already in that call also gets "Continue call".
7. **Find a practice has no outer box**; it fills the screen width.

## Login
8. **No more logout loop after a password change.** A slow background check sent with the old sign-in can no longer log out (or overwrite) the new one.
9. **No automatic logout.** Members stay logged in until they log out. (Changing or resetting the password, or deleting the account, still signs out every device.) Older 30-day sign-ins keep working and are swapped for a non-expiring one automatically.

## Free trial and plans
16. **The free trial is no longer automatic for new accounts.** After sign-up, new members land on Manage Membership, where they tap **Start free trial** or pick a plan. The Solo tab says "Your 3-day free trial is ready. Start it, or choose a plan." with a **Start free trial** button, and the feedback box says "Trial not started" instead of "Trial ended". Accounts made before this round keep the trial they had.
17. **A free-trial member who taps "Get Bloom" now sees the Individual or Team choice**, and the "Unlock AI feedback and see exactly how you communicated." line no longer shows for free-trial members.

## Admin
10. **Admin > Notifications**: pick one of Sheriff's 19 groups, see how many members fit right now, type one message ({name} optional), then **Send to all** or **Schedule** a date and time. A list shows what was sent (and to how many members) and what's scheduled, with Cancel. Each goes to members' phones (where they allowed notifications) and shows in the app if it's open. **Nothing sends automatically**: the automatic streak/inactivity reminders are now off. (The 5-minute "Remind me" alerts for planned group calls and the "your team started a call" alert still go out, because the member asked for them or it's a live call. Say if you want those off too.)
11. **Admin > Emails**: the 9 automatic emails (Welcome, 3-day free trial confirmation, Trial ending soon, Trial ended, Subscription confirmation, Payment successful with receipt details, Payment failed, Subscription expiry reminder, Subscription expired). Each one has an on/off switch, and you can edit its subject and text ({name}, plus {plan}, {date}, {amount}, {item}, {reference} where they apply). They send automatically through Resend. I wrote the starting text. Change it there any time.
12. **Dashboard sections**, all from real data, with a month picker:
    - **Overview**: total, active (practised in the last 30 days), paying members, new registrations this week and in the selected month, revenue.
    - **Practice Analytics**: completed practices, the most popular practice feature (Spin the Jar, Yap Mode, Research Mode, Word of the day), streaks, inactive members (3+, 7+, 10+ days, never).
    - **Learn Analytics**: Learn purchases and popular resources (no discounts).
    - **Group Practice**: sessions, participants, average call length, call time used, planned practices. Sessions are counted from this round on.
    - **Subscriptions & Payments**: active subscriptions (by plan, plus team plans), revenue, new subscriptions, renewals, cancellations, failed payments.
    - Plus Notifications and Emails above. The feature reminders part is on hold, as asked.
13. **Better admin design**: on a phone there's a header with one row of scrollable tabs (the old crowded bottom bar is gone); on a laptop the sidebar is grouped into Dashboard and Manage. Stats sit two per row on a phone.
14. **Admin login page just says "Admin login"** (the wins/subscriber line is gone).
15. **E-books**: each uploaded PDF has **Re-upload PDF** and **Delete PDF**. Members who own a book keep it, and can read it again once a new PDF is uploaded.

## App icon
18. **The home screen icon's logo is bigger and bolder.** It now fills about 80% of the icon (it was about 25%). Phones keep the old icon until the app is removed from the home screen and added again.

## Render (backend) settings
- No new required variables.
- Emails need `RESEND_API_KEY` and `EMAIL_FROM` (plus `APP_URL` for the buttons in emails), the same as for Forgot password.
- Optional: `AUTO_STREAK_REMINDERS=on` turns the old automatic streak reminders back on. Leave it unset to keep everything admin-only.

## Deploy
Both parts changed: copy the backend folder into the Render repo and the rest into the Netlify repo, then push both.
