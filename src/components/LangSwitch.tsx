import { useLang, type Lang } from "../context/LanguageContext";

const LANGS: { code: Lang; label: string }[] = [
  { code: "ru", label: "RU" },
  { code: "kz", label: "KZ" },
];

export function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <div className="lang-switch" role="group" aria-label="Язык интерфейса">
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          className={`lang-switch__btn ${lang === code ? "active" : ""}`}
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
