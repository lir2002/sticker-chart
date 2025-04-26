import React, { createContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "./types"; // Adjust path to your types file
import { getUserByName } from "./db/database"; // Adjust path to your database file

// Define the shape of the UserContext
interface UserContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  logout: () => void;
}

// Default Guest user
const GUEST_USER: User = {
  id: 2, // Assuming Guest user has ID 2 based on your database schema
  name: "Guest",
  role_id: 2, // Guest role
  code: 0,
  is_active: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  icon: null,
};

// Create the context with default values
export const UserContext = createContext<UserContextType>({
  currentUser: GUEST_USER,
  setCurrentUser: () => {},
  logout: () => {},
});

// Provider component
interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Restore user from AsyncStorage on mount
  useEffect(() => {
    const restoreUser = async () => {
      try {
        // Retrieve stored username
        const storedUserName = await AsyncStorage.getItem("currentUserName");
        if (storedUserName) {
          // Fetch user from database by name
          const user = await getUserByName(storedUserName);
          if (user && user.is_active) {
            setCurrentUser(user);
          } else {
            // If user is invalid or inactive, set to Guest
            setCurrentUser(GUEST_USER);
            await AsyncStorage.setItem("currentUserName", GUEST_USER.name);
          }
        } else {
          // No stored user, default to Guest
          setCurrentUser(GUEST_USER);
          await AsyncStorage.setItem("currentUserName", GUEST_USER.name);
        }
      } catch (error) {
        console.error("Error restoring user:", error);
        // Fallback to Guest on error
        setCurrentUser(GUEST_USER);
        await AsyncStorage.setItem("currentUserName", GUEST_USER.name);
      }
    };

    console.log("Executing restoreUser")

    restoreUser();
  }, []);

  // Update AsyncStorage when currentUser changes
  const handleSetCurrentUser = async (user: User | null) => {
    try {
      if (user) {
        setCurrentUser(user);
        await AsyncStorage.setItem("currentUserName", user.name);
        console.log("Set currentUser:", user?.name)
      } else {
        setCurrentUser(GUEST_USER);
        await AsyncStorage.setItem("currentUserName", GUEST_USER.name);
      }
    } catch (error) {
      console.error("Error saving user to AsyncStorage:", error);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setCurrentUser(GUEST_USER);
      await AsyncStorage.setItem("currentUserName", GUEST_USER.name);
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        setCurrentUser: handleSetCurrentUser,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};