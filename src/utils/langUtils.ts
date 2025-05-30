import * as Localization from "expo-localization";

export const getSystemLanguage = (): "zh" | "en" => {
  try {
    const locale = Localization.getLocales()[0]?.languageCode || "en";
    // console.log("expo-localization getLocales:", Localization.getLocales()); // Debug log
    return locale.toLowerCase().includes("zh") ? "zh" : "en";
  } catch (error) {
    console.error("Error accessing expo-localization:", error);
    return "en"; // Fallback to English
  }
};
