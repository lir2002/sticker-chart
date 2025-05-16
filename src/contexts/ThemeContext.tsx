import React, { createContext, useContext } from "react";
import { ThemeContextType } from "../types";

export const ThemeContext = createContext<ThemeContextType>({
  themeMode: "auto",
  setThemeMode: () => {},
  effectiveTheme: "light",
});

export const useThemeContext = () => useContext(ThemeContext);