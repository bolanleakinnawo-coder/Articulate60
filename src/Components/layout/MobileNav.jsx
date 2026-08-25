import { Home, Target, Trophy, BookOpen, User } from "lucide-react";
import { NavLink } from "react-router-dom";

const navigation = [
  { name: "Home", path: "/app/home", icon: Home },
  { name: "Practice", path: "/app/practice", icon: Target },
  { name: "Challenges", path: "/app/challenges", icon: Trophy },
  { name: "Library", path: "/app/library", icon: BookOpen },
  { name: "Profile", path: "/app/profile", icon: User },
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
            end={item.path === "/app/home"}
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
