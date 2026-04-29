"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "dark" | "light" | "system";

const STORAGE_KEY = "bhashaverse:theme";
const DEFAULT_MODE: ThemeMode = "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedMode: "dark" | "light";
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return DEFAULT_MODE;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light" || saved === "system") {
      return saved;
    }
  } catch {
    // localStorage may be blocked — fall through to default
  }
  return DEFAULT_MODE;
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyClass(resolved: "dark" | "light") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_MODE);
  const [systemDark, setSystemDark] = useState(true);

  // Hydrate from storage and watch the system preference.
  useEffect(() => {
    setModeState(readStoredMode());
    setSystemDark(systemPrefersDark());

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolvedMode: "dark" | "light" = useMemo(() => {
    if (mode === "system") return systemDark ? "dark" : "light";
    return mode;
  }, [mode, systemDark]);

  useEffect(() => {
    applyClass(resolvedMode);
  }, [resolvedMode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage failures (private mode, etc.)
    }
  }, []);

  const toggle = useCallback(() => {
    setMode(resolvedMode === "dark" ? "light" : "dark");
  }, [resolvedMode, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolvedMode, setMode, toggle }),
    [mode, resolvedMode, setMode, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Safe fallback so non-provider consumers don't crash. Theme just won't change.
    return {
      mode: DEFAULT_MODE,
      resolvedMode: "dark",
      setMode: () => {},
      toggle: () => {},
    };
  }
  return ctx;
}

/**
 * Inline script for `next/script`-style early execution. We embed it directly
 * into the document head via a <script dangerouslySetInnerHTML /> so the saved
 * theme is applied before React hydrates — preventing the dreaded white flash.
 */
export const themeBootScript = `
(function() {
  try {
    var saved = localStorage.getItem('${STORAGE_KEY}');
    var mode = (saved === 'dark' || saved === 'light' || saved === 'system') ? saved : '${DEFAULT_MODE}';
    var resolved = mode === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : mode;
    var root = document.documentElement;
    if (resolved === 'dark') { root.classList.add('dark'); root.classList.remove('light'); }
    else { root.classList.add('light'); root.classList.remove('dark'); }
  } catch (e) {}
})();
`;
