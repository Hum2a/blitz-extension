import { createContext, useContext } from "react";
import { useAppearance } from "../hooks/useAppearance.js";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const value = useAppearance();
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return ctx;
}
