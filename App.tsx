import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import HomeScreen from "./components/HomeScreen";
import CalendarView from "./components/CalendarView";
import { RootStackParamList } from "./types";
import CalendarViewAll from "./components/CalendarViewAll";
import { LanguageProvider, useLanguage } from "./LanguageContext";
import { LocaleConfig } from "react-native-calendars";
import { UserProvider } from "./UserContext";
import { initDatabase } from "./db/database";

// Configure calendar locales for English and Chinese
LocaleConfig.locales["en"] = {
  monthNames: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  monthNamesShort: [
    "Jan.",
    "Feb.",
    "Mar.",
    "Apr.",
    "May",
    "Jun.",
    "Jul.",
    "Aug.",
    "Sep.",
    "Oct.",
    "Nov.",
    "Dec.",
  ],
  dayNames: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
  dayNamesShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  today: "Today",
};

LocaleConfig.locales["zh"] = {
  monthNames: [
    "一月",
    "二月",
    "三月",
    "四月",
    "五月",
    "六月",
    "七月",
    "八月",
    "九月",
    "十月",
    "十一月",
    "十二月",
  ],
  monthNamesShort: [
    "1月",
    "2月",
    "3月",
    "4月",
    "5月",
    "6月",
    "7月",
    "8月",
    "9月",
    "10月",
    "11月",
    "12月",
  ],
  dayNames: [
    "星期日",
    "星期一",
    "星期二",
    "星期三",
    "星期四",
    "星期五",
    "星期六",
  ],
  dayNamesShort: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
  today: "今天",
};

// Set default locale (will be overridden by useLanguage)
LocaleConfig.defaultLocale = "en";

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  const [isDbInitialized, setIsDbInitialized] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initDatabase();
        setIsDbInitialized(true);
      } catch (error) {
        console.error("App initialization error:", error);
      }
    };
    initializeApp();
  }, []);

  if (!isDbInitialized) {
    return null;
  }

  return (
    <LanguageProvider>
      <UserProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Home">
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={() => {
                const { t } = useLanguage(); // Use hook directly in options
                return { title: t("title") };
              }}
            />
            <Stack.Screen
              name="Calendar"
              component={CalendarView}
              options={({ route }) => ({ title: `${route.params.eventType}` })}
            />
            <Stack.Screen
              name="CalendarViewAll"
              component={CalendarViewAll}
              options={{ title: "All Stickers" }}
            />
          </Stack.Navigator>
          <StatusBar style="auto" />
        </NavigationContainer>
      </UserProvider>
    </LanguageProvider>
  );
}
