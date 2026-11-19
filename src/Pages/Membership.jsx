import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CircleArrowUp,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  LoaderCircle,
  LayoutList,
  LockKeyhole,
  ReceiptText,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  BILLING_PERIODS,
  CURRENCIES,
  PAID_PLANS,
  PLANS,
  TEAM_PLANS,
  formatMoney,
  getPlan,
  getStoredUser,
  cancelPlan,
  getSubscription,
  groupPracticePlanNames,
  pendingPaymentReference,
  mergePrices,
  priceFor,
  refreshPlanFromServer,
  resumePlan,
  startCheckout,
  syncPendingPayments,
  verifyPayment,
} from "../data/plans";
import { preloadPaystack } from "../lib/paystackPopup";
import MembershipCard from "../Components/MembershipCard";
import SubscriptionPicker from "../Components/membership/SubscriptionPicker";
import { getMyTeam } from "../lib/team";
import "./Profile.css";

const REASONS = {
  feedback: "Unlock AI feedback and see exactly how you communicated.",
  unlimited: "Unlimited seats in group practice come with Loquiex Infinity.",
  group: () =>
    `Group practice comes with Loquiex ${groupPracticePlanNames().join(" and Loquiex ")}.`,
};

// Manage Membership, opened from Profile, "Unlock my AI feedback" and group
// practice. Plans, prices and allowances come from data/plans.js.
// Paying opens Paystack's secure pop-up inside the app. When it finishes, the
// server confirms the payment with Paystack before the plan changes (the app
// never sets the plan itself). Payments that were left unconfirmed (pop-up
// closed, signal lost) are checked again every time this page and the app open.
export default function Membership() {
  const navigate = useNavigate();
  const location = useLocation();
  const reason = location.state?.reason;
  const fromProfile = location.state?.from === "profile";
  const user = getStoredUser();

  const [, setVersion] = useState(0); // bump to re-read the saved plan
  const plan = getPlan(user);
  const sub = getSubscription(user);
  const currentPeriod = BILLING_PERIODS.find(
    (p) => p.id === (sub?.periodId || "monthly"),
  );
  const [selectedId, setSelectedId] = useState(
    reason === "unlimited"
      ? "infinity"
      : reason === "group" && plan.limits.groupMinutesPerMonth === 0
        ? "flourish" // came from Group practice: preselect a plan that has it
        : plan.id === "free"
          ? "bloom"
          : plan.id,
  );
  const [periodId, setPeriodId] = useState(sub?.periodId || "monthly");
  const [detailsOpen, setDetailsOpen] = useState(false);
  // { kind: "checking" | "joined" | "failed" | "pending", plan, payment, reference }
  // Paystack sends the member back with ?reference=... (and ?trxref=...).
  const [returnRef] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get("reference") || params.get("trxref") || null;
  });
  const [done, setDone] = useState(() =>
    returnRef ? { kind: "checking", reference: returnRef } : null,
  );
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [billing, setBilling] = useState(null); // GET /api/billing/me
  const [currency, setCurrency] = useState("NGN");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState("");
  // Round 10: "Choose your subscription" -> Individual Plans / Team Plans.
  const [view, setView] = useState(
    reason === "team"
      ? "team"
      : reason === "group" || reason === "unlimited" || reason === "feedback"
        ? "individual"
        : "choose",
  );
  const [team, setTeam] = useState(null); // GET /api/team/me
  const [teamName, setTeamName] = useState("");
  const compareRef = useRef(null);
  const billingRef = useRef(null);
  const totalRef = useRef(null);

  const ALL_PLANS = [...PAID_PLANS, ...TEAM_PLANS];
  const selected = ALL_PLANS.find((p) => p.id === selectedId) || PAID_PLANS[0];
  const selectedIsTeam = TEAM_PLANS.some((p) => p.id === selected.id);
  const teamAdmin = team?.role === "admin";
  const teamPlanId = teamAdmin ? team.planId : null;
  const isPaid = plan.id !== "free";
  const cancelled = isPaid && sub?.source !== "team" && Boolean(sub?.cancelledAt);
  const shortName = plan.name.replace(/^Loquiex\s+/, "");
  // The next plan up, for "Upgrade" (none on the top plan).
  const upgradeTo = PAID_PLANS[PAID_PLANS.findIndex((p) => p.id === plan.id) + 1];
  const selectedPeriod = BILLING_PERIODS.find((p) => p.id === periodId);
  const renewing = selectedIsTeam
    ? Boolean(teamAdmin && team.active && selected.id === team.planId)
    : isPaid && sub?.source !== "team" && selected.id === plan.id;
  const fromTeam = sub?.source === "team";
  const lastPayment = billing?.payments?.find((p) => p.status === "success");
  // Currencies the server accepts right now, and its prices.
  const currencies = CURRENCIES.filter((c) =>
    (billing?.currencies || ["NGN"]).includes(c.id),
  );
  const payCurrency = currencies.some((c) => c.id === currency) ? currency : "NGN";
  const prices = mergePrices(billing?.prices);
  const money = (amount) => formatMoney(amount, payCurrency);
  const total = (p, period) => priceFor(p, period, payCurrency, prices);
  const reasonText =
    typeof REASONS[reason] === "function" ? REASONS[reason]() : REASONS[reason];

  const scrollTo = (ref) =>
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const doCancel = async () => {
    setCancelBusy(true);
    setCancelError("");
    try {
      await cancelPlan();
      setConfirmCancel(false);
      setVersion((v) => v + 1);
    } catch (err) {
      setCancelError(
        err.response?.data?.message ||
          "Couldn't cancel your plan. Check your connection and try again.",
      );
    } finally {
      setCancelBusy(false);
    }
  };

  const undoCancel = async () => {
    setCancelBusy(true);
    setCancelError("");
    try {
      await resumePlan();
      setVersion((v) => v + 1);
    } catch (err) {
      setCancelError(
        err.response?.data?.message || "Couldn't update your plan. Please try again.",
      );
    } finally {
      setCancelBusy(false);
    }
  };

  const back = () => (fromProfile ? navigate("/app/profile") : navigate(-1));

  // Plan and payments from the server. Any payment that went through but
  // wasn't confirmed yet is applied first.
  useEffect(() => {
    let alive = true;
    preloadPaystack();
    const load = () =>
      refreshPlanFromServer().then((data) => {
        if (!alive || !data) return;
        setBilling(data);
        setVersion((v) => v + 1);
      });
    load();
    getMyTeam()
      .then((t) => {
        if (!alive) return;
        setTeam(t);
        if (t?.role === "admin" && t.name) setTeamName(t.name);
      })
      .catch(() => {});
    syncPendingPayments().then((applied) => {
      if (alive && applied.length) load();
    });
    return () => {
      alive = false;
    };
  }, []);

  // Back from Paystack (?reference=...), or a payment left unconfirmed.
  const check = async (reference, { quiet = false, showChecking = true } = {}) => {
    if (!quiet && showChecking) setDone({ kind: "checking", reference });
    try {
      const data = await verifyPayment(reference);
      const status = data.payment.status;
      const paidPlan = [...PLANS, ...TEAM_PLANS].find((p) => p.id === data.payment.planId);
      if (TEAM_PLANS.some((p) => p.id === data.payment.planId)) {
        getMyTeam().then(setTeam).catch(() => {});
      }
      setVersion((v) => v + 1);
      refreshPlanFromServer().then((d) => d && setBilling(d));
      if (status === "success" && paidPlan?.base) {
        // Team plan paid: "Your team is ready!" on My Team.
        navigate("/app/team?ready=1", { replace: true });
        return;
      }
      if (status === "success") {
        setDone({ kind: "joined", plan: paidPlan, payment: data.payment, reference });
      } else if (status === "pending") {
        if (!quiet) setDone({ kind: "pending", reference });
      } else if (!quiet) {
        setDone({ kind: "failed", reference });
      } else {
        setDone(null);
      }
    } catch {
      if (!quiet) setDone({ kind: "pending", reference });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (returnRef) {
        navigate(location.pathname, { replace: true, state: location.state });
        check(returnRef, { showChecking: false });
        return;
      }
      const pending = pendingPaymentReference();
      if (pending) check(pending, { quiet: true });
    }, 0);
    return () => clearTimeout(timer);
    // Runs once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Team plans are paid monthly from "Create your team" (round 10).
  const teamCheckout = async () => {
    if (!teamName.trim() && !team?.name) {
      setPayError("Give your team a name.");
      return;
    }
    setPayError("");
    setPaying(true);
    try {
      const result = await startCheckout(selected.id, "monthly", "NGN", {
        teamName: teamName.trim() || team?.name || "",
      });
      setPaying(false);
      check(result.reference, { quiet: result.status !== "success" });
    } catch (err) {
      setPaying(false);
      setPayError(
        err.response?.data?.message ||
          "Couldn't open the payment. Check your connection and try again.",
      );
    }
  };

  const checkout = async () => {
    setPayError("");
    setPaying(true);
    try {
      const result = await startCheckout(selected.id, periodId, payCurrency);
      setPaying(false);
      if (result.status === "success") {
        check(result.reference);
      } else {
        // Closed the pop-up. A bank transfer can still come through after,
        // so check quietly; the plan updates on its own if it does.
        check(result.reference, { quiet: true });
      }
    } catch (err) {
      setPaying(false);
      setPayError(
        err.response?.data?.message ||
          "Couldn't open the payment. Check your connection and try again.",
      );
    }
  };

  if (done) {
    const groupNext =
      reason === "group" &&
      done.kind === "joined" &&
      done.plan?.limits &&
      done.plan.limits.groupMinutesPerMonth !== 0;
    const checking = done.kind === "checking";
    const Icon =
      done.kind === "joined" ? Sparkles : done.kind === "failed" ? CircleAlert : LoaderCircle;
    const expires = done.payment?.planExpiresAt || getSubscription()?.expiresAt;
    const title = {
      checking: "Confirming your payment",
      joined: `Welcome to ${done.plan?.name || "your new plan"}`,
      failed: "Your payment didn't go through",
      pending: "We're still waiting for Paystack",
    }[done.kind];
    const text = {
      checking: "This takes a few seconds. Please keep this page open.",
      joined: `${
        done.payment
          ? `You paid ${formatMoney(done.payment.amount, done.payment.currency)}. `
          : ""
      }Your plan is active${expires ? ` until ${formatDate(expires)}` : ""}.`,
      failed:
        "Nothing was charged and your plan hasn't changed. You can try again with another card or bank.",
      pending:
        "Your bank hasn't confirmed the payment yet. Your plan updates on its own as soon as it does, so you can leave this page.",
    }[done.kind];
    return (
      <div className="profile-content pf-membership-page">
        <section className="pf-panel pf-done" aria-live="polite">
          <span
            className={`pf-row-icon pf-win-hero-icon ${checking ? "pf-spin" : ""}`}
          >
            <Icon size={24} />
          </span>
          <h1>{title}</h1>
          <p className="pf-panel-text">{text}</p>
          {done.kind === "joined" && done.plan?.base && (
            <button
              className="profile-save-button pf-wide-button"
              onClick={() => {
                setDone(null);
                navigate("/app/team?invite=1");
              }}
            >
              Invite your team
            </button>
          )}
          {done.kind === "joined" && !done.plan?.base && (
            <button
              className="profile-save-button pf-wide-button"
              onClick={() =>
                navigate(groupNext ? "/app/group-practice/room" : "/app/practice")
              }
            >
              {groupNext ? "Go to group practice" : "Back to practice"}
            </button>
          )}
          {done.kind === "pending" && (
            <button
              className="profile-save-button pf-wide-button"
              onClick={() => check(done.reference)}
            >
              Check again
            </button>
          )}
          {!checking && (
            <button className="pf-outline-button" onClick={() => setDone(null)}>
              Back to Manage Membership
            </button>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="profile-content pf-membership-page">
      <button className="pf-back pf-back-link" onClick={back}>
        <ArrowLeft size={18} /> {fromProfile ? "Your Profile" : "Back"}
      </button>

      <header className="pf-page-header">
        <h1>Manage Membership</h1>
        <p>Your plan, billing and renewal.</p>
      </header>

      {reasonText && <p className="pf-reason">{reasonText}</p>}

      {/* Current plan */}
      <MembershipCard
        user={user}
        currency={lastPayment?.currency || "NGN"}
        prices={prices}
      />

      {cancelled && (
        <p className="pf-cancelled-note">
          You cancelled your plan. You keep everything in {shortName} until{" "}
          {sub?.expiresAt ? formatDate(sub.expiresAt) : "it ends"}, then you
          move to Loquiex Free.{" "}
          <button
            type="button"
            className="pf-inline-link"
            disabled={cancelBusy}
            onClick={undoCancel}
          >
            Keep my plan
          </button>
        </p>
      )}

      {/* Plan options (round 8 follow-up): one compact row. Cancel plan
          stays on its own at the very end of the page. */}
      <div className="pf-plan-actions pf-plan-actions-compact">
        {isPaid && !fromTeam && (
          <button
            type="button"
            className="pf-plan-action is-primary"
            onClick={() => {
              setView("individual");
              setSelectedId(plan.id);
              setPeriodId(sub?.periodId || "monthly");
              scrollTo(billingRef);
            }}
          >
            <RefreshCw size={14} aria-hidden="true" />
            Renew
          </button>
        )}
        {upgradeTo && (
          <button
            type="button"
            className={`pf-plan-action ${isPaid ? "is-secondary" : "is-primary"}`}
            onClick={() => {
              setView("individual");
              setSelectedId(upgradeTo.id);
              scrollTo(compareRef);
            }}
          >
            <CircleArrowUp size={14} aria-hidden="true" />
            {isPaid ? "Upgrade" : "Upgrade your plan"}
          </button>
        )}
        <button
          type="button"
          className="pf-plan-action is-secondary"
          onClick={() => {
            setView("choose");
            scrollTo(compareRef);
          }}
        >
          <LayoutList size={14} aria-hidden="true" />
          Compare plans
        </button>
      </div>

      {/* Round 10: Choose your subscription -> Individual / Team plans. */}
      <div ref={compareRef} className="pf-scroll-target">
        <SubscriptionPicker
          view={view}
          onView={(v) => {
            setView(v);
            requestAnimationFrame(() => scrollTo(compareRef));
          }}
          prices={prices}
          currentPlanId={
            view === "team" ? teamPlanId : fromTeam ? null : plan.id
          }
          selectedId={selectedId}
          onChoose={(id) => {
            setSelectedId(id);
            setPayError("");
            if (TEAM_PLANS.some((p) => p.id === id)) {
              setView("create");
              requestAnimationFrame(() => scrollTo(compareRef));
            } else {
              scrollTo(billingRef);
            }
          }}
          teamName={teamName || ""}
          onTeamName={setTeamName}
          onPay={teamCheckout}
          paying={paying}
          payError={view === "create" ? payError : ""}
        />
      </div>

      {/* Billing preferences (individual plans; team plans pay from
          "Create your team"). */}
      <section
        ref={billingRef}
        className="pf-panel pf-scroll-target"
        hidden={selectedIsTeam}
      >
        <p className="pf-panel-title">Billing preferences</p>
        <p className="pf-panel-text">
          Choose how often you want to pay and save on longer membership
          periods.
        </p>
        {currencies.length > 1 && (
          <>
            <p className="pf-panel-title pf-currency-title pf-currency-first">Pay in</p>
            <div
              className="pf-periods pf-currencies"
              role="radiogroup"
              aria-label="Currency"
            >
              {currencies.map((c) => (
                <button
                  key={c.id}
                  role="radio"
                  aria-checked={payCurrency === c.id}
                  className={`pf-period ${payCurrency === c.id ? "is-active" : ""}`}
                  onClick={() => setCurrency(c.id)}
                >
                  <span className="pf-radio" aria-hidden="true">
                    {payCurrency === c.id && <CircleCheck size={22} />}
                  </span>
                  <span className="pf-period-label">{c.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
        <p className="pf-panel-title pf-currency-title">
          Billing period{" "}
          <span className="pf-period-for">· prices for {selected.name}</span>
        </p>
        <div className="pf-periods" role="radiogroup" aria-label="Billing period">
          {BILLING_PERIODS.map((period) => (
            <button
              key={period.id}
              role="radio"
              aria-checked={periodId === period.id}
              className={`pf-period ${periodId === period.id ? "is-active" : ""}`}
              onClick={() => {
                setPeriodId(period.id);
                // Keep the total and Pay button in view once a period is picked.
                requestAnimationFrame(() =>
                  totalRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                  }),
                );
              }}
            >
              <span className="pf-radio" aria-hidden="true">
                {periodId === period.id && <CircleCheck size={22} />}
              </span>
              <span className="pf-period-text">
                <span className="pf-period-label">{period.label}</span>
                <span className="pf-period-save">
                  {period.discount ? `Save ${period.discount}%` : "No discount"}
                </span>
              </span>
              {/* Round 8: the price is on every option, so nobody has to
                  scroll to see it. */}
              <span className="pf-period-price">
                <strong>{money(total(selected, period.id))}</strong>
                {period.months > 1 && (
                  <span>
                    {money(total(selected, period.id) / period.months)} / month
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
        <p className="pf-total">
          {selected.name} ·{" "}
          {BILLING_PERIODS.find((p) => p.id === periodId).label}:{" "}
          <strong>{money(total(selected, periodId))}</strong>
        </p>
        <p className="pf-stats-note pf-total-note">
          {selectedIsTeam
            ? renewing
              ? `Adds ${selectedPeriod.months === 1 ? "1 month" : `${selectedPeriod.months} months`} to your team plan.`
              : teamAdmin
                ? `${selected.name} starts today for everyone in your team.`
                : "You become the Team Admin and can invite up to four other members as soon as the payment is confirmed."
            : renewing
            ? `Adds ${selectedPeriod.months === 1 ? "1 month" : `${selectedPeriod.months} months`} to your current plan.`
            : isPaid && !fromTeam
              ? `${selected.name} starts today and replaces ${plan.name}. Time left on ${plan.name} isn't carried over.`
              : "Your plan starts as soon as the payment is confirmed."}{" "}
          No automatic renewal: you choose when to pay again.
        </p>
        {payError && (
          <p className="pf-pay-error" role="alert">
            <CircleAlert size={18} />
            <span>{payError}</span>
          </p>
        )}
        <button
          ref={totalRef}
          className="profile-save-button pf-wide-button"
          disabled={paying}
          onClick={checkout}
        >
          {paying
            ? "Opening Paystack…"
            : `${renewing ? "Renew" : "Pay"} ${money(total(selected, periodId))} with Paystack`}
        </button>
        <p className="pf-secure-note">
          <LockKeyhole size={16} />
          <span>
            Card, bank transfer and USSD on Paystack&apos;s secure page. We never
            see your card details.
          </span>
        </p>
      </section>

      {/* Subscription details */}
      <section className={`pf-panel pf-how ${detailsOpen ? "is-open" : ""}`}>
        <button
          className="pf-how-toggle pf-details-toggle"
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen((open) => !open)}
        >
          <span className="pf-row-icon">
            <ReceiptText size={18} />
          </span>
          <span className="pf-row-text">
            <strong>Subscription details</strong>
            <span>Billing, renewal and plan management</span>
          </span>
          <ChevronDown size={18} className="pf-row-chev" />
        </button>
        {detailsOpen && (
          <dl className="pf-details">
            <div>
              <dt>Plan</dt>
              <dd>{plan.name}</dd>
            </div>
            <div>
              <dt>Billing</dt>
              <dd>{fromTeam ? "Team plan" : isPaid ? currentPeriod.label : "No billing"}</dd>
            </div>
            <div>
              <dt>Price</dt>
              <dd>
                {fromTeam
                  ? "Included in your team plan"
                  : isPaid
                  ? `${money(total(plan, currentPeriod.id))} every ${
                      currentPeriod.months === 1
                        ? "month"
                        : `${currentPeriod.months} months`
                    }`
                  : "Free"}
              </dd>
            </div>
            {isPaid && (
              <div>
                <dt>Started</dt>
                <dd>{sub?.startedAt ? formatDate(sub.startedAt) : "Not recorded yet"}</dd>
              </div>
            )}
            {isPaid && (
              <div>
                <dt>Active until</dt>
                <dd>{sub?.expiresAt ? formatDate(sub.expiresAt) : "Loading…"}</dd>
              </div>
            )}
            {isPaid && (
              <div>
                <dt>Renewal</dt>
                <dd>
                  {fromTeam
                    ? teamAdmin
                      ? "Doesn't renew automatically. Renew your team plan any time before it ends."
                      : "Your Team Admin renews the team plan."
                    : cancelled
                    ? `Cancelled. Ends on ${sub?.expiresAt ? formatDate(sub.expiresAt) : "its end date"}`
                    : "Doesn't renew automatically. Renew any time before it ends."}
                </dd>
              </div>
            )}
            {lastPayment && (
              <div>
                <dt>Last payment</dt>
                <dd>
                  {formatMoney(lastPayment.amount, lastPayment.currency)} on{" "}
                  {formatDate(lastPayment.paidAt || lastPayment.createdAt)}
                </dd>
              </div>
            )}
            <div>
              <dt>Payment method</dt>
              <dd>Paystack</dd>
            </div>
          </dl>
        )}
      </section>

      {/* Cancel plan: alone at the very end of the page, in red. */}
      {isPaid && !cancelled && !fromTeam && (
        <section className="pf-panel pf-cancel-panel">
          <p className="pf-panel-title">Cancel plan</p>
          <p className="pf-panel-text">
            You keep everything you paid for until{" "}
            {sub?.expiresAt ? formatDate(sub.expiresAt) : "your plan ends"}.
            Nothing more is charged.
          </p>
          <button
            type="button"
            className="pf-cancel-button pf-cancel-red"
            onClick={() => {
              setCancelError("");
              setConfirmCancel(true);
            }}
          >
            Cancel plan
          </button>
        </section>
      )}
      {cancelError && !confirmCancel && (
        <p className="pf-pay-error" role="alert">
          <CircleAlert size={18} />
          <span>{cancelError}</span>
        </p>
      )}

      {confirmCancel && (
        <div
          className="pf-dialog-backdrop"
          onClick={() => !cancelBusy && setConfirmCancel(false)}
        >
          <div
            className="pf-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="pf-cancel-title"
            aria-describedby="pf-cancel-text"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="pf-cancel-title">Are you sure you want to cancel your plan?</h2>
            <p id="pf-cancel-text">
              Cancelling won&apos;t take anything away now. You&apos;ve paid for{" "}
              {shortName}, so you keep all of it until{" "}
              <strong>
                {sub?.expiresAt ? formatDate(sub.expiresAt) : "your plan ends"}
              </strong>
              . After that you move to Loquiex Free and nothing more is charged.
            </p>
            {cancelError && (
              <p className="pf-pay-error" role="alert">
                <CircleAlert size={18} />
                <span>{cancelError}</span>
              </p>
            )}
            <div className="pf-dialog-actions">
              <button
                type="button"
                className="pf-outline-button"
                disabled={cancelBusy}
                onClick={() => setConfirmCancel(false)}
              >
                Keep my plan
              </button>
              <button
                type="button"
                className="pf-cancel-button pf-cancel-red"
                disabled={cancelBusy}
                onClick={doCancel}
              >
                {cancelBusy ? "Cancelling…" : "Yes, cancel plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
