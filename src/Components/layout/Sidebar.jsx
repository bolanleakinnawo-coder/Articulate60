import {
  Home,
  Target,
  Trophy,
  BookOpen,
  User,

  LogOut,
} from "lucide-react";

import { Link, NavLink, useNavigate } from "react-router-dom";
import brandLogo from "../../assets/brandlogo.PNG";

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
    name: "Learn",
    path: "/app/learn",
    icon: BookOpen,
  },

  {
    name: "Profile",
    path: "/app/profile",
    icon: User,
  },
];

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <aside className="sidebar">
      <Link
        className="sidebar-logo"
        to="/app/home"
        aria-label="Loquiex home"
      >
        <img src={brandLogo} alt="Loquiex" />
      </Link>

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
        <button className="sidebar-action" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
