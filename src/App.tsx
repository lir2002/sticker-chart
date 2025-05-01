import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import HomeScreen from "./screens/HomeScreen";
import CalendarView from "./screens/CalendarView";
import { RootStackParamList } from "./types";
import CalendarViewAll from "./screens/CalendarViewAll";
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext";
import { UserProvider } from "./contexts/UserContext";
import { initDatabase } from "./db/database";
import TransactionHistory from "./screens/TransactionHistory";
import LocaleConfig from "./config/calendarConfig";

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
            <Stack.Screen
              name="TransactionHistory"
              component={TransactionHistory}
              options={{ title: "Transaction History" }}
            />
          </Stack.Navigator>
          <StatusBar style="auto" />
        </NavigationContainer>
      </UserProvider>
    </LanguageProvider>
  );
}
