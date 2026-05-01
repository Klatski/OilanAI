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

        <div className="login-card__tip">
          <span className="login-card__tip-arrow" aria-hidden>
            ↓
          </span>
          <span>
            <strong>Нет аккаунта?</strong> Просто нажми на одну из
            кнопок-карточек ниже — email и пароль подставятся сами, останется
            кликнуть «Войти».
          </span>
        </div>

        <div className="login-card__hint">
          <div className="login-card__hint-title">
            Демо-аккаунты <span className="login-card__hint-pill">кликабельны</span>
          </div>
          <div className="login-card__hint-grid">
            <button
              type="button"
              className="login-card__hint-item login-card__hint-item--clickable"
              onClick={() => fill("student@demo.com", "student123")}
              title="Нажми — поля заполнятся автоматически"
            >
              <span className="login-card__hint-role">
                <span className="login-card__hint-emoji">🎓</span>
                Ученик · 7Б
              </span>
              <span className="login-card__hint-creds">
                student@demo.com / student123
              </span>
              <span className="login-card__hint-cta">Нажми, чтобы войти →</span>
            </button>
            <button
              type="button"
              className="login-card__hint-item login-card__hint-item--clickable"
              onClick={() => fill("teacher@demo.com", "teacher123")}
              title="Нажми — поля заполнятся автоматически"
            >
              <span className="login-card__hint-role">
                <span className="login-card__hint-emoji">🧑‍🏫</span>
                Учитель · 5А, 7Б, 11В
              </span>
              <span className="login-card__hint-creds">
                teacher@demo.com / teacher123
              </span>
              <span className="login-card__hint-cta">Нажми, чтобы войти →</span>
            </button>
          </div>
          <div className="login-card__hint-note">
            Ещё ученики (пароль = имя + 123):
            <br />
            <b>dana@demo.com</b> — 11В · <b>timur@demo.com</b> — 5А ·{" "}
            <b>aigerim@demo.com</b> — 7Б
          </div>
          <div className="login-card__hint-note login-card__hint-note--soft">
            Демо-школа: 3 класса (5А, 7Б, 11В), один учитель — классный
            руководитель всех трёх. Каждый ученик видит темы своего класса
            и текущей четверти.
          </div>
        </div>
      </motion.div>
    </div>
  );
}
