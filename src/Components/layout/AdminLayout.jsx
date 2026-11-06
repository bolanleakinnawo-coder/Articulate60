import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  BellRing,
  LockKeyhole,
  LogOut,
  Mail,
  MessageSquareQuote,
} from "lucide-react";
import api, { getAdminKey, setAdminKey } from "../../api/axios";
import "./AdminLayout.css";

const ADMIN_SECTIONS = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  {
    to: "/admin/testimonials",
    label: "Testimonials",
    icon: MessageSquareQuote,
  },
  { to: "/admin/subscribers", label: "Email subscribers", icon: Mail },
  {
    to: "/admin/product-notifications",
    label: "Product notifications",
    icon: BellRing,
  },
];

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
        <h1>Loquiex Admin</h1>
        <p>Enter the admin key to review wins and subscriber lists.</p>
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

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <div className="admin-brand">
          <span className="admin-brand-mark">Loquiex</span>
          <span>Admin</span>
        </div>
        <nav className="admin-nav">
          {ADMIN_SECTIONS.map(({ to, label, icon: Icon, end }) => (
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
          <button
            type="button"
            className="admin-nav-link admin-logout"
            onClick={() => {
              setAdminKey(null);
              setUnlocked(false);
            }}
          >
            <LogOut size={18} />
            Lock admin
          </button>
        </nav>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
