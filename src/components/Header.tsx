import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { AccountSwitcher } from "./AccountSwitcher";
import { StreakBadge } from "./StreakBadge";
import { useAuth } from "../context/AuthContext";
import { useQuarter } from "../context/QuarterContext";
import { getClassByStudentId } from "../data/mockClasses";

export function Header() {
  const { currentUser } = useAuth();
  const { currentQuarter, onSummerBreak } = useQuarter();
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

  const studentClass = useMemo(
    () =>
      currentUser?.role === "student"
        ? getClassByStudentId(currentUser.id)
        : undefined,
    [currentUser]
  );

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
        {currentUser?.role === "student" && studentClass && (
          <span
            className="class-chip class-chip--header"
            style={{
              borderColor: `${studentClass.accent}66`,
              color: studentClass.accent,
            }}
            title={`Твой класс: ${studentClass.name}`}
          >
            {studentClass.emoji} {studentClass.name}
          </span>
        )}
        {currentUser?.role === "student" && (
          <span
            className="quarter-pill"
            title={
              onSummerBreak
                ? "Летние каникулы — программа 1 четверти"
                : "Текущая четверть по школьному календарю"
            }
          >
            <span className="quarter-pill__dot" />
            {onSummerBreak ? "лето · " : ""}
            {currentQuarter} четверть
          </span>
        )}
        {currentUser?.role === "student" && <StreakBadge />}
        <AccountSwitcher />
      </div>
    </header>
  );
}
