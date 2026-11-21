// Round 14 (Sheriff): the admin dashboard sections. Every number comes from
// the live database (GET /api/admin/dashboard); nothing here is a sample.
import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import api from "../api/axios";
import "./Admin.css";
import "./AdminRound14.css";

function formatMoneyList(list) {
  if (!list || list.length === 0) return "₦0";
  return list
    .map((r) =>
      r.currency === "USD"
        ? `$${Number(r.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : `₦${Number(r.amount).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`,
    )
    .join(" + ");
}

const countOf = (list) => (list || []).reduce((t, r) => t + (r.count || 0), 0);

function thisMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

// Shared loader with the month picker.
function useDashboard() {
  const [month, setMonth] = useState(thisMonthKey);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    api
      .get("/api/admin/dashboard", { params: { month } })
      .then((r) => {
        if (!alive) return;
        setError("");
        setData(r.data);
      })
      .catch(
        (e) => alive && setError(e.response?.data?.message || "Could not load the dashboard."),
      );
    return () => {
      alive = false;
    };
  }, [month]);
  return { month, setMonth, data: data?.month === month ? data : data && { ...data, stale: true }, error };
}

function MonthPicker({ month, onChange }) {
  return (
    <label className="adm-month">
      <CalendarDays size={15} aria-hidden="true" />
      <span className="adm-sr">Month</span>
      <input
        type="month"
        value={month}
        max={thisMonthKey()}
        onChange={(e) => e.target.value && onChange(e.target.value)}
      />
    </label>
  );
}

function Stat({ label, value, note }) {
  return (
    <div className="adm-stat">
      <span className="adm-stat-label">{label}</span>
      <strong className="adm-stat-value">{value}</strong>
      {note && <span className="adm-stat-note">{note}</span>}
    </div>
  );
}

function List({ title, rows, empty }) {
  return (
    <div className="adm-list">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="adm-empty">{empty}</p>
      ) : (
        <ul>
          {rows.map((r) => (
            <li key={r.name}>
              <span>{r.name}</span>
              <strong>{r.value}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Shell({ eyebrow = "Admin dashboard", title, sub, month, setMonth, error, data, children }) {
  return (
    <section className="adm-section">
      <header className={`adm-head${title ? "" : " is-bare"}`}>
        {title ? (
          <div>
            <p className="admin-overview-eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            {sub && <p className="adm-sub">{sub}</p>}
          </div>
        ) : (
          <h2 className="adm-card-title">Members and revenue</h2>
        )}
        {setMonth && <MonthPicker month={month} onChange={setMonth} />}
      </header>
      {error ? (
        <p className="admin-overview-error" role="alert">
          {error}
        </p>
      ) : !data ? (
        <p className="adm-empty" role="status">
          Loading…
        </p>
      ) : (
        <div className={data.stale ? "adm-stale" : ""}>{children}</div>
      )}
    </section>
  );
}

// Shown on the existing Overview page, under its header.
export function OverviewStats() {
  const { month, setMonth, data, error } = useDashboard();
  const o = data?.overview;
  return (
    <Shell
      title=""
      month={month}
      setMonth={setMonth}
      error={error}
      data={data}
    >
      {o && (
        <div className="adm-grid">
          <Stat label="Total members" value={o.totalMembers} />
          <Stat label="Active members" value={o.activeMembers} note="Practised in the last 30 days" />
          <Stat label="Paying members" value={o.payingMembers} note="Own or team plan active now" />
          <Stat label="New registrations this week" value={o.newThisWeek} note="Last 7 days" />
          <Stat label={`New registrations in ${monthLabel(month)}`} value={o.newInMonth} />
          <Stat
            label={`Revenue in ${monthLabel(month)}`}
            value={formatMoneyList(o.revenueMonth)}
            note={`${countOf(o.revenueMonth)} payments · all time ${formatMoneyList(o.revenueAll)}`}
          />
        </div>
      )}
    </Shell>
  );
}

export function AdminPracticeAnalytics() {
  const { month, setMonth, data, error } = useDashboard();
  const p = data?.practice;
  return (
    <Shell
      title="Practice Analytics"
      sub="Practices, features, streaks and inactive members."
      month={month}
      setMonth={setMonth}
      error={error}
      data={data}
    >
      {p && (
        <>
          <div className="adm-grid">
            <Stat
              label={`Completed practices in ${monthLabel(month)}`}
              value={p.completedMonth}
              note={`${p.completedAll} all time`}
            />
            <Stat
              label="Popular practice feature"
              value={p.features[0]?.name || "None yet"}
              note={p.features[0] ? `${p.features[0].count} practices this month` : ""}
            />
            <Stat label="Members on a streak" value={p.onStreak} note={`Average ${p.averageStreak} days`} />
            <Stat label="Longest current streak" value={`${p.longestCurrent} ${p.longestCurrent === 1 ? "day" : "days"}`} />
          </div>
          <div className="adm-two">
            <List
              title={`Practice features in ${monthLabel(month)}`}
              rows={p.features.map((f) => ({ name: f.name, value: f.count }))}
              empty="No practices this month."
            />
            <List
              title="Inactive members"
              rows={[
                { name: "No practice for 3+ days", value: p.inactive.d3 },
                { name: "No practice for 7+ days", value: p.inactive.d7 },
                { name: "No practice for 10+ days", value: p.inactive.d10 },
                { name: "Never practised", value: p.inactive.never },
              ]}
              empty=""
            />
          </div>
        </>
      )}
    </Shell>
  );
}

export function AdminLearnAnalytics() {
  const { month, setMonth, data, error } = useDashboard();
  const l = data?.learn;
  return (
    <Shell
      title="Learn Analytics"
      sub="Learn purchases and popular resources."
      month={month}
      setMonth={setMonth}
      error={error}
      data={data}
    >
      {l && (
        <>
          <div className="adm-grid">
            <Stat
              label={`Learn purchases in ${monthLabel(month)}`}
              value={countOf(l.purchasesMonth)}
              note={formatMoneyList(l.purchasesMonth)}
            />
            <Stat
              label="Learn purchases all time"
              value={countOf(l.purchasesAll)}
              note={formatMoneyList(l.purchasesAll)}
            />
            <Stat label="Most popular resource" value={l.popular[0]?.title || "None yet"} note={l.popular[0] ? `${l.popular[0].count} sold` : ""} />
          </div>
          <List
            title="Popular resources (all time)"
            rows={l.popular.map((b) => ({ name: b.title, value: `${b.count} sold` }))}
            empty="No Learn purchases yet."
          />
        </>
      )}
    </Shell>
  );
}

export function AdminGroupAnalytics() {
  const { month, setMonth, data, error } = useDashboard();
  const g = data?.group;
  const hours = (m) => {
    const h = Math.floor(m / 60);
    const r = Math.round(m % 60);
    if (!h) return `${r}mins`;
    return r ? `${h}hr ${r}mins` : `${h}hr`;
  };
  return (
    <Shell
      title="Group Practice"
      sub="Sessions, participants and usage."
      month={month}
      setMonth={setMonth}
      error={error}
      data={data}
    >
      {g && (
        <div className="adm-grid">
          <Stat label={`Sessions in ${monthLabel(month)}`} value={g.sessions} note={`${g.teamSessions} team calls`} />
          <Stat label="Participants" value={g.participants} note="Different members who joined a call" />
          <Stat label="Average call length" value={hours(g.averageMinutes)} />
          <Stat label="Call time used" value={hours(g.minutesUsed)} note={`By ${g.membersUsed} members`} />
          <Stat label="Planned practices" value={g.planned} note="Scheduled this month" />
        </div>
      )}
    </Shell>
  );
}

export function AdminSubscriptions() {
  const { month, setMonth, data, error } = useDashboard();
  const s = data?.subscriptions;
  return (
    <Shell
      title="Subscriptions & Payments"
      sub="Active subscriptions, revenue, renewals, cancellations and failed payments."
      month={month}
      setMonth={setMonth}
      error={error}
      data={data}
    >
      {s && (
        <>
          <div className="adm-grid">
            <Stat label="Active subscriptions" value={s.activeIndividual} note={`Plus ${s.activeTeams} team plans`} />
            <Stat label={`Subscription revenue in ${monthLabel(month)}`} value={formatMoneyList(s.revenueMonth)} />
            <Stat label="New subscriptions" value={s.newSubscriptions} />
            <Stat label="Renewals" value={s.renewals} />
            <Stat label="Cancellations" value={s.cancellations} />
            <Stat label="Failed payments" value={s.failedPayments} note="Failed or not completed" />
          </div>
          <List
            title="Active subscriptions by plan"
            rows={Object.entries(s.activeByPlan).map(([name, count]) => ({ name: `Loquiex ${name}`, value: count }))}
            empty="No active individual subscriptions."
          />
        </>
      )}
    </Shell>
  );
}
