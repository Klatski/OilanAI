import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Lightweight RU/KZ layer. We don't translate the whole app — just the
 * brand-identity touchpoints (slogan, tagline, greeting, main nav) so the
 * Kazakh roots of the project ("Oilan" = «ойлан» = думай) actually show.
 * The choice is persisted so it survives reloads and account switches.
 */
export type Lang = "ru" | "kz";

const STORAGE_KEY = "oilanai:lang";

const STRINGS = {
  ru: {
    tagline: "Архитектор Смыслов",
    slogan: "Думай вместе с ИИ",
    hello: "Привет",
    subjects: "Предметы",
    profile: "Профиль",
    login: "Войти",
  },
  kz: {
    tagline: "Мағына сәулетшісі",
    slogan: "Жасанды интеллектпен бірге ойлан",
    hello: "Сәлем",
    subjects: "Пәндер",
    profile: "Профиль",
    login: "Кіру",
  },
} as const;

type StringKey = keyof (typeof STRINGS)["ru"];

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: StringKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

function readStoredLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "ru" || v === "kz") return v;
  } catch {
    /* localStorage unavailable — fall back to ru */
  }
  return "ru";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => readStoredLang());

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback((key: StringKey) => STRINGS[lang][key], [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
