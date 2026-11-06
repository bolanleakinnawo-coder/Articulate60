# Loquiex profile page redesign

Copy src/Pages/Profile.jsx and src/Pages/Profile.css over your current files
(built on top of revisions round 2). No other files change, no backend changes.

## What changed
- New layout matching the reference: "Your Profile" header, summary card
  (avatar, name, "Current plan" pill, member since), then three groups:
  Your Loquiex, Your membership, Account & preferences, and a Log out card.
- Colours use the Home tab palette (olive on near-black from globals.css).
  The leftover green tints in the profile sub-pages were swapped too.
- Every row opens its own page. Your Stats and Share a Win are now pages
  instead of drop-downs. The summary card opens Personal information.
- Personal information = photo, name, username, email.
- Privacy & security = change password + a note on data/account deletion
  pointing to Help & support.
- Invite & Earn is NEW and a placeholder: it shows a link
  (/register?ref=<username>) with Copy/Share and rewards counters at 0.
  Referral tracking and rewards need a backend before launch.

## Update 2: Your Stats page
- New file src/Pages/ProfileStats.jsx (copy it in too).
- Matches the reference: back link, intro card, "Your overview" with a
  This week / All time switch (practices, speaking time, current streak,
  days practised), a Mon to Sun bar chart of minutes spoken this week,
  9 milestones with progress bars, and a "Start a practice" button.
- All figures are real, from /api/practice/recordings and /api/practice/streak.
  They refresh when the page opens, when the app comes back into focus,
  and every minute while the stats page is open.
- Streak milestones use the best (longest) streak so they stay unlocked.
  Vocabulary milestones count Word of the Day practices.

## Update 3: Share a Win page + responsive pass
- New file src/Pages/ProfileShareWin.jsx (copy it in too).
- Matches the reference: intro card, "Your win" box with 0/280 counter,
  "Share my win" (greyed out until something is typed), community note,
  and "Your recent wins" with All / Pending / Published filters.
- Real data: wins save through POST /api/testimonials (as before) and the
  list comes from a NEW endpoint GET /api/testimonials/mine.
  BACKEND REDEPLOY NEEDED: Articulate60-backend/ROUTES/testimonials.js.
  Status: pending = "Pending", approved = "Published",
  rejected = "Not published" (shown under All only).
  The list refreshes when the page opens and when the app regains focus;
  a new win appears straight away.
- Responsive: every profile page checked at 320px, 768px and 1280px with
  no sideways scrolling; extra spacing tweaks for small phones.

## Update 4: font sizes match Home, Learn and Practice
- Profile.css only. One type scale (documented at the bottom of the file)
  copied from the main tabs: page titles 28px on phones growing to ~38px on
  desktop, 15px subtitles, 22px card headings, 15px section titles,
  14px row titles and body text, 12px small text and uppercase labels,
  13px chips and links, 16px main buttons. Inputs stay 16px so phones don't
  zoom in.
- Win approvals unchanged: the admin still sees each win in the admin panel
  and approves or rejects it.

## Update 5: Your Practices page
- New file src/Pages/ProfilePractices.jsx (copy it in too).
- Matches the reference: "Your journey" card (prompts practised, words
  practised), Practice history with "N shown", All / Speaking / Vocabulary
  filters, a Recent / Oldest sort menu, and a "Start a new practice" button.
- Real data from /api/practice/recordings: Vocabulary = Word of the Day
  practices, Speaking = everything else. Each row shows the prompt or word,
  date and time, and length.
- "Feedback available" opens the saved feedback report. Older recordings
  without feedback show "Get AI feedback" (same rules as before: free users
  are sent to the membership page).
- Long histories show 20 at a time with a "Show more" button.
- Same Home palette and font scale; checked at 320px, 414px and 1280px.

## Update 6: Usage & Limits page
- New file src/Pages/ProfileUsage.jsx, and src/data/plans.js is updated
  (copy both in).
- Matches the reference: current plan card with "Active" badge, a
  Today / This month switch, AI feedback and Group practice allowance cards
  with progress bars, Personal practice (Unlimited), a "How usage works"
  drop-down, and "Need more room to practise?" with Explore plans (hidden on
  the top plan).
- Real data: the plan comes from the user's account (or the demo plan);
  AI feedback used = recordings analysed today / this month; group minutes
  come from the group practice tracker. Plans without group practice show
  "Not included" with a link to plans.
