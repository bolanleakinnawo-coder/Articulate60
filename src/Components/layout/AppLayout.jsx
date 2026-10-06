import { Link, Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

export default function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <header className="dashboard-mobile-header">
          <Link
            className="dashboard-logo"
            to="/app/home"
            aria-label="Articulate60 home"
          >
            articulate<span>60</span>
          </Link>
        </header>
        <Outlet />
      </main>

      <MobileNav />
    </div>
  );
}
