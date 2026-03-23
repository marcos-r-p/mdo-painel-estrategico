import {
  createContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'

// ─── Context type ────────────────────────────────────────────
export interface ThemeContextType {
  darkMode: boolean
  setDarkMode: (value: boolean) => void
  toggleDarkMode: () => void
}

export const ThemeContext = createContext<ThemeContextType | null>(null)

// ─── Helpers ─────────────────────────────────────────────────
const STORAGE_KEY = 'mdo-dark-mode'

function readStoredPreference(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) return stored === 'true'
  } catch {
    // localStorage may be unavailable (SSR, privacy mode)
  }
  return false
}

// ─── Provider ────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkModeState] = useState<boolean>(readStoredPreference)

  // Sync dark class on <html> and persist to localStorage
  useEffect(() => {
    const root = document.documentElement
    if (darkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    try {
      localStorage.setItem(STORAGE_KEY, String(darkMode))
    } catch {
      // ignore write errors
    }
  }, [darkMode])

  const setDarkMode = useCallback((value: boolean) => {
    setDarkModeState(value)
  }, [])

  const toggleDarkMode = useCallback(() => {
    setDarkModeState((prev) => !prev)
  }, [])

  const value: ThemeContextType = {
    darkMode,
    setDarkMode,
    toggleDarkMode,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
