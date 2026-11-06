# Paystack membership payments (TEST MODE)

Built on: ARTICULATE 60 (2).zip + feedback-redesign + revisions-round-2 +
profile-redesign + share-image + streak-notifications + group-calls.
Copy these files over your project, keeping the folder paths.

## How paying works now

1. On Manage Membership the member picks a plan and billing period and taps
   **Pay ₦… with Paystack**. The app only sends "which plan, which period".
2. The server works out the price itself (utils/plans.js), creates a unique
   payment reference, and asks Paystack for a checkout page.
3. The member pays on Paystack's own secure page (card, bank transfer, USSD).
   The app never sees card details.
4. Paystack sends the member back to Manage Membership, and also calls the
   server's webhook. Either way, the server asks Paystack's API directly
   whether the payment really succeeded, and checks the amount, currency (NGN)
   and test/live mode match what it asked for. Only then does the plan change.
5. The plan runs for the months paid for ("Active until …"). Paying again for
   the same plan adds the time on. A different plan starts that day and
   replaces the old one (the page says so before paying). Nothing renews or
   charges automatically.

## Paying in dollars (USD)

- Manage Membership shows **Pay in: Naira (₦) / Dollars ($)** once dollars
  are switched on (see setup step 2). Until then only naira shows.
- Dollar prices per month: **Bloom $4**. **Flourish $7 and Infinity $24 are
  placeholders** until the real prices are decided. The same 5/8/15% savings
  apply (e.g. Bloom 3 months = $11.40).
- To change any price, edit `PRICES` in `Articulate60-backend/utils/plans.js`
  (what members are charged) and the matching `PRICES` in `src/data/plans.js`.
  The Membership page uses the server's prices when it loads, so the server
  table is the one that counts.
- The server checks the currency Paystack reports matches the currency asked
  for, as well as the amount (in cents for USD), before giving the plan.

## Security

- **Plans change only after a verified payment.** The old testing route that
  let the app set its own plan (`POST /api/group/plan`) is removed, and the
  "plan saved on this device" demo is gone.
- **Prices are set on the server.** Anything the app sends as an amount is ignored.
- **Every payment is verified with Paystack's API** using the secret key,
  never trusted from the browser or the webhook body alone.
- **Webhook signature checked** (HMAC-SHA512 of the raw body, constant-time compare).
  Unsigned or altered calls get 401.
- **Idempotent.** Each reference is applied once. The webhook arriving twice,
  or at the same time as the member's return, never doubles the time.
- **Wrong amount / currency / mode = flagged**, plan not given.
- **Sign-in required** on every payment route, and a member can only check
  their own payments. Checkout and verify are rate limited.
- **Test mode is enforced.** Unless `PAYSTACK_LIVE=true`, the server only
  accepts an `sk_test_` key, so a live key can't charge real cards by mistake.
- **Plans saved without a payment no longer count.** Any account that got a
  paid plan from the old testing switch is treated as Free until it pays.
- **Admin panel locked.** `/api/admin/*` (subscriber + waitlist emails) and
  the win approve/reject routes had no protection: anyone could read the email
  lists or approve wins. They now need an admin key. The admin panel asks for
  it once per browser tab; approving and rejecting wins works exactly as before.
- **Login rate limited**: 10 failed tries per 15 minutes per IP + account.

## Changed files

Backend (Articulate60-backend/)
- index.js: Paystack webhook (raw body, before express.json), `/api/billing`, trust proxy
- MODELS/Payment.js (new): one row per checkout
- MODELS/User.js: planExpiresAt, planStartedAt, planPeriodId, appliedPaymentRefs
- ROUTES/billing.js (new): checkout, verify, me, webhook
- services/paystack.js (new): Paystack API + signature check
- services/billing.js (new): the only code that gives a paid plan
- middleware/adminAuth.js (new): admin key check
- ROUTES/admin.js, ROUTES/testimonials.js: admin routes need the admin key
- ROUTES/group.js: removed the testing plan switch
- ROUTES/practice.js: AI feedback checks the paid plan is still active
- ROUTES/user.js: login/sign-up/profile return the real plan; login rate limit
- utils/plans.js: server prices, billing periods, plan expiry
- utils/groupUsage.js, services/groupRooms.js: read the plan expiry

Frontend
- src/Pages/Membership.jsx: Paystack checkout, "Confirming your payment", success / failed / still waiting screens, Active until, last payment
- src/data/plans.js: plan comes from the server only; startCheckout / verifyPayment
- src/Pages/Profile.css: payment error, secure note, spinner (Home colours and type scale)
- src/api/axios.js: sends the admin key on admin requests
- src/Components/layout/AdminLayout.jsx/.css: admin key screen, "Lock admin"
- src/Pages/GroupPractice.jsx, src/Pages/Practice.jsx: load the plan from the server

No new npm packages.

## Setup (test mode)

1. **Paystack dashboard** → Settings → API Keys & Webhooks, with the toggle on
   **Test Mode**. Copy the **Test Secret Key** (starts `sk_test_`).
   The public key isn't needed: the app uses Paystack's hosted checkout page.
2. **Render → backend service → Environment**, add:
   - `PAYSTACK_SECRET_KEY` = your `sk_test_...` key
   - `APP_URL` = your app's address on Vercel, e.g. `https://your-app.vercel.app`
     (no slash at the end). Paystack sends members back to `APP_URL/app/membership`.
   - `ADMIN_API_KEY` = a long random string (at least 24 characters; e.g. run
     `openssl rand -hex 32`). You'll type this into the admin panel.
   - `PAYSTACK_USD_ENABLED` = `true`, but ONLY after Paystack has enabled
     USD on your account (Paystack dashboard → Settings → Preferences →
     currencies, or ask Paystack support; it needs approval). Without it,
     dollar checkouts would fail at Paystack, so the app hides the option.
   - Do NOT set `PAYSTACK_LIVE` while testing. You can delete `PAYMENTS_LIVE`; it's no longer used.
3. **Paystack dashboard → Test Webhook URL**:
   `https://articulate60.onrender.com/api/billing/paystack/webhook`
   (use your real Render address if different). Leave Test Callback URL empty.
4. **Redeploy** the backend on Render, then the frontend on Vercel. Nothing
   changes in Vercel's environment.
5. **Try it**: Manage Membership → choose a plan → Pay with Paystack → on the
   Paystack page use the test card `4084 0840 8408 4081`, any future expiry,
   CVV `408`, PIN `0000`, OTP `123456`. You should land on "Welcome to …".
   Paystack's "Failed" test cards should show "Your payment didn't go through".

Never put the secret key in the frontend, in Vercel, or in a chat or file.

## Going live later

Switch the Paystack dashboard to Live, set `PAYSTACK_SECRET_KEY` to the
`sk_live_` key, set `PAYSTACK_LIVE=true`, and set the **Live** Webhook URL to
the same address. Payments made in test mode don't carry over.

## Not changed, worth fixing next

- **AI feedback limits** (Bloom 150/month and 5/day, Flourish 360/12) are
  only counted in the app. The server checks the member has a paid plan and
  allows 20 analyses an hour, but doesn't enforce the monthly/daily numbers.
- **Sign-up, waitlist and "notify me" forms** have no rate limit, so a bot could fill them with junk.
- **The project zip "ARTICULATE 60 (2).zip" contains the backend .env file.**
  If that zip has been shared with anyone, rotate the keys in it (JWT secret, database, R2, Gemini, Deepgram).
- No automatic renewal. Paystack can auto-charge saved cards; that can be
  added once test payments look right.
