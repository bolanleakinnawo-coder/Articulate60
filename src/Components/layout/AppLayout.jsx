import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import CallBar from "./CallBar";
import LearnNotice from "../learn/LearnNotice";

export default function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <CallBar />
        <LearnNotice />
        <Outlet />
      </main>

      <MobileNav />
    </div>
  );
}
