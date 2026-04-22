import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";

export function AccountSwitcher() {
  const { currentUser, availableAccounts, switchAccount, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!currentUser) return null;

  const handleSwitch = (userId: string) => {
    const result = switchAccount(userId);
    if (result.ok) {
      setOpen(false);
      navigate(`/${result.user.role}`, { replace: true });
    }
  };

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate("/login", { replace: true });
  };

  return (
    <div className="account-switcher" ref={ref}>
      <button
        className="account-switcher__trigger"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="account-switcher__avatar">{currentUser.avatar}</span>
        <span className="account-switcher__info">
          <span className="account-switcher__name">{currentUser.name}</span>
          <span className="account-switcher__role">
            {currentUser.role === "teacher" ? "Учитель" : "Ученик"}
          </span>
        </span>
        <span className={`account-switcher__chevron ${open ? "open" : ""}`}>
          ▾
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="account-switcher__menu"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
          >
            <div className="account-switcher__section-title">
              Переключиться на аккаунт
            </div>
            <div className="account-switcher__list">
              {availableAccounts.map((acc) => {
                const active = acc.id === currentUser.id;
                return (
                  <button
                    key={acc.id}
                    className={`account-switcher__item ${active ? "active" : ""}`}
                    onClick={() => !active && handleSwitch(acc.id)}
                    disabled={active}
                  >
                    <span className="account-switcher__item-avatar">
                      {acc.avatar}
                    </span>
                    <span className="account-switcher__item-text">
                      <span className="account-switcher__item-name">
                        {acc.name}
                      </span>
                      <span className="account-switcher__item-meta">
                        {acc.role === "teacher" ? "Учитель" : "Ученик"} ·{" "}
                        {acc.email}
                      </span>
                    </span>
                    {active && (
                      <span className="account-switcher__badge">активен</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="account-switcher__divider" />
            <button
              className="account-switcher__logout"
              onClick={handleLogout}
            >
              Выйти из аккаунта
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
