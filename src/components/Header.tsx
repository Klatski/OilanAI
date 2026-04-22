import { Link, useLocation } from "react-router-dom";
import { AccountSwitcher } from "./AccountSwitcher";
import { StreakBadge } from "./StreakBadge";
import { useAuth } from "../context/AuthContext";

export function Header() {
  const { currentUser } = useAuth();
  const location = useLocation();

  const homePath = currentUser
    ? currentUser.role === "teacher"
      ? "/teacher"
      : "/student"
    : "/login";

  const isOnSubjects = location.pathname === "/student";
  const isOnMapOrChat =
    location.pathname.startsWith("/student/subject") ||
    location.pathname.startsWith("/student/chat");

  return (
    <header className="app-header">
      <Link to={homePath} className="app-header__logo">
        <span className="app-header__logo-orb" />
        <span className="app-header__logo-text">
          Oilan<span className="accent">AI</span>
        </span>
      </Link>

      {currentUser && currentUser.role === "student" && (
        <nav className="app-header__nav">
          <Link
            to="/student"
            className={`app-header__link ${isOnSubjects ? "active" : ""}`}
          >
            Предметы
          </Link>
          {isOnMapOrChat && (
            <span className="app-header__link app-header__link--muted">
              · текущий урок
            </span>
          )}
        </nav>
      )}

      <div className="app-header__right">
        {currentUser?.role === "student" && <StreakBadge />}
        <AccountSwitcher />
      </div>
    </header>
  );
}
