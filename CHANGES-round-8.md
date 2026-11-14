# Loquiex launch corrections, round 8

Full project: `merged-project/ARTICULATE 60 (launch round 8).zip`
Previews: `launch-round-8/previews/` (each page at phone 390px, desktop 1366px and 320px).

Everything from round 7 is kept, including the in-app Paystack payments.

## Deploy steps

1. Unzip, copy the contents of `ARTICULATE 60` into your existing git folder and push, as usual.
2. **Only the frontend changed this round.** Netlify rebuilds the site on its own after the push. Nothing in `Articulate60-backend` changed, so Render doesn't need a new deploy.
3. **No new environment variables.** Your Netlify site already has `public/_redirects`, so page links and refreshes keep working there. Nothing in this round assumes Vercel.
4. One check on Render: `APP_URL` is used for password reset emails, so it should be your Netlify address (`https://loquiex.netlify.app`, or your own domain once it's connected).
5. After deploying, check it on your phone: the Group tab, Learn, Profile and Manage Membership.

## The corrections

1. **"Join or host a practice session" (bottom of Practice, under Research Mode and Yap Mode):** the button is smaller, only as wide as its text, and starts on the same line as "Ready to practise with others?". It no longer competes with Spin the Jar.
2. **Group tab, today's call time:** the big box is gone. The call time now sits at the side of "Practise Together", in the style of your reference: **1 hr 30 min / call time left today**, with a small (i) button that explains the daily allowance. It turns gold when it's nearly used up and shows "resets at midnight" when it's used up. Infinity shows "Unlimited". On very small phones (320px) it moves just under the heading on the right.
3. **Upcoming, scheduled and live call cards:** the main topic is smaller. "Remind me", "Join this practice" and "Start now" now use the brand button colour from the rest of Group. The date pill, seats, category, Loquiex-guided and "Host:" text are all smaller.
4. **Research Mode, "Learn something new. / Be able to explain it.":** redesigned with a clear type scale. The heading is larger, with the second line in the brand olive. "How to research better" is now a proper section heading inside its own card, above body text. The four steps are cards with an icon, their number, a bold step title and body text underneath. Your wording is unchanged, and the steps are still 2 x 2 on every screen.
5. **Learn, "Featured for you":** the original card design is back (see the follow-up fixes below). Your text is used word for word:
   - YOU'RE NOT BAD AT SPEAKING. YOU JUST NEED THIS.
   - A practical, mentor-like guide to help you work through your speaking struggles, express your thoughts clearly and become a more confident communicator.
   - ₦12,000 / $12, then **20% discount: ₦9,600 / $9.6**
   - Word Playbook and Grammar Playbook show ₦3,500 / $3.5, then ₦2,800 / $2.8, with your descriptions.
   - Every button says **Buy Access**.
   Prices show in your order, the full price first and the discounted price under it.
6. **"My library" is now "My Learning"**, with your text: "Everything you've unlocked, in one place." When it's empty it shows "Your learning journey starts here" / "Access everything they've purchased, started or completed." and an **Explore Learn** button. The book reader's back button and the buy pop-up say My Learning too.
7. **Profile:**
   - Day streak is removed from Activity.
   - The selected Activity / Membership / Account pill uses the brand button colour, not white.
   - **Log out** and **Delete account** now show on all three tabs.
8. **Your Stats:** the "Your communication journey" text is removed.
9. **Manage Membership:** Renew, Upgrade and Compare plans are three compact buttons on one line, and **Cancel plan** is on its own at the end of the page in **red**. The "Yes, cancel plan" button in the confirmation is red too.
10. **Usage & Limits:**
    - **Today** shows the daily figures: "1 hr 30 min call time left today", "1 hr 30 min a day · resets at midnight".
    - **This month** shows monthly usage only: the call time used since the day they paid, and "Your monthly usage resets on 7 Dec 2026, a month after the day you paid." The AI feedback month card no longer shows the daily limit either.
    - Call time is always shown in hours and minutes, never "90 minutes".
11. **Help & support, "How do I change or cancel my subscription?":** the sentence about payments not being live is removed. I searched the whole app for any other not-live or test wording and found none.
12. **"What happens when I reach my usage limits?":** now says the monthly allowance resets a month after the day they paid (for example, pay on 7 Nov and it resets on 7 Dec), starts again when they renew, and doesn't reset on the 1st. The landing page FAQ has no reset wording, so nothing needed changing there. I also fixed the "time is up" note in a group call, which still said minutes reset on the 1st. It now says today's call time resets at midnight.
13. **"Where can I find learning resources?":** "Open Learn to explore the learning resources available on Loquiex."
14. **Learn, Launch special:** redesigned as a celebration card with a round **20% OFF** badge, the "Launch special" pill, your heading and text, a clearer countdown (Days / Hours / Mins / Secs) and the end date underneath. The wording is unchanged.
15. **Feedback page, "Focus on this next" > "See the evidence":** it now opens the right tab, opens the transcript, highlights the matching words and scrolls the member straight to them. See `previews/feedback-see-the-evidence-phone.png`.
16. **Group tab, "Start a practice" and "Join a private group":** both cards are bigger, with larger titles and icons. "Join a private group" now has an olive border and tint, so the two cards stand out from the rest of the page.
17. **Share a Win list:** each win now has one top line with the date, time and a status pill (Pending / Published), with the win underneath. There are no Sent / In review / Published steps. Times use the 12-hour clock (9:40 am).
18. **Billing preferences:** every option (Monthly, 3, 6 and 12 months) shows its total price on the option itself, plus the price per month for the longer periods. Under "Billing period" it names the plan the prices are for. "Pay in" (naira or dollars) moved above the periods. When someone taps a period, the page keeps the total and the Pay button in view, so nobody has to scroll to find the price.

## Follow-up fixes (same day)

- **Featured for you** now uses the original Learn card, exactly as in your screenshot: the dark card, a small pill at the top left ("Featured for you"), the big bold title, the grey description, the illustration box and the olive button with an arrow. Only the text changed: "YOU'RE NOT BAD AT SPEAKING. YOU JUST NEED THIS.", your description, ₦12,000 / $12, then 20% discount: ₦9,600 / $9.6, and **Buy Access →**. On a phone the prices sit just above the button.
- **Manage Membership:** Renew, Upgrade and Compare plans are now three small buttons on one line. **Cancel plan** is back on its own at the very end of the page, in red.
- **New subscribers:** the price on every billing option (Monthly, 3, 6 and 12 months) works for everyone, because there's one plans screen. New members get there from the Group practice page, from Upgrade, or from Profile. When someone comes from the Group practice page, Flourish is now picked for them, because Bloom doesn't include group practice. See `previews/membership-from-group-*.png`.

## Small fixes found along the way

- Help & support said the reminder comes 10 minutes before a scheduled practice, but it comes 5 minutes before. This is now correct in the FAQ and on the invite page.
- The FAQ said group time counts towards "monthly minutes". It now says daily call time (1 hr 30 min a day on Flourish, unlimited on Infinity).

## Please check

- **Landing page plan cards** still say "Up to 90 group practice minutes per day" and "2,700 group practice minutes per month". That's your landing page wording, so I didn't change it. If you'd like hours and minutes there too (for example "Up to 1 hr 30 min of group practice a day"), send me the exact lines.
- **My Learning empty state** uses your words exactly: "Access everything they've purchased…". If you meant "you've", tell me and I'll change that one word.

## Testing

- The frontend builds with no errors, and lint is clean on every changed file.
- Every page above was checked in the previews at all three sizes, using a local copy of the app with sample data. "See the evidence" was tested by tapping it.
