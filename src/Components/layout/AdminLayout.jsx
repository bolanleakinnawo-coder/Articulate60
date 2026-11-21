import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Activity,
  BookOpen,
  Users,
  WalletCards,
  Bell,
  MailCheck,
  BellRing,
  CreditCard,
  LockKeyhole,
  LogOut,
  Mail,
  MessageSquareQuote,
} from "lucide-react";
import api, { getAdminKey, setAdminKey } from "../../api/axios";
import "./AdminLayout.css";
import "../../Pages/AdminRound14.css";

// Round 14 (Sheriff): the dashboard sections, then the tools that were
// already here. On a phone they become one row of tabs under the header.
const ADMIN_GROUPS = [
  {
    title: "Dashboard",
    items: [
      { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
      { to: "/admin/practice", label: "Practice Analytics", icon: Activity },
      { to: "/admin/learn-analytics", label: "Learn Analytics", icon: BookOpen },
      { to: "/admin/group-practice", label: "Group Practice", icon: Users },
      { to: "/admin/subscriptions", label: "Subscriptions & Payments", icon: WalletCards },
      { to: "/admin/notifications", label: "Notifications", icon: Bell },
      { to: "/admin/emails", label: "Emails", icon: MailCheck },
    ],
  },
  {
    title: "Manage",
    items: [
      { to: "/admin/testimonials", label: "Testimonials", icon: MessageSquareQuote },
      { to: "/admin/payments", label: "Payments", icon: CreditCard },
      { to: "/admin/subscribers", label: "Email subscribers", icon: Mail },
      { to: "/admin/product-notifications", label: "Learn & books", icon: BellRing },
    ],
  },
];
const ADMIN_SECTIONS = ADMIN_GROUPS.flatMap((g) => g.items);

// The admin API needs the admin key (ADMIN_API_KEY on the server). It is kept
// for this browser tab only and checked by the server on every request.
function AdminKeyGate({ onUnlock }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const key = value.trim();
    if (!key) return;
    setBusy(true);
    setError("");
    setAdminKey(key);
    try {
      await api.get("/api/testimonials/admin", { params: { status: "pending" } });
      onUnlock();
    } catch (err) {
      setAdminKey(null);
      setError(
        err.response?.status === 401
          ? "That key isn't right."
          : err.response?.data?.message || "Couldn't reach the server. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-layout admin-gate">
      <form className="admin-gate-card" onSubmit={submit}>
        <span className="admin-gate-icon">
          <LockKeyhole size={22} />
        </span>
        {/* Round 14 (Sheriff): just "Admin login"; the wins/subscriber line is gone. */}
        <h1>Admin login</h1>
        <label htmlFor="admin-key">Admin key</label>
        <input
          id="admin-key"
          type="password"
          autoComplete="current-password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
        {error && (
          <p className="admin-gate-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy || !value.trim()}>
          {busy ? "Checking…" : "Open admin"}
        </button>
      </form>
    </div>
  );
}

export default function AdminLayout() {
  const [unlocked, setUnlocked] = useState(() => Boolean(getAdminKey()));

  useEffect(() => {
    const lock = () => setUnlocked(false);
    window.addEventListener("loquiex:admin-key", lock);
    return () => window.removeEventListener("loquiex:admin-key", lock);
  }, []);

  if (!unlocked) return <AdminKeyGate onUnlock={() => setUnlocked(true)} />;

  const lock = () => {
    setAdminKey(null);
    setUnlocked(false);
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <div className="admin-brand">
          <span className="admin-brand-mark">Loquiex</span>
          <span>Admin</span>
        </div>
        <nav className="admin-nav">
          {ADMIN_GROUPS.map((group) => (
            <div className="admin-nav-group" key={group.title}>
              <p className="admin-nav-title">{group.title}</p>
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `admin-nav-link${isActive ? " active" : ""}`
                  }
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
          <button type="button" className="admin-nav-link admin-logout" onClick={lock}>
            <LogOut size={18} />
            Lock admin
          </button>
        </nav>
      </aside>

      {/* Round 14 (Sheriff): phone header with one scrollable row of tabs. */}
      <header className="admin-mobile-head">
        <div className="admin-mobile-top">
          <span className="admin-brand">
            <span className="admin-brand-mark">Loquiex</span>
            <span>Admin</span>
          </span>
          <button type="button" className="admin-mobile-lock" onClick={lock}>
            <LogOut size={16} aria-hidden="true" />
            Lock
          </button>
        </div>
        <nav className="admin-mobile-tabs" aria-label="Admin sections">
          {ADMIN_SECTIONS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `admin-mobile-tab${isActive ? " active" : ""}`}
              ref={(el) => {
                if (el && el.classList.contains("active")) {
                  el.scrollIntoView?.({ block: "nearest", inline: "center" });
                }
              }}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
