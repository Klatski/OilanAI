import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MOCK_USERS } from "../data/mockUsers";
import type { User } from "../types";

type LoginResult = { ok: true; user: User } | { ok: false; error: string };

interface AuthContextValue {
  currentUser: User | null;
  login: (email: string, password: string) => LoginResult;
  logout: () => void;
  switchAccount: (userId: string) => LoginResult;
  availableAccounts: User[];
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "currentUser";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [currentUser]);

  const login = useCallback((email: string, password: string): LoginResult => {
    const normalized = email.trim().toLowerCase();
    const found = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === normalized && u.password === password
    );
    if (!found) {
      return { ok: false, error: "Неверный email или пароль" };
    }
    setCurrentUser(found);
    return { ok: true, user: found };
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  const switchAccount = useCallback((userId: string): LoginResult => {
    const found = MOCK_USERS.find((u) => u.id === userId);
    if (!found) return { ok: false, error: "Аккаунт не найден" };
    setCurrentUser(found);
    return { ok: true, user: found };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      login,
      logout,
      switchAccount,
      availableAccounts: MOCK_USERS,
    }),
    [currentUser, login, logout, switchAccount]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
