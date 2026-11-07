# Delete account + Forgot password (2026-11-07)

## New npm packages
None. Email is sent with Node's built-in `fetch` to Resend (or Brevo).

## Render (backend) environment variables to add
| Name | Value |
|---|---|
| `RESEND_API_KEY` | Your Resend API key (`re_...`), from resend.com > API Keys |
| `EMAIL_FROM` | `Loquiex <no-reply@YOUR-DOMAIN>` (a domain you verified in Resend) |
| `EMAIL_REPLY_TO` | Optional, e.g. `support@YOUR-DOMAIN` |
| `APP_URL` | Already used by Paystack. Must be your Vercel site, e.g. `https://loquiex.vercel.app` (no trailing slash). Reset links point here. |
| `NODE_ENV` | `production` |

Using Brevo instead? Set `BREVO_API_KEY` (and `EMAIL_FROM` with a sender you verified in Brevo) instead of `RESEND_API_KEY`.
No Vercel changes are needed.

## Forgot password
- Log in > "Forgot password?" > enter email or username > email with a link to `/reset-password`.
- The link token is 32 random bytes; only its SHA-256 hash is stored (`passwordresets` collection, auto-deleted by MongoDB after expiry).
- Expires in 30 minutes, works once, and only the newest link works.
- Same reply whether or not the account exists, and the lookup/email happens after the reply, so it can't be used to find out who has an account.
- Rate limits: 5 requests per 15 min per IP, 3 per hour per email/username; 20 reset attempts per 15 min per IP.
- After a reset every device is signed out (new `tokenVersion` on the user) and a "your password was changed" email is sent.
- Changing the password in Profile > Personal information now also signs out other devices (this device gets a new token).

## Delete account
- Profile > Delete account (below Log out). Shows what will be lost with the member's real numbers, and the days left on a paid plan.
- Needs the current password and typing DELETE. 5 attempts per 15 min.
- Deletes: user, recordings + audio files in R2, AI feedback, wins/testimonials, reset links, push subscriptions, profile photo, waitlist/"notify me" rows with the same email. Signs out every open tab and removes them from group calls. Sends a confirmation email.
- Keeps Payment rows (no name/email in them) for accounting. Plans are prepaid with no auto-renew, so nothing to cancel in Paystack. A checkout that was pending is marked abandoned; if it's paid anyway after deletion, it's marked "flagged" with "refund" so you can refund it in Paystack.

## Files
Backend: `MODELS/PasswordReset.js` (new), `MODELS/User.js`, `utils/authToken.js` (new), `middleware/auth.js`, `services/email.js` (new), `services/accountDeletion.js` (new), `services/realtime.js`, `services/billing.js`, `ROUTES/user.js`.
Frontend: `src/Pages/ForgotPassword.jsx` (new), `src/Pages/ResetPassword.jsx` (new), `src/Pages/Login.jsx`, `src/Pages/Profile.jsx`, `src/Pages/Profile.css`, `src/styles/globals.css`, `src/Routes/AppRoutes.jsx`, `src/api/axios.js`.

Note: existing sign-ins keep working after deploy (old tokens count as version 0).

## Also in this zip: free-member "You did it!" ending
- Members without a paid plan (trial ended) always finish on "You did it!": recording player, "Your next step", the three feedback teasers, then Unlock my AI feedback (to Manage Membership), Share my practice (the "time spent speaking" image), and Back to practice.
- If AI feedback fails and they tap "Skip for now", members without a paid plan also go to "You did it!" (not "Amazing!").
- Files: src/Pages/PracticeSession.jsx, src/Components/practice/FeedbackReport.css. The "Remember, username" card is unchanged.
