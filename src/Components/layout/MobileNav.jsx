import { Home, Target, Trophy, BookOpen, User } from "lucide-react";
import { NavLink } from "react-router-dom";

const navigation = [
  { name: "Home", path: "/", icon: Home },
  { name: "Practice", path: "/practice", icon: Target },
  { name: "Challenges", path: "/challenges", icon: Trophy },
  { name: "Library", path: "/library", icon: BookOpen },
  { name: "Profile", path: "/profile", icon: User },
];

export default function MobileNav() {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {navigation.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `mobile-nav-link ${isActive ? "active" : ""}`
            }
          >
            <Icon size={18} />
            <span>{item.name}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