- "This month" shows what was used since the 1st (daily allowances don't
  roll over).
- plans.js now keeps a per-day log of group minutes (needed for the monthly
  view) and counts days on the user's local clock. Old saved values still work.
- Same Home palette and font scale; checked at 320px, 414px and 1280px.

## Update 7: Manage Membership page + new plan line-up
- src/Pages/Membership.jsx is rebuilt as "Manage Membership" to match the
  reference: current plan card (price, next renewal, Explore other plans),
  Compare plans (Bloom, Flourish, Infinity), Billing preferences
  (Monthly / 3 / 6 / 12 months, save 0 / 5 / 8 / 15%), Subscription details,
  and Cancel membership (shows what happens first, then confirms).
- Plans in src/data/plans.js now follow the reference:
    Free      3 AI feedback a day, no group practice
    Bloom     N4,900/month, 150 AI feedback/month (up to 5 a day),
              NO group practice
    Flourish  N8,000/month, 360 AI feedback/month (up to 12 a day),
              2,700 group minutes/month
    Infinity  N29,800/month, unlimited AI feedback and group practice
- Group practice is now only for Flourish and Infinity everywhere: the
  Practice tab, the group practice intro and room, Usage & Limits, and the
  Help answers (src/data/support.js). Group minutes are monthly.
- Practice tab "Your limits" card and Usage & Limits read the new monthly
  allowances and daily caps; unlimited plans show "Unlimited".
- New src/data/planIcons.js (plan icons shared by two pages).
- Changed: Membership.jsx, Practice.jsx, GroupPractice.jsx, ProfileUsage.jsx,
  Profile.jsx, Profile.css, data/plans.js, data/support.js.
- Payments still aren't live: "Continue to billing" saves the plan and
  billing period on this device, and the renewal date is worked out from
  that. When real billing is added, getSubscription() in plans.js is the
  one place to swap in the payment provider's data.

## Update 8: Personal information page
- Profile.jsx + Profile.css only.
- Matches the reference: large avatar with the user's name and
  "Edit profile picture" (crop, preview before saving, or remove), then a
  "Basic information" card with Full name, Username, Email address,
  Change password and Confirm password, each with a hint line, and
  "Save changes".
- Real data: fields load from the signed-in user and save through the
  existing PUT /user/profile (no backend change). Leave the password blank
  to keep the current one; mismatched passwords are caught before sending.
- Password change moved here from Privacy & security, which now links to it.
- Notifications and Invite & Earn now use the same "← Your Profile" header
  as every other profile page.

## Update 9: Notifications page
- New file src/Pages/ProfileNotifications.jsx (copy it in too), plus
  Profile.jsx / Profile.css.
- Matches the reference: cards with type label (Learn / Update /
  Announcement) and icon, title, "Today · 9:00 AM" style time, message,
  an unread dot, and "You're all caught up." at the end.
- No demo entries. The page reads GET /api/notifications
  ([{ _id, type, title, body, createdAt }]). That endpoint doesn't exist yet,
  so for now everyone sees "You're all caught up." with a short note.
  Notifications seen once are marked read on that device.
- The existing pop-up switches (Streak pop-ups, Practice nudges) are kept
  under "Pop-up settings" at the bottom.

## Update 10: Help & support

- `src/Pages/HelpSupport.jsx` rebuilt in the profile style: "Quick answers" (6 questions, expandable; "View all questions" shows 12, "Show fewer questions" collapses), then "Contact us" with an Email support card that opens a pre-filled email.
- `src/data/support.js`: answers rewritten to match the app as built. Bloom has no group practice; Free is unlimited personal practice plus 3 AI feedback a day; payments aren't live yet; Invite & Earn rewards start once payments go live; live group calls are coming soon; limits reset at midnight (daily) and on the 1st (monthly).
- "How is my recording used?" no longer says Loquiex has no access to it. Recordings are stored on the server and used to create your analysis, so it now says they're private to your account, not shared with other members, kept for playback and used for your feedback.
- `SUPPORT_EMAIL` is still `support@loquiex.app` (placeholder, needs confirming).
- `src/Pages/Profile.jsx`: Help & support links pass `from: "profile"` so the back link says "Your Profile".
- `src/Pages/Profile.css`: Help & support styles appended.
