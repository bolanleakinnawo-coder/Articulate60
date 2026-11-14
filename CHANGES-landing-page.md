# Landing page (2026-11-14)

Built on ARTICULATE 60 (launch round 6).zip. Frontend only (Vercel). No backend or env var changes.

## Where it lives
- **loquiex.app/** shows the landing page to visitors (not signed in).
- Signed-in members who open **/** go straight to the app (/app/home), as before.
- **loquiex.app/landingpage** always shows the landing page, even when signed in (handy for checking it). The old landing page that used to be there is no longer routed (its files are untouched).
- Buttons: Get started / Start practising → /register, Log in → /login. Signed-in visitors on /landingpage see "Open app" and "Go to my practice" instead.

## Sections (mockup order, Home colours)
Nav, Hero, Your ideas deserve to be heard, Your journey (6 steps), 01 Solo practice, 02 Group practice, 03 AI feedback, 04 Learning resources, 05 Share your wins, 06 Share your practice, 07 Your progress, 08 Your Loquiex home, Loquiex is for you if..., Membership + compare table, FAQs, final call to action, footer.
Colours are the Home tab palette only (near-black, #131513 cards, olive buttons, #f1ecde). The light sections use that same off-white as the background, so the light/dark rhythm of the mockup stays without the mockup's greens. Font and sizes follow Home / Learn / Practice. Buttons in normal case. Responsive at 320px, phone, tablet and desktop, with no sideways scrolling (the compare table swipes inside its box on phones).

## Real data instead of the mockup's samples
- **Plans and prices** come from src/data/plans.js, so they always match Manage membership: Free ₦0 (3-day AI trial, up to 3 a day), Bloom ₦4,900 (150 a month, 5 a day, no group practice), Flourish ₦8,000 (360 a month, 12 a day, 1 hr 30 min group practice a day), Infinity ₦29,800 (unlimited). No "TBC". The mockup's Bloom group minutes (1,350/45) are wrong and were not used.
- **Practice levels and speaking times** come from the app (60s / 30s / no prep; speak 30 sec, 1 min or 2 min), and the topic list is the real 7 categories.
- **AI feedback areas** are the real report tabs (clarity, delivery, fillers, repetition, grammar, vocabulary). The sample "82" score was left out.
- **Community wall** shows up to 3 real wins that you approved in Admin (public /api/testimonials). If there are none yet it shows a short note about the wall instead.
- **Progress**: stat tiles name the real stats (sessions, speaking time, days practised, streak) without made-up numbers, and list the real milestones (10/50/100 practices, 7/30/100-day streaks, 100/250 words).
- **Leaderboard**: described in words (ranked by streak and speaking time). No fake members or points.

## Left out on purpose
- **Referral programme section, ₦12,500 wallet and Referrals nav link**: referrals aren't tracked yet (that build is on hold). Easy to add back when it's live.
- **Testimonial placeholder** ("Insert an authentic member testimonial"): replaced by the real community wall above.
- **Learner discount** lines and FAQ: there's no member discount on Learn yet (the launch offer is for everyone).
- **Contact / Privacy policy / Terms** footer links: those pages don't exist yet. The footer links to page sections and account pages instead.

## Pictures (placeholders)
All pictures are placeholders from existing assets, set in ONE file: **src/data/landingImages.js**. To swap one when the real screenshots are ready, put the new image in src/assets/landing/, change its import line there and update the alt text. Any size works; each is cropped to fit.

## Files
New: src/Pages/LandingPage.jsx, src/styles/PublicLanding.css (named so it does not clash with the old Landingpage.css on Windows), src/data/landingImages.js, src/assets/landing/loquiex-logo.png (trimmed copy of the brand logo).
Changed: src/Routes/AppRoutes.jsx (routes / and /landingpage).
