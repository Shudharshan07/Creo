import React, { createContext, useContext, useState, useEffect, useCallback } from "react"

export type Theme = "dark" | "light" | "system"
export type ResolvedTheme = "dark" | "light"

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  resolvedTheme: "dark",
  setTheme: () => {},
})

export const useTheme = () => useContext(ThemeContext)

function getResolved(t: Theme): ResolvedTheme {
  if (t === "system") {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
  }
  return t
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement
  if (resolved === "light") {
    root.classList.add("theme-light")
    root.classList.remove("theme-dark")
  } else {
    root.classList.add("theme-dark")
    root.classList.remove("theme-light")
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("ma-theme") as Theme) ?? "dark"
  })

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    const t = (localStorage.getItem("ma-theme") as Theme) ?? "dark"
    return getResolved(t)
  })

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem("ma-theme", newTheme)
    const resolved = getResolved(newTheme)
    setResolvedTheme(resolved)
    applyTheme(resolved)
  }, [])

  // Apply on mount + watch system preference when theme = "system"
  useEffect(() => {
    const resolved = getResolved(theme)
    setResolvedTheme(resolved)
    applyTheme(resolved)

    if (theme !== "system") return

    const mq = window.matchMedia("(prefers-color-scheme: light)")
    const handler = (e: MediaQueryListEvent) => {
      const r: ResolvedTheme = e.matches ? "light" : "dark"
      setResolvedTheme(r)
      applyTheme(r)
    }
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
