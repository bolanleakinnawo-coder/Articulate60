import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import CallBar from "./CallBar";

export default function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <CallBar />
        <Outlet />
      </main>

      <MobileNav />
    </div>
  );
}
