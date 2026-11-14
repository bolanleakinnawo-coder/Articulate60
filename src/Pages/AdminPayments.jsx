import { useCallback, useEffect, useState } from "react";
import { CircleAlert, CreditCard, RefreshCw, Search } from "lucide-react";
import api from "../api/axios";
import "./Admin.css";

// Admin > Payments: every plan and book payment, possible duplicates to
// refund, and "check a payment" by its Paystack reference (gives a paid
// payment to the account that started it straight away).
const FILTERS = [
  { id: "all", label: "All" },
  { id: "duplicates", label: "Possible duplicates" },
  { id: "pending", label: "Waiting" },
  { id: "problems", label: "Problems" },
];

const STATUS_LABEL = {
  success: "Paid",
  pending: "Waiting",
  abandoned: "Not completed",
  failed: "Failed",
  flagged: "Problem",
};

function money(amount, currency) {
  if (currency === "USD") return `$${Number(Number(amount).toFixed(2))}`;
  return `₦${Number(amount).toLocaleString("en-NG")}`;
}

function when(date) {
  if (!date) return "";
  return new Date(date).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function PaymentRow({ p, onRefunded }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const markRefunded = async () => {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(
        `/api/admin/payments/${encodeURIComponent(p.reference)}/refunded`,
      );
      onRefunded(data.payment);
    } catch (err) {
      setError(err.response?.data?.message || "Could not update the payment.");
    } finally {
      setBusy(false);
    }
  };
  const duplicate = p.possibleDuplicate && !p.refundedAt;
  return (
    <article className={`admin-pay-row${duplicate ? " is-duplicate" : ""}`}>
      <div className="admin-pay-main">
        <strong>{p.item}</strong>
        <span>{p.user ? `@${p.user.username} · ${p.user.email}` : "Deleted account"}</span>
        <span className="admin-pay-ref">{p.reference}</span>
      </div>
      <div className="admin-pay-side">
        <strong>{money(p.amount, p.currency)}</strong>
        <span className={`admin-pay-status is-${p.refundedAt ? "refunded" : p.status}`}>
          {p.refundedAt ? "Refunded" : STATUS_LABEL[p.status] || p.status}
        </span>
        <span>{when(p.paidAt || p.createdAt)}</span>
      </div>
      {duplicate && (
        <div className="admin-pay-flag">
          <CircleAlert size={16} aria-hidden="true" />
          <p>
            Possible duplicate of <code>{p.duplicateOf}</code>. If the member paid
            twice by mistake, refund this reference in your Paystack dashboard
            (Transactions), then mark it as refunded here. That also takes back
            the extra plan time or book it gave.
          </p>
          <button type="button" onClick={markRefunded} disabled={busy}>
            {busy ? "Saving…" : "Mark as refunded"}
          </button>
        </div>
      )}
      {p.status === "flagged" && p.flagReason && (
        <p className="admin-pay-note">Not applied: {p.flagReason}</p>
      )}
      {error && <p className="admin-overview-error">{error}</p>}
    </article>
  );
}

export default function AdminPayments() {
  const [filter, setFilter] = useState("all");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reference, setReference] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  const load = useCallback(async (f) => {
    setLoading(true);
    setError("");
    try {
      const { data: d } = await api.get("/api/admin/payments", { params: { filter: f } });
      setData(d);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load payments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Loads from the server; state is set when the request finishes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(filter);
  }, [filter, load]);

  const check = async (event) => {
    event.preventDefault();
    const ref = reference.trim();
    if (!ref) return;
    setChecking(true);
    setCheckResult(null);
    try {
      const { data: d } = await api.post("/api/admin/payments/check", { reference: ref });
      setCheckResult({ payment: d.payment });
      load(filter);
    } catch (err) {
      setCheckResult({ error: err.response?.data?.message || "Could not check that payment." });
    } finally {
      setChecking(false);
    }
  };

  const replace = (payment) =>
    setData(
      (d) =>
        d && {
          ...d,
          payments: d.payments.map((p) => (p.reference === payment.reference ? payment : p)),
        },
    );

  const counts = data?.counts || {};

  return (
    <section className="admin-payments">
      <header className="admin-overview-header">
        <p className="admin-overview-eyebrow">Admin</p>
        <h1>Payments</h1>
        <p>
          Plans and books paid through Paystack. A paid payment is added to the
          account that started it automatically.
        </p>
      </header>

      <div className="admin-pay-stats">
        <div>
          <strong>{counts.paid ?? "–"}</strong>
          <span>Paid</span>
        </div>
        <div>
          <strong>{counts.pending ?? "–"}</strong>
          <span>Waiting</span>
        </div>
        <div className={counts.duplicates ? "is-alert" : ""}>
          <strong>{counts.duplicates ?? "–"}</strong>
          <span>Possible duplicates</span>
        </div>
        <div>
          <strong>{counts.problems ?? "–"}</strong>
          <span>Problems</span>
        </div>
      </div>

      <form className="admin-pay-check" onSubmit={check}>
        <label htmlFor="pay-ref">Check a payment</label>
        <p>
          Paste a reference from Paystack (it starts with LQX-). If it was paid,
          it is added to that member&apos;s account now.
        </p>
        <div>
          <input
            id="pay-ref"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="LQX-…"
            autoComplete="off"
          />
          <button type="submit" disabled={checking || !reference.trim()}>
            <Search size={16} aria-hidden="true" /> {checking ? "Checking…" : "Check"}
          </button>
        </div>
        {checkResult?.error && <p className="admin-overview-error">{checkResult.error}</p>}
        {checkResult?.payment && (
          <p className="admin-pay-check-result">
            {checkResult.payment.status === "success"
              ? `Paid and added to @${checkResult.payment.user?.username || "the member"} (${checkResult.payment.item}).`
              : `Paystack says: ${STATUS_LABEL[checkResult.payment.status] || checkResult.payment.status}. Nothing was added.`}
          </p>
        )}
      </form>

      <div className="admin-pay-filters" role="tablist" aria-label="Show">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={filter === f.id ? "active" : ""}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
        <button
          type="button"
          className="admin-pay-refresh"
          onClick={() => load(filter)}
          aria-label="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {error && (
        <p className="admin-overview-error" role="alert">
          {error}
        </p>
      )}
      {loading && !data ? (
        <p className="admin-subscriber-empty" role="status">
          Loading payments...
        </p>
      ) : data && data.payments.length === 0 ? (
        <p className="admin-subscriber-empty">
          <CreditCard size={16} aria-hidden="true" /> No payments here.
        </p>
      ) : (
        <div className="admin-pay-list">
          {data?.payments.map((p) => (
            <PaymentRow key={p.reference} p={p} onRefunded={replace} />
          ))}
        </div>
      )}
    </section>
  );
}
