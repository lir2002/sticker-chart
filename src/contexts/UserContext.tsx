import React, { createContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "../types";
import { getUserByName, forceAdminPasswordSetup } from "../db/database";

// Define the shape of the UserContext
interface UserContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  logout: () => void;
}

// Create the context with default values
export const UserContext = createContext<UserContextType>({
  currentUser: null,
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
        // Check if Admin password setup is needed
        const needsPasswordSetup = await forceAdminPasswordSetup();
        if (needsPasswordSetup) {
          // Keep currentUser as null to trigger CodeSetup
          return;
        }

        // Retrieve stored username
        const storedUserName = await AsyncStorage.getItem("currentUserName");
        if (storedUserName) {
          // Fetch user from database by name
          const user = await getUserByName(storedUserName);
          if (user && user.is_active) {
            setCurrentUser(user);
          } else {
            // Fetch Guest user from database
            const guestUser = await getUserByName("Guest");
            if (guestUser) {
              setCurrentUser(guestUser);
              await AsyncStorage.setItem("currentUserName", guestUser.name);
            }
          }
        } else {
          // No stored user, default to Guest
          const guestUser = await getUserByName("Guest");
          if (guestUser) {
            setCurrentUser(guestUser);
            await AsyncStorage.setItem("currentUserName", guestUser.name);
          }
        }
      } catch (error) {
        console.error("Error restoring user:", error);
        // Fallback to Guest on error
        const guestUser = await getUserByName("Guest");
        if (guestUser) {
          setCurrentUser(guestUser);
          await AsyncStorage.setItem("currentUserName", guestUser.name);
        }
      }
    };

    console.log("Executing restoreUser");
    restoreUser();
  }, []);

  // Update AsyncStorage when currentUser changes
  const handleSetCurrentUser = async (user: User | null) => {
    try {
      if (user) {
        setCurrentUser(user);
        await AsyncStorage.setItem("currentUserName", user.name);
        console.log("Set currentUser:", user?.name);
      } else {
        const guestUser = await getUserByName("Guest");
        if (guestUser) {
          setCurrentUser(guestUser);
          await AsyncStorage.setItem("currentUserName", guestUser.name);
        }
      }
    } catch (error) {
      console.error("Error saving user to AsyncStorage:", error);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      const guestUser = await getUserByName("Guest");
      if (guestUser) {
        setCurrentUser(guestUser);
        await AsyncStorage.setItem("currentUserName", guestUser.name);
      }
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