import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { login, currentUser } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      navigate(`/${currentUser.role}`, { replace: true });
    }
  }, [currentUser, navigate]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = login(email, password);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate(`/${result.user.role}`, { replace: true });
  };

  const fill = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="login-page">
      <div className="login-page__bg-orb login-page__bg-orb--1" />
      <div className="login-page__bg-orb login-page__bg-orb--2" />

      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="login-card__logo">
          <div className="login-card__orb" />
          <h1 className="login-card__title">
            Oilan<span className="accent">AI</span>
          </h1>
          <p className="login-card__subtitle">Архитектор Смыслов</p>
        </div>

        <form className="login-card__form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field__label">Email</span>
            <input
              className="field__input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@demo.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="field">
            <span className="field__label">Пароль</span>
            <input
              className="field__input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </label>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="btn btn--primary btn--full">
            Войти
          </button>
        </form>

        <div className="login-card__hint">
          <div className="login-card__hint-title">Демо-аккаунты</div>
          <div className="login-card__hint-grid">
            <button
              type="button"
              className="login-card__hint-item"
              onClick={() => fill("student@demo.com", "student123")}
            >
              <span className="login-card__hint-role">Ученик</span>
              <span className="login-card__hint-creds">
                student@demo.com / student123
              </span>
            </button>
            <button
              type="button"
              className="login-card__hint-item"
              onClick={() => fill("teacher@demo.com", "teacher123")}
            >
              <span className="login-card__hint-role">Учитель</span>
              <span className="login-card__hint-creds">
                teacher@demo.com / teacher123
              </span>
            </button>
          </div>
          <div className="login-card__hint-note">
            Ещё есть: dana@demo.com · timur@demo.com · aigerim@demo.com
            (пароль = имя + 123)
          </div>
        </div>
      </motion.div>
    </div>
  );
}
