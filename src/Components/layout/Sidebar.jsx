import {
  Home,
  Target,
  Trophy,
  BookOpen,
  User,
  Settings,
  LogOut,
} from "lucide-react";

import { NavLink } from "react-router-dom";

const navigation = [
  {
    name: "Home",
    path: "/app/home",
    icon: Home,
  },
  {
    name: "Practice",
    path: "/app/practice",
    icon: Target,
  },
  {
    name: "Challenges",
    path: "/app/challenges",
    icon: Trophy,
  },
  {
    name: "Library",
    path: "/app/library",
    icon: BookOpen,
  },
  {
    name: "Profile",
    path: "/app/profile",
    icon: User,
  },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">A</div>

        <span>ARTICULATE 60</span>
      </div>

      <nav className="sidebar-nav">
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === "/app/home"}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <Icon size={19} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <button className="sidebar-action">
          <Settings size={18} />
          <span>Settings</span>
        </button>

        <button className="sidebar-action">
          <LogOut size={18} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
