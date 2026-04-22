import { Link, useLocation } from "react-router-dom";
import { AccountSwitcher } from "./AccountSwitcher";
import { useAuth } from "../context/AuthContext";

export function Header() {
  const { currentUser } = useAuth();
  const location = useLocation();

  const homePath = currentUser
    ? currentUser.role === "teacher"
      ? "/teacher"
      : "/student"
    : "/login";

  return (
    <header className="app-header">
      <Link to={homePath} className="app-header__logo">
        <span className="app-header__logo-orb" />
        <span className="app-header__logo-text">
          Cyber-Socratic <span className="accent">Arena</span>
        </span>
      </Link>

      {currentUser && currentUser.role === "student" && (
        <nav className="app-header__nav">
          <Link
            to="/student"
            className={`app-header__link ${
              location.pathname === "/student" ? "active" : ""
            }`}
          >
            Карта квеста
          </Link>
          <Link
            to="/student/chat"
            className={`app-header__link ${
              location.pathname.startsWith("/student/chat") ? "active" : ""
            }`}
          >
            Сократовский чат
          </Link>
        </nav>
      )}

      <AccountSwitcher />
    </header>
  );
}
