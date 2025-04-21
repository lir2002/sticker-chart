import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import HomeScreen from "./components/HomeScreen";
import CalendarView from "./components/CalendarView";
import { RootStackParamList } from "./types";
import CalendarViewAll from "./components/CalendarViewAll";

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Event Marker" }} />
        <Stack.Screen
          name="Calendar"
          component={CalendarView}
          options={({ route }) => ({ title: `${route.params.eventType}` })}
        />        
        <Stack.Screen
          name="CalendarViewAll"
          component={CalendarViewAll}
          // options={{ headerShown: false }} // Hide the header to remove title
        />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

