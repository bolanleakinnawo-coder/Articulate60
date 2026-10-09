import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Mail, MessageSquareQuote } from "lucide-react";
import "./AdminLayout.css";

const ADMIN_SECTIONS = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  {
    to: "/admin/testimonials",
    label: "Testimonials",
    icon: MessageSquareQuote,
  },
  { to: "/admin/subscribers", label: "Email subscribers", icon: Mail },
];

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <div className="admin-brand">
          <span className="admin-brand-mark">A60</span>
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
        </nav>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
