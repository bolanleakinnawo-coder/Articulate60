// Transactional email (password reset, password changed, account deleted).
//
// Works with Resend (recommended) or Brevo, over their HTTPS APIs, so no
// extra npm package is needed. Set ONE of these on Render:
//
//   RESEND_API_KEY   re_...            https://resend.com/api-keys
//   BREVO_API_KEY    xkeysib-...       https://app.brevo.com/settings/keys/api
//
// and the sender (must be a domain/sender you verified with that provider):
//
//   EMAIL_FROM       Loquiex <no-reply@yourdomain.com>
//   EMAIL_REPLY_TO   (optional) support@yourdomain.com
//
// With neither key set, nothing is sent: outside production the email is
// printed to the server log instead, so the flow can be tested locally.

const TIMEOUT_MS = 15000;

function provider() {
  if ((process.env.RESEND_API_KEY || "").trim()) return "resend";
  if ((process.env.BREVO_API_KEY || "").trim()) return "brevo";
  return null;
}

function isConfigured() {
  return Boolean(provider() && parseFrom(process.env.EMAIL_FROM));
}

// "Loquiex <no-reply@x.com>" -> { name: "Loquiex", email: "no-reply@x.com" }
function parseFrom(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const match = raw.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1].trim() || "Loquiex", email: match[2].trim() };
  return { name: "Loquiex", email: raw };
}

async function postJson(url, headers, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Email provider error ${res.status}: ${text.slice(0, 300)}`);
  }
}

async function sendEmail({ to, subject, html, text }) {
  const which = provider();
  const from = parseFrom(process.env.EMAIL_FROM);
  const replyTo = (process.env.EMAIL_REPLY_TO || "").trim();

  if (!which || !from) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "Email not sent: set RESEND_API_KEY (or BREVO_API_KEY) and EMAIL_FROM.",
      );
    } else {
      console.log(`\n[email:dev] To: ${to}\n[email:dev] Subject: ${subject}\n${text}\n`);
    }
    return false;
  }

  if (which === "resend") {
    await postJson(
      "https://api.resend.com/emails",
      { Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}` },
      {
        from: `${from.name} <${from.email}>`,
        to: [to],
        subject,
        html,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      },
    );
  } else {
    await postJson(
      "https://api.brevo.com/v3/smtp/email",
      { "api-key": process.env.BREVO_API_KEY.trim(), accept: "application/json" },
      {
        sender: from,
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
        ...(replyTo ? { replyTo: { email: replyTo } } : {}),
      },
    );
  }
  return true;
}

// ---------- Templates (Loquiex colours: near-black, olive, off-white) ----------

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

function layout({ heading, paragraphs, button, footer }) {
  const body = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;color:#a9a392;font-size:15px;line-height:1.6">${p}</p>`,
    )
    .join("");
  const cta = button
    ? `<p style="margin:24px 0"><a href="${escapeHtml(button.url)}" style="display:inline-block;padding:14px 26px;border-radius:999px;background:#646742;color:#f1ecde;font-size:15px;font-weight:600;text-decoration:none">${escapeHtml(button.label)}</a></p>
       <p style="margin:0 0 16px;color:#6d6d6a;font-size:12px;line-height:1.5;word-break:break-all">Or paste this link into your browser:<br>${escapeHtml(button.url)}</p>`
    : "";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#0e0f11">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e0f11;padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#131513;border:1px solid #30302a;border-radius:20px">
<tr><td style="padding:32px 28px;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif">
<p style="margin:0 0 20px;color:#79774e;font-size:13px;font-weight:700;letter-spacing:.12em">LOQUIEX</p>
<h1 style="margin:0 0 16px;color:#f1ecde;font-size:24px;line-height:1.25">${escapeHtml(heading)}</h1>
${body}${cta}
<p style="margin:24px 0 0;color:#6d6d6a;font-size:12px;line-height:1.5">${footer}</p>
</td></tr></table></td></tr></table></body></html>`;
}

function passwordResetEmail({ name, url, minutes }) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  return {
    subject: "Reset your Loquiex password",
    html: layout({
      heading: "Reset your password",
      paragraphs: [
        greeting,
        `We got a request to reset the password for your Loquiex account. This link works once and expires in ${minutes} minutes.`,
      ],
      button: { label: "Choose a new password", url },
      footer:
        "If you didn't ask for this, you can ignore this email. Your password won't change.",
    }),
    text: `${name ? `Hi ${name},` : "Hi,"}\n\nReset your Loquiex password with this link (works once, expires in ${minutes} minutes):\n${url}\n\nIf you didn't ask for this, ignore this email. Your password won't change.`,
  };
}

function passwordChangedEmail({ name, appUrl }) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  const resetUrl = appUrl ? `${appUrl}/forgot-password` : "";
  return {
    subject: "Your Loquiex password was changed",
    html: layout({
      heading: "Your password was changed",
      paragraphs: [
        greeting,
        "The password for your Loquiex account was just changed, and every device was signed out.",
        resetUrl
          ? `If this wasn't you, <a href="${escapeHtml(resetUrl)}" style="color:#f1ecde">reset your password now</a> and reply to this email.`
          : "If this wasn't you, reset your password now and reply to this email.",
      ],
      footer: "This is a security notice about your account.",
    }),
    text: `${name ? `Hi ${name},` : "Hi,"}\n\nThe password for your Loquiex account was just changed, and every device was signed out.\nIf this wasn't you, reset it now${resetUrl ? `: ${resetUrl}` : ""} and reply to this email.`,
  };
}

function accountDeletedEmail({ name }) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  return {
    subject: "Your Loquiex account has been deleted",
    html: layout({
      heading: "Your account has been deleted",
      paragraphs: [
        greeting,
        "Your Loquiex account, recordings, feedback and wins have been deleted, as you asked. You're welcome back any time.",
      ],
      footer:
        "If you didn't do this, reply to this email straight away so we can help.",
    }),
    text: `${name ? `Hi ${name},` : "Hi,"}\n\nYour Loquiex account, recordings, feedback and wins have been deleted, as you asked.\nIf you didn't do this, reply to this email straight away.`,
  };
}

module.exports = {
  sendEmail,
  isConfigured,
  passwordResetEmail,
  passwordChangedEmail,
  accountDeletedEmail,
};
