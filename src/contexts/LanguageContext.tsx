import React, { createContext, useState, useEffect, useContext } from "react";
import { setLanguage, t } from "../utils/translation";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setCalendarLocale } from "../config/calendarConfig";

type Language = "en" | "zh" | "auto";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, any>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    // Initialize language from the utility (already called in translation.ts)
    // Keep it so language icon can keep sync in Home when restart
    const loadLanguage = async () => {
      const savedLanguage = await AsyncStorage.getItem("appLanguage");
      if (
        savedLanguage === "en" ||
        savedLanguage === "zh" ||
        savedLanguage === "auto"
      ) {
        setLanguageState(savedLanguage);
        setCalendarLocale();
      }
    };
    loadLanguage();
  }, []);

  const handleSetLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await setLanguage(lang); // Sync with the utility
    setCalendarLocale(); 
  };

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage: handleSetLanguage, t }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
