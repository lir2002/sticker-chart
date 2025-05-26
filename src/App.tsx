import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { TamaguiProvider, View, YStack, useTheme, Text } from "tamagui";
import { Appearance, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import HomeScreen from "./screens/HomeScreen";
import CalendarView from "./screens/CalendarView";
import CalendarViewAll from "./screens/CalendarViewAll";
import TransactionHistory from "./screens/TransactionHistory";
import EditItemScreen from "./screens/EditItemScreen";
import ManageProductsScreen from "./screens/ManageProductsScreen";
import { RootStackParamList } from "./types";
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext";
import { UserProvider } from "./contexts/UserContext";
import { initDatabase } from "./db/database";
import tamaguiConfig from "./config/tamagui.config";
import { ThemeContext } from "./contexts/ThemeContext";
import ProductPreviewScreen from "./screens/ProductPreviewScreen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

const Stack = createStackNavigator<RootStackParamList>();

const BrowseStoreScreen = () => (
  <YStack f={1} jc="center" ai="center">
    <Text>Browse Store Screen (To be implemented)</Text>
  </YStack>
);
const AppContent: React.FC = () => {
  const { t } = useLanguage();
  const tamaguiTheme = useTheme();
  const isDarkMode = Appearance.getColorScheme() === "dark";

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
            headerBackTitle: "",
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
          <Stack.Screen name="EditItem" component={EditItemScreen} />
          <Stack.Screen name="BrowseStore" component={BrowseStoreScreen} />
          <Stack.Screen
            name="ManageProducts"
            component={ManageProductsScreen}
            options={{ title: t("manageProducts") }}
          />
          <Stack.Screen
            name="ProductPreview"
            component={ProductPreviewScreen}
            options={{ title: t("previewProduct") }}
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
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "auto">("auto");

  // Compute effective theme based on themeMode and system color scheme
  const effectiveTheme =
    themeMode === "auto" ? systemColorScheme ?? "light" : themeMode;

  // Load saved theme mode
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedMode = await AsyncStorage.getItem("themeMode");
        if (savedMode) {
          setThemeMode(savedMode as "light" | "dark" | "auto");
        }
      } catch (error) {
        console.error("Failed to load theme mode:", error);
      }
    };
    loadTheme();
  }, []);

  // Save theme mode and update on system theme change
  useEffect(() => {
    const saveTheme = async () => {
      try {
        await AsyncStorage.setItem("themeMode", themeMode);
      } catch (error) {
        console.error("Failed to save theme mode:", error);
      }
    };
    saveTheme();

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (themeMode === "auto") {
        // Trigger re-render by relying on useColorScheme
      }
    });
    return () => subscription.remove();
  }, [themeMode]);

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TamaguiProvider config={tamaguiConfig} defaultTheme={effectiveTheme}>
          <LanguageProvider>
            <UserProvider>
              <ThemeContext.Provider
                value={{ themeMode, setThemeMode, effectiveTheme }}
              >
                <AppContent />
              </ThemeContext.Provider>
            </UserProvider>
          </LanguageProvider>
        </TamaguiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
