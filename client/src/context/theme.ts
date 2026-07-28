import { createContext, useContext } from "react"

export type Theme = "dark" | "light" | "system"
export type ResolvedTheme = "dark" | "light"

export interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  resolvedTheme: "dark",
  setTheme: () => {},
})

export const useTheme = () => useContext(ThemeContext)