import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { TamaguiProvider, View, useTheme } from "tamagui";
import { Appearance } from "react-native";
import HomeScreen from "./screens/HomeScreen";
import CalendarView from "./screens/CalendarView";
import CalendarViewAll from "./screens/CalendarViewAll";
import TransactionHistory from "./screens/TransactionHistory";
import { RootStackParamList } from "./types";
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext";
import { UserProvider } from "./contexts/UserContext";
import { initDatabase } from "./db/database";
import tamaguiConfig from "./config/tamagui.config";

const Stack = createStackNavigator<RootStackParamList>();

const AppContent: React.FC = () => {
  const { t } = useLanguage();
  const tamaguiTheme = useTheme();
  const isDarkMode = Appearance.getColorScheme() === "dark";

  // Navigation theme based on system appearance and Tamagui tokens
  const navigationTheme = {
    ...(isDarkMode ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDarkMode ? DarkTheme.colors : DefaultTheme.colors),
      background:
        tamaguiTheme.background?.val || (isDarkMode ? "#000000" : "#FFFFFF"),
      card:
        tamaguiTheme.background?.val || (isDarkMode ? "#000000" : "#FFFFFF"),
      text: tamaguiTheme.text?.val || (isDarkMode ? "#FFFFFF" : "#000000"),
      primary:
        tamaguiTheme.primary?.val || (isDarkMode ? "#0A84FF" : "#007AFF"),
    },
  };

  const statusBarBackgroundColor =
    tamaguiTheme.background?.val || (isDarkMode ? "#000000" : "#FFFFFF");

  return (
    <NavigationContainer theme={navigationTheme}>
      <View f={1} bg="$background">
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor:
                tamaguiTheme.background?.val ||
                (isDarkMode ? "#000000" : "#FFFFFF"),
            },
            headerTintColor:
              tamaguiTheme.text?.val || (isDarkMode ? "#FFFFFF" : "#000000"),
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: t("title") }}
          />
          <Stack.Screen
            name="Calendar"
            component={CalendarView}
            options={({ route }) => ({
              title: `${route.params.eventType}`,
            })}
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
        <StatusBar
          style={isDarkMode ? "light" : "dark"}
          backgroundColor={statusBarBackgroundColor}
          key={Appearance.getColorScheme()}
        />
      </View>
    </NavigationContainer>
  );
};

export default function App() {
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(
    Appearance.getColorScheme() ?? "light"
  );

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

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      console.log("Appearance changed to:", colorScheme);
      setTheme(colorScheme === "dark" ? "dark" : "light");
    });
    return () => subscription.remove();
  }, []);

  if (!isDbInitialized) {
    return null;
  }

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme={theme}>
      <LanguageProvider>
        <UserProvider>
          <AppContent />
        </UserProvider>
      </LanguageProvider>
    </TamaguiProvider>
  );
}
