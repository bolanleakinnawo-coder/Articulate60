# Launch round 6: Learn page with paid books (2026-11-13)

Built on ARTICULATE 60 (launch round 5).zip. Frontend (Vercel) and backend (Render) both changed.

## What members see on Learn
- Tabs are now **All / Explore / My library**.
- **Launch special** card at the top: "A little something to celebrate! 20% off", with a live countdown (days, hours, minutes, seconds) to the end of the offer. The "Illustrative countdown" note is gone. When the timer reaches zero the card disappears and every price goes back to full price by itself.
- **The 7-Day Communication Reset** is smaller, with a "Featured for you" badge (was "Live") and an olive border so it still reads as the featured item. Its button is now **Notify me** with a bell.
- **Continue learning** (All tab, for members who bought books): each book with its real "x% completed" and a progress bar, and Continue reading / Start reading.
- **Books**: the featured book "You’re not bad at speaking. You just need this." first, then Word Playbook, Grammar Playbook and The Language Upgrade (both playbooks). Each shows the price now, the full price struck through and "20% off" (43% for the bundle). CTA "Buy access". Communication Audit with Azimah and Speak with Ease Bundle are removed, and so are the ₦X,XXX placeholders.
- **What Do I Say?** and **What Do I Do?** carry a "Coming soon" label and a Notify me bell.
- **My library**: every book they bought, how far they’ve read, and a button to read. Buying The Language Upgrade puts both playbooks in the library.

| Item | Full price | Launch price |
|---|---|---|
| You’re not bad at speaking | ₦12,000 / $12 | ₦9,600 / $9.60 |
| Word Playbook | ₦3,500 / $3.50 | ₦2,800 / $2.80 |
| Grammar Playbook | ₦3,500 / $3.50 | ₦2,800 / $2.80 |
| The Language Upgrade (both) | ₦7,000 / $7 | ₦4,000 / $4 |

## Buying (Paystack)
- Buy access opens a short sheet (price, "Continue to payment", "Secure payment by Paystack"), then Paystack’s checkout. No test-mode wording anywhere.
- The server sets the price: launch price before the deadline, full price after. The app can’t change it.
- A book goes into the library only after Paystack confirms the payment, the same way memberships work (amount, currency and mode are checked). The existing webhook (`/api/billing/paystack/webhook`) handles book payments too, so nothing new to set up in Paystack.
- Back from Paystack the member lands on My library with "… is in your library. Happy reading!" (or "Check again" if Paystack hasn’t confirmed yet).
- Prices are shown in ₦ and $ as on your price list. Paystack charges in naira unless USD is switched on (PAYSTACK_USD_ENABLED=true), and then the sheet lets them choose.

## Reading and progress
- Books open in an in-app reader (page by page, Previous / Next, swipe on phones, arrow keys on laptops). It reopens on the page they stopped at.
- Progress = furthest page reached ÷ total pages, saved to the server, so "6% completed" is real and follows them to any device.
- The PDF is streamed only to members who own the book. It is never a public link.
- **You need to upload each book’s PDF**: Admin > Learn & books > Books > Upload PDF (max 60 MB). Until a PDF is uploaded, owners see "Getting your book ready", and when you upload it they get a phone + in-app notification "Your book is ready".

## Notify me (bell)
- Tapping Notify me saves the request on their account and asks for phone notification permission straight from the tap (needed on iPhone). Tap again to turn it off.
- When something launches: Admin > Learn & books > Coming soon > **Announce launch**. Everyone who asked gets a phone notification (if allowed) and an in-app banner, once each.
- The admin page also shows book sales.

## The offer deadline
- Launch is 28 Nov 2026 and the offer runs 3 days: it ends **1 Dec 2026, 11:59 pm Lagos time**.
- To change it without touching code, set `LAUNCH_OFFER_ENDS_AT` on Render (e.g. `2026-12-01T23:59:59+01:00`) and restart. The countdown and the checkout both read this one value. The default is in `Articulate60-backend/utils/learn.js`.

## Env vars
- New, optional: `LAUNCH_OFFER_ENDS_AT` (only if you want a different deadline).
- Already needed and used here: `PAYSTACK_SECRET_KEY`, `APP_URL`, `R2_BUCKET_NAME` + R2 keys (book PDFs are stored in your R2 bucket under `private-books/`), `VAPID_*` for phone notifications, `ADMIN_API_KEY`.

## Files
Frontend: src/Pages/Learn.jsx (rewritten), src/Pages/BookReader.jsx (new), src/Pages/AdminLearnBooks.jsx (new), src/Pages/AdminProductNotifications.jsx, src/Pages/AdminOverview.jsx, src/Pages/Admin.css, src/Components/learn/BookCover.jsx (new), src/Components/learn/LearnNotice.jsx (new), src/Components/layout/AppLayout.jsx, src/Components/layout/AdminLayout.jsx, src/Routes/AppRoutes.jsx, src/data/learn.js (new), src/lib/learn.js (new), src/styles/Learn.css (new), src/styles/BookReader.css (new), public/push-sw.js, package.json + package-lock.json (adds pdfjs-dist).
Backend: ROUTES/learn.js (new), ROUTES/admin.js, ROUTES/billing.js, ROUTES/learnNotifications.js, services/billing.js, services/accountDeletion.js, MODELS/LibraryItem.js (new), MODELS/BookFile.js (new), MODELS/Payment.js, MODELS/LearnNotification.js, utils/learn.js (new), index.js.

Vercel runs `npm install`, which picks up the new pdfjs-dist package from package.json.
