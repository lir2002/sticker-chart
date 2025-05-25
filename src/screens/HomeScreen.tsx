import React, { useState, useEffect, useContext, useMemo } from "react";
import {
  Alert,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  Button,
  Dimensions,
  Platform,
  useColorScheme,
  SafeAreaView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { RootStackParamList, EventType, User, Wallet } from "../types";
import {
  getEventTypesWithOwner,
  insertEventType,
  forceAdminPasswordSetup,
  getUsers,
  getUserByName,
  verifyUserCode,
  createUser,
  updateUserIcon,
  resetUserCode,
  deleteUser,
  hasEventTypeOwner,
  updateUserCode,
  updateUserContact,
  getWallet,
  deleteEventType,
  updateEventType,
} from "../db/database";
import CodeSetup from "../components/CodeSetup";
import ChangeCode from "../components/ChangeCode";
import { useLanguage } from "../contexts/LanguageContext";
import LocaleConfig from "../config/calendarConfig";
import { availableColors } from "../icons";
import { UserContext } from "../contexts/UserContext";
import { CustomButton, StyledInput } from "../components/SharedComponents";
import BackupData from "../components/BackupData";
import RestoreData from "../components/RestoreData";
import { YStack, XStack, Text, useTheme, Separator } from "tamagui";
import { processUserIcon, resolvePhotoUri } from "../utils/fileUtils";
import { useThemeContext } from "../contexts/ThemeContext";

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Home"
>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

// Modal container for various modals
const ModalContainer: React.FC<{
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ visible, onClose, children }) => {
  const theme = useTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <YStack f={1} jc="center" ai="center" bg="$overlay">
        <YStack
          bg="$modalBackground"
          p="$4"
          br="$2"
          w="80%"
          ai="center"
          position="relative"
        >
          <TouchableOpacity
            onPress={onClose}
            style={{ position: "absolute", top: 10, right: 10 }}
          >
            <MaterialIcons name="close" size={24} color={theme.icon.val} />
          </TouchableOpacity>
          {children}
        </YStack>
      </YStack>
    </Modal>
  );
};

// Menu modal for Tools and Services
const MenuModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  tab: "tools" | "services";
}> = ({ visible, onClose, children, tab }) => {
  const theme = useTheme();
  const screenWidth = Dimensions.get("window").width;
  const tabWidth = screenWidth / 2;
  const modalWidth = 200;
  const tabBarHeight = 75; // Adjust based on actual tab bar height

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: "transparent" }}
        onPress={onClose}
        activeOpacity={1}
      >
        <YStack
          position="absolute"
          bottom={tabBarHeight}
          {...(tab === "tools" ? { left: 0 } : { right: 0 })}
          width={modalWidth}
          bg="$modalBackground"
          p="$4"
          borderRadius={0}
          borderWidth={1}
          borderColor="$border"
          onPress={(e) => e.stopPropagation()}
        >
          {children}
        </YStack>
      </TouchableOpacity>
    </Modal>
  );
};

// Picker field component
const PickerField: React.FC<{
  selectedValue: any;
  onValueChange: (value: any) => void;
  items: { label: string; value: any }[];
  enabled?: boolean;
  width?: any;
}> = ({ selectedValue, onValueChange, items, enabled, width }) => (
  <Picker
    selectedValue={selectedValue}
    onValueChange={onValueChange}
    style={{ width: width ?? "100%", marginBottom: 1 }}
    enabled={enabled}
  >
    {items.map((item) => (
      <Picker.Item key={item.value} label={item.label} value={item.value} />
    ))}
  </Picker>
);

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const systemColorScheme = useColorScheme();
  const { themeMode, setThemeMode, effectiveTheme } = useThemeContext();
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [filterText, setFilterText] = useState("");
  const [filterIcon, setFilterIcon] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isUserModalVisible, setIsUserModalVisible] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<string>("event");
  const [selectedColor, setSelectedColor] = useState<string>("#000000");
  const [availability, setAvailability] = useState<number>(0);
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(null);
  const { currentUser, setCurrentUser } = useContext(UserContext);
  const [addTypeModalVisible, setAddTypeModalVisible] = useState(false);
  const [verifyCodeModalVisible, setVerifyCodeModalVisible] = useState(false);
  const [inputCode, setInputCode] = useState("");
  const [userProfileModalVisible, setUserProfileModalVisible] = useState(false);
  const [switchUserModalVisible, setSwitchUserModalVisible] = useState(false);
  const [editUserModalVisible, setEditUserModalVisible] = useState(false);
  const [changeCodeModalVisible, setChangeCodeModalVisible] = useState(false);
  const [isEditingUsers, setIsEditingUsers] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [plaintUsers, setPlaintUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pendingEditUser, setPendingEditUser] = useState<User | null>(null);
  const [newUserName, setNewUserName] = useState("");
  const [newUserRoleId, setNewUserRoleId] = useState<number>(3);
  const [isAddingEventType, setIsAddingEventType] = useState(false);
  const [newUserPassword, setNewUserPassword] = useState<string>("0000");
  const [newFaceValue, setNewFaceValue] = useState("1");
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [email, setEmail] = useState(currentUser?.email || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [needsInitial, setNeedsInitial] = useState<true | false>(false);
  const [cacheBuster, setCacheBuster] = useState(Date.now());
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(
    null
  );
  const [isEditingEventType, setIsEditingEventType] = useState(false);
  const [isDeletingEventType, setIsDeletingEventType] = useState(false);
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeTab, setActiveTab] = useState<"basic" | "appearance">("basic");
  const [toolsMenuVisible, setToolsMenuVisible] = useState(false);
  const [servicesMenuVisible, setServicesMenuVisible] = useState(false);

  // Filter event types by text and selected users
  const filteredEventTypes = eventTypes.filter((eventType) => {
    const matchesText = eventType.name
      .toLowerCase()
      .includes(filterText.toLowerCase());
    const matchesUser =
      selectedUsers.length === 0 ||
      selectedUsers.some((user) => user.id === eventType.owner);
    return matchesText && matchesUser;
  });

  const allIcons = Object.keys(MaterialIcons.getRawGlyphMap());
  const filteredIcons = useMemo(() => {
    if (!filterIcon) return allIcons;
    return allIcons.filter((icon) =>
      icon.toLowerCase().includes(filterIcon.toLowerCase())
    );
  }, [filterIcon, allIcons]);

  // Toggle user selection
  const toggleUserSelection = (user: User) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  // Clear selected users
  const clearSelectedUsers = () => {
    setSelectedUsers([]);
  };

  // Remove a single user
  const removeUser = (userId: number) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const modalTitleProps = {
    fontSize: "$4",
    fontWeight: "bold",
    mb: "$2",
    color: "$text",
  };

  const iconLabelProps = {
    fontSize: "$3",
    fontWeight: "600",
    my: "$2",
    alignSelf: "flex-start" as const,
    color: "$text",
  };

  // Close all menus
  const closeMenus = () => {
    setToolsMenuVisible(false);
    setServicesMenuVisible(false);
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        const needsPasswordSetup = await forceAdminPasswordSetup();
        if (needsPasswordSetup) {
          setCurrentUser(null);
          setNeedsInitial(true);
        } else if (!currentUser) {
          const guestUser = await getUserByName("Guest");
          if (guestUser) {
            setCurrentUser(guestUser);
          }
        }
        const types = await getEventTypesWithOwner();
        setEventTypes(types);
        const allUsers = await getUsers();
        setUsers(allUsers);
        setPlaintUsers(allUsers.filter((u) => u.role_id === 3));
      } catch (error) {
        console.error("Initialization error:", error);
        Alert.alert("Error", t("errorInitialize"));
      }
    };

    initialize();
    const refreshEventType = async () => {
      try {
        const types = await getEventTypesWithOwner();
        setEventTypes(types);
      } catch (error) {
        console.error("Failed to refresh Event Types", error);
      }
    };
    const unsubscribe = navigation.addListener("focus", refreshEventType);
    return unsubscribe;
  }, []);

  useEffect(() => {
    LocaleConfig.defaultLocale = language;
  }, [language]);

  useEffect(() => {
    const ordinaryUsers = users.filter((u) => u.role_id === 3);
    if (ordinaryUsers.length > 0 && !selectedOwnerId) {
      setSelectedOwnerId(ordinaryUsers[0].id);
    } else if (ordinaryUsers.length === 0) {
      setSelectedOwnerId(null);
    }
  }, [users, selectedOwnerId]);

  useEffect(() => {
    if (currentUser) {
      setEmail(currentUser.email || "");
      setPhone(currentUser.phone || "");
    }
  }, [currentUser]);

  useEffect(() => {
    const fetchWallet = async () => {
      if (currentUser && userProfileModalVisible) {
        try {
          const userWallet = await getWallet(currentUser.id);
          setWallet(userWallet);
        } catch (error) {
          console.error("Error fetching wallet:", error);
          setWallet(null);
        }
      }
    };
    fetchWallet();
  }, [currentUser, userProfileModalVisible]);

  // Handle click to toggle between light and dark
  const handleThemeToggle = () => {
    const newMode =
      themeMode === "light" ||
      (themeMode === "auto" && systemColorScheme === "light")
        ? "dark"
        : "light";
    setThemeMode(newMode);
  };

  // Handle long press to set auto mode
  const handleThemeAuto = () => {
    setThemeMode("auto");
  };

  const handleAddEventType = async () => {
    if (!currentUser || currentUser.role_id !== 1) {
      Alert.alert("Error", t("adminOnly"));
      return;
    }
    setIsAddingEventType(true);
    setIsEditingEventType(false);
    setNewTypeName("");
    setSelectedIcon("event");
    setSelectedColor("#000000");
    setAvailability(0);
    setSelectedOwnerId(users.filter((u) => u.role_id === 3)[0]?.id || null);
    setNewFaceValue("1");
    setVerifyCodeModalVisible(true);
  };

  const handleSubmitEventType = async () => {
    if (!currentUser || !newTypeName.trim()) {
      Alert.alert("Error", t("errorEmptyEventTypeName"));
      return;
    }
    if (!selectedOwnerId) {
      Alert.alert("Error", t("errorNoOwnerSelected"));
      return;
    }
    // Validate expiration date (must not be before today)
    if (expirationDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(expirationDate);
      selected.setHours(0, 0, 0, 0);
      if (selected < today) {
        Alert.alert("Error", t("errorExpirationDateBeforeToday"));
        return;
      }
    }
    try {
      // Convert expiration date to ISO string with 23:59:59 local time
      let expirationDateIso: string | undefined = undefined;
      if (expirationDate) {
        const localDate = new Date(expirationDate);
        localDate.setHours(23, 59, 59, 0);
        expirationDateIso = localDate.toISOString();
      }
      if (isEditingEventType && selectedEventType) {
        await updateEventType(
          selectedEventType.name,
          selectedEventType.owner!,
          selectedIcon,
          selectedColor,
          availability,
          newTypeName,
          selectedOwnerId,
          parseInt(newFaceValue),
          expirationDateIso
        );
      } else {
        await insertEventType(
          newTypeName,
          selectedIcon,
          selectedColor,
          availability,
          selectedOwnerId,
          parseInt(newFaceValue),
          expirationDateIso
        );
      }
      const updatedTypes = await getEventTypesWithOwner();
      setEventTypes(updatedTypes);
      setNewTypeName("");
      setSelectedIcon("event");
      setSelectedColor("#000000");
      setAvailability(0);
      setSelectedOwnerId(users.filter((u) => u.role_id === 3)[0]?.id || null);
      setNewFaceValue("1");
      setExpirationDate(null);
      setAddTypeModalVisible(false);
      setIsEditingEventType(false);
      setActiveTab("basic");
      setFilterIcon("");
      Alert.alert(
        t("success"),
        isEditingEventType
          ? t("successUpdateEventType")
          : t("successAddEventType")
      );
    } catch (error: any) {
      Alert.alert(
        "Error",
        `${
          isEditingEventType
            ? t("errorUpdateEventType")
            : t("errorAddEventType")
        }: ${error.message}`
      );
    }
  };

  // Helper to format date for display
  const formatDate = (date: Date | null): string => {
    if (!date) return t("noExpiration");
    return date.toLocaleDateString(language === "en" ? "en-US" : "zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const handleVerifyCode = async () => {
    if (!currentUser) return;
    const isValid = await verifyUserCode(currentUser.id, inputCode);
    if (isValid) {
      if (isAddingEventType) {
        setAddTypeModalVisible(true);
        setIsAddingEventType(false);
      } else if (isDeletingEventType && selectedEventType) {
        try {
          if (selectedEventType.owner === null) {
            Alert.alert("Error", t("errorInvalidOwner"));
            return;
          }
          await deleteEventType(
            selectedEventType.name,
            selectedEventType.owner
          );
          const updatedTypes = await getEventTypesWithOwner();
          setEventTypes(updatedTypes);
          setContextMenuVisible(false);
          setSelectedEventType(null);
          setIsDeletingEventType(false);
          Alert.alert(t("success"), t("successDeleteEventType"));
        } catch (error: any) {
          Alert.alert(
            "Error",
            `${t("errorDeleteEventType")}: ${error.message}`
          );
        }
      } else if (isEditingEventType && selectedEventType) {
        setNewTypeName(selectedEventType.name);
        setSelectedIcon(selectedEventType.icon);
        setSelectedColor(selectedEventType.iconColor);
        setAvailability(selectedEventType.availability);
        setSelectedOwnerId(selectedEventType.owner);
        setNewFaceValue(selectedEventType.weight.toString());
        setExpirationDate(
          selectedEventType.expiration_date
            ? new Date(selectedEventType.expiration_date)
            : null
        );
        setAddTypeModalVisible(true);
        setContextMenuVisible(false);
      } else if (pendingEditUser) {
        setSelectedUser(pendingEditUser);
        setEditUserModalVisible(true);
        setPendingEditUser(null);
        setSwitchUserModalVisible(false);
      }
      setVerifyCodeModalVisible(false);
      setInputCode("");
    } else {
      Alert.alert("Error", t("invalidPassword"));
      setInputCode("");
    }
  };

  const handleLongPressEventType = (item: EventType) => {
    if (!currentUser || currentUser.role_id !== 1) return;
    setSelectedEventType(item);
    setContextMenuVisible(true);
  };

  const handleDeleteEventType = async () => {
    if (!selectedEventType) return;
    try {
      const hasEvents = (selectedEventType.eventCount ?? 0) > 0;
      if (hasEvents) {
        Alert.alert("Warning", t("cannotDeleteEventTypeWithEvents"));
        setContextMenuVisible(false);
        setSelectedEventType(null);
        return;
      }
      setIsDeletingEventType(true);
      setVerifyCodeModalVisible(true);
    } catch (error: any) {
      Alert.alert("Error", `${t("errorCheckEvents")}: ${error.message}`);
      setContextMenuVisible(false);
      setSelectedEventType(null);
    }
  };

  const handleUpdateEventType = () => {
    if (!selectedEventType) return;
    setIsEditingEventType(true);
    setVerifyCodeModalVisible(true);
  };

  const handleCodeInputChange = (text: string) => {
    if (text.match(/^\d*$/)) {
      setInputCode(text);
    }
  };

  const handleChangeIcon = async (user: User) => {
    // Request permissions for both media library and camera
    const mediaPermission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();

    if (!mediaPermission.granted && !cameraPermission.granted) {
      Alert.alert("Error", t("selectImageAndCameraPermission"));
      return;
    }

    // Show action sheet to choose between camera and gallery
    Alert.alert(
      t("changeIcon"),
      t("selectImageSource"),
      [
        {
          text: t("takePhoto"),
          onPress: async () => {
            if (!cameraPermission.granted) {
              Alert.alert("Error", t("cameraPermission"));
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: "images",
              allowsEditing: true,
              aspect: [1, 1],
              quality: 1,
            });

            if (!result.canceled && result.assets[0].uri) {
              try {
                const relativePath = await processUserIcon(
                  result.assets[0].uri,
                  user.id,
                  user.icon
                );

                await updateUserIcon(user.id, relativePath);
                const updatedUser = { ...user, icon: relativePath };

                if (user.id === currentUser?.id) {
                  setCurrentUser(updatedUser);
                }
                if (user.id === selectedUser?.id) {
                  setSelectedUser(updatedUser);
                }

                const updatedUsers = users.map((u) =>
                  u.id === user.id ? updatedUser : u
                );
                setUsers(updatedUsers);
                setPlaintUsers(updatedUsers.filter((u) => u.role_id === 3));

                setCacheBuster(Date.now());
                Alert.alert(t("success"), t("iconUpdated"));
              } catch (error: any) {
                console.error("Error updating icon from camera:", error);
                Alert.alert(
                  "Error",
                  `${t("errorUpdateIcon")}: ${error.message}`
                );
              }
            }
          },
          isDisabled: !cameraPermission.granted,
        },
        {
          text: t("chooseFromGallery"),
          onPress: async () => {
            if (!mediaPermission.granted) {
              Alert.alert("Error", t("selectImagePermission"));
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: "images",
              allowsEditing: true,
              aspect: [1, 1],
              quality: 1,
            });

            if (!result.canceled && result.assets[0].uri) {
              try {
                const relativePath = await processUserIcon(
                  result.assets[0].uri,
                  user.id,
                  user.icon
                );

                await updateUserIcon(user.id, relativePath);
                const updatedUser = { ...user, icon: relativePath };

                if (user.id === currentUser?.id) {
                  setCurrentUser(updatedUser);
                }
                if (user.id === selectedUser?.id) {
                  setSelectedUser(updatedUser);
                }

                const updatedUsers = users.map((u) =>
                  u.id === user.id ? updatedUser : u
                );
                setUsers(updatedUsers);
                setPlaintUsers(updatedUsers.filter((u) => u.role_id === 3));

                setCacheBuster(Date.now());
                Alert.alert(t("success"), t("iconUpdated"));
              } catch (error: any) {
                console.error("Error updating icon from gallery:", error);
                Alert.alert(
                  "Error",
                  `${t("errorUpdateIcon")}: ${error.message}`
                );
              }
            }
          },
          isDisabled: !mediaPermission.granted,
        },
        {
          text: t("cancel"),
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  const handleSwitchUser = async (user: User) => {
    setUserProfileModalVisible(false);
    if (user.name === "Guest") {
      setCurrentUser(user);
      setSwitchUserModalVisible(false);
      return;
    }
    setSelectedUser(user);
    setVerifyCodeModalVisible(true);
  };

  const handleVerifySwitchUser = async () => {
    if (!selectedUser) return;
    const isValid = await verifyUserCode(selectedUser.id, inputCode);
    if (isValid) {
      setCurrentUser(selectedUser);
      setSwitchUserModalVisible(false);
      setVerifyCodeModalVisible(false);
      setInputCode("");
      setSelectedUser(null);
    } else {
      Alert.alert("Error", t("invalidPassword"));
      setInputCode("");
    }
  };

  const handleCreateUser = async () => {
    if (!newUserName.trim()) {
      Alert.alert("Error", t("errorEmptyUsername"));
      return;
    }
    if (!newUserPassword.match(/^\d{4}$/)) {
      Alert.alert("Error", t("errorInvalidPassword"));
      return;
    }
    try {
      const newUserId = await createUser(
        newUserName,
        newUserRoleId,
        newUserPassword
      );
      const newUser = await getUsers().then((users) =>
        users.find((u) => u.id === newUserId)
      );
      if (newUser) {
        setUsers([...users, newUser]);
        setPlaintUsers([...users, newUser].filter((u) => u.role_id === 3));
        setNewUserName("");
        setNewUserRoleId(3);
        setNewUserPassword("0000");
        setEditUserModalVisible(false);
        Alert.alert(t("success"), t("successCreateUser"));
      }
    } catch (error: any) {
      Alert.alert("Error", `${t("errorCreateUser")}: ${error.message}`);
    }
  };

  const handleEditUser = (user: User) => {
    if (!currentUser || currentUser.role_id !== 1) {
      Alert.alert("Error", t("adminOnly"));
      return;
    }
    setPendingEditUser(user);
    setVerifyCodeModalVisible(true);
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    try {
      await resetUserCode(selectedUser.id, "0000");
      const updatedUsers = users.map((u) =>
        u.id === selectedUser.id ? { ...u, code: "0000" } : u
      );
      setUsers(updatedUsers);
      Alert.alert(t("success"), t("passwordReset"));
    } catch (error) {
      Alert.alert("Error", `${t("errorResetPassword")}: ${error}`);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    const hasOwner = await hasEventTypeOwner(selectedUser.id);
    if (hasOwner) {
      Alert.alert("Error", t("cannotDeleteUser"));
      return;
    }
    try {
      await deleteUser(selectedUser.id);
      setUsers(users.filter((u) => u.id !== selectedUser.id));
      setPlaintUsers(
        users.filter((u) => u.role_id === 3 && u.id !== selectedUser.id)
      );
      if (currentUser?.id === selectedUser.id) {
        const guestUser = await getUserByName("Guest");
        if (guestUser) setCurrentUser(guestUser);
      }
      setEditUserModalVisible(false);
      setSelectedUser(null);
    } catch (error) {
      Alert.alert("Error", `${t("errorDeleteUser")}: ${error}`);
    }
  };

  const renderEventType = ({ item }: { item: EventType }) => (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate("Calendar", {
          eventType: item.name,
          owner: item.owner,
          ownerName: item.ownerName,
          icon: item.icon,
          iconColor: item.iconColor,
        })
      }
      onLongPress={() => handleLongPressEventType(item)}
      delayLongPress={1000} // 1 seconds
      style={{ marginHorizontal: marginHo, marginBottom: 10 }}
    >
      <YStack
        bg="$lightGray"
        br="$2"
        p="$1"
        borderWidth={1}
        borderColor="$border"
        ai="center"
        jc="space-between"
        h={73}
        width={73}
        elevation={2}
      >
        <XStack ai="center" jc="center" f={1} flexWrap="wrap">
          <MaterialIcons name={item.icon} size={30} color={item.iconColor} />
          <Text fontSize="$3" fontWeight="bold" color="$primary" mx="$1">
            {item.eventCount}
          </Text>
          <Text
            fontSize="$3"
            color="$text"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.name}
          </Text>
        </XStack>
        <Text
          fontSize="$2"
          color="$gray"
          textAlign="center"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {item.ownerName ?? t("unknown")}
        </Text>
      </YStack>
    </TouchableOpacity>
  );

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      onPress={() =>
        isEditingUsers ? handleEditUser(item) : handleSwitchUser(item)
      }
    >
      <XStack
        ai="center"
        py="$2"
        p="$3"
        borderBottomWidth={1}
        borderBottomColor="$border"
      >
        {item.icon ? (
          <Image
            source={{ uri: `${resolvePhotoUri(item.icon)}?t=${cacheBuster}` }}
            style={{ width: 30, height: 30, borderRadius: 15 }}
          />
        ) : (
          <MaterialIcons name="person" size={24} color={theme.icon.val} />
        )}
        <Text fontSize="$4" ml="$2" color="$text">
          {item.name}
        </Text>
      </XStack>
    </TouchableOpacity>
  );

  if (needsInitial) {
    return (
      <CodeSetup
        onCodeSet={async (newCode: string) => {
          try {
            const adminUser = await getUserByName("Admin");
            if (adminUser) {
              await updateUserCode(adminUser.id, newCode);
              setCurrentUser(adminUser);
              setNeedsInitial(false);
            }
          } catch (error) {
            Alert.alert("Error", `${t("errorSetPassword")}: ${error}`);
          }
        }}
      />
    );
  }

  const screenWidth = Dimensions.get("window").width;
  const numColumns = Math.floor((screenWidth - 32) / 80);
  const paddingHo = 16;
  const marginHo = ((screenWidth - paddingHo * 2) / numColumns - 73) / 2;
  const iconItemWidth = 80; // Approximate width per icon (including padding)
  const nCols = Math.floor((screenWidth * 0.8) / iconItemWidth);

  if (currentUser)
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <YStack f={1} p={paddingHo} bg="$background">
          <XStack jc="space-between" ai="center" mb="$4">
            <TouchableOpacity
              onPress={() => setLanguage(language === "en" ? "zh" : "en")}
              style={{
                backgroundColor: theme.primary.val,
                borderRadius: 12,
                paddingVertical: 4,
                width: 40,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                fontSize="$4"
                fontWeight="bold"
                color="$background"
                textAlign="center"
              >
                {language === "zh" ? "En" : "中文"}
              </Text>
            </TouchableOpacity>

            {/* Day/Night Toggle Icon */}
            <TouchableOpacity
              onPress={handleThemeToggle}
              onLongPress={handleThemeAuto}
              delayLongPress={1000}
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: theme.background.val,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: theme.border.val,
              }}
              accessibilityLabel={
                themeMode === "auto"
                  ? "Toggle theme, currently auto"
                  : `Switch to ${themeMode === "light" ? "dark" : "light"} mode`
              }
              accessibilityRole="button"
              accessibilityHint="Long press to enable auto theme based on system settings"
            >
              <MaterialIcons
                name={
                  themeMode === "auto"
                    ? "brightness-auto"
                    : themeMode === "light"
                    ? "wb-sunny"
                    : "nightlight"
                }
                size={20}
                color={theme.icon.val}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setUserProfileModalVisible(true)}>
              {currentUser.icon ? (
                <Image
                  source={{
                    uri: `${resolvePhotoUri(
                      currentUser.icon
                    )}?t=${cacheBuster}`,
                  }}
                  style={{ width: 30, height: 30, borderRadius: 15 }}
                />
              ) : (
                <MaterialIcons name="person" size={30} color={theme.icon.val} />
              )}
            </TouchableOpacity>
          </XStack>
          <XStack ai="center" mb="$1" gap="$2">
            <Text
              fontSize={language === "zh" ? "$5" : "$4"}
              fontWeight="bold"
              color="$text"
              flex={5}
              textAlign="left"
            >
              {t("achievements")}
            </Text>
            <StyledInput
              placeholder={t("filterTypes")}
              borderRadius={25}
              height={40}
              value={filterText}
              onChangeText={setFilterText}
              autoCapitalize="none"
              flex={5}
              accessibilityLabel={t("filterTypes")}
            />
            <TouchableOpacity
              onPress={() => setIsUserModalVisible(true)}
              style={{
                alignItems: "center",
                justifyContent: "center",
              }}
              accessibilityLabel={t("selectUsers")}
              accessibilityRole="button"
            >
              <MaterialIcons
                name="arrow-drop-down"
                size={24}
                color={theme.icon.val}
              />
            </TouchableOpacity>
          </XStack>

          {/* Selected users display */}
          {selectedUsers.length > 0 && (
            <XStack gap="$2" mb="$2" flexWrap="wrap">
              {selectedUsers.map((user) => (
                <XStack
                  key={user.id}
                  ai="center"
                  bg={theme.primary.val}
                  borderRadius="$2"
                  px="$2"
                  py="$1"
                  gap="$1"
                >
                  <Text fontSize="$3" color="$background">
                    {user.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeUser(user.id)}
                    accessibilityLabel={t("removeUser", { name: user.name })}
                  >
                    <MaterialIcons name="close" size={16} color="$white" />
                  </TouchableOpacity>
                </XStack>
              ))}
            </XStack>
          )}
          <FlatList
            data={filteredEventTypes}
            renderItem={renderEventType}
            keyExtractor={(item) => `${item.name}-${item.owner || "null"}`}
            numColumns={numColumns || 4}
            contentContainerStyle={{
              paddingBottom: 60,
              alignItems: "flex-start",
            }}
            ListEmptyComponent={
              <Text fontSize="$4" color="$gray" textAlign="center" mt="$4">
                {t("noEventTypes")}
              </Text>
            }
          />
        </YStack>

        {/* Tab Bar */}
        <XStack
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          bg="$background"
          borderTopWidth={1}
          borderTopColor="$border"
          elevation={4}
        >
          <TouchableOpacity
            onPress={() => {
              closeMenus();
              setToolsMenuVisible(true);
            }}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              padding: 10,
            }}
          >
            <YStack
              ai="center"
              bg={toolsMenuVisible ? "$lightGray" : "$background"}
              p="$2"
            >
              <MaterialIcons name="build" size={24} color={theme.icon.val} />
              <Text fontSize="$3" color="$text">
                {t("tools")}
              </Text>
            </YStack>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              closeMenus();
              setServicesMenuVisible(true);
            }}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              padding: 10,
            }}
          >
            <YStack
              ai="center"
              bg={servicesMenuVisible ? "$lightGray" : "$background"}
              p="$2"
            >
              <MaterialIcons name="store" size={24} color={theme.icon.val} />
              <Text fontSize="$3" color="$text">
                {t("services")}
              </Text>
            </YStack>
          </TouchableOpacity>
        </XStack>
        <MenuModal
          visible={toolsMenuVisible}
          onClose={() => setToolsMenuVisible(false)}
          tab="tools"
        >
          <YStack w="100%">
            {currentUser.role_id === 1 && (
              <>
                <TouchableOpacity
                  onPress={() => {
                    setBackupModalVisible(true);
                    setToolsMenuVisible(false);
                  }}
                  style={{ paddingVertical: 8 }}
                >
                  <Text fontSize="$4" color="$text">
                    {t("backupData")}
                  </Text>
                </TouchableOpacity>
                <Separator borderColor={theme.border.val} marginVertical="$2" />
                <TouchableOpacity
                  onPress={() => {
                    setRestoreModalVisible(true);
                    setToolsMenuVisible(false);
                  }}
                  style={{ paddingVertical: 8 }}
                >
                  <Text fontSize="$4" color="$text">
                    {t("restoreData")}
                  </Text>
                </TouchableOpacity>
                <Separator borderColor={theme.border.val} marginVertical="$2" />
                <TouchableOpacity
                  onPress={() => {
                    handleAddEventType();
                    setToolsMenuVisible(false);
                  }}
                  style={{ paddingVertical: 8 }}
                >
                  <Text fontSize="$4" color="$text">
                    {t("newAchievementType")}
                  </Text>
                </TouchableOpacity>
                <Separator borderColor={theme.border.val} marginVertical="$2" />
                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate("ManageProducts");
                    setToolsMenuVisible(false);
                  }}
                  style={{ paddingVertical: 8 }}
                >
                  <Text fontSize="$4" color={theme.text.val}>
                    {t("manageProducts")}
                  </Text>
                </TouchableOpacity>
                <Separator borderColor={theme.border.val} marginVertical="$2" />
                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate("EditItem");
                    setToolsMenuVisible(false);
                  }}
                  style={{ paddingVertical: 8 }}
                >
                  <Text fontSize="$4" color="$text">
                    {t("createItem")}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </YStack>
        </MenuModal>
        <MenuModal
          visible={servicesMenuVisible}
          onClose={() => setServicesMenuVisible(false)}
          tab="services"
        >
          <YStack w="100%">
            <TouchableOpacity
              onPress={() => {
                navigation.navigate("CalendarViewAll");
                setServicesMenuVisible(false);
              }}
              style={{ paddingVertical: 8 }}
            >
              <Text fontSize="$4" color="$text">
                {t("viewAllStickers")}
              </Text>
            </TouchableOpacity>
            {currentUser.role_id !== 2 && (
              <>
                <Separator borderColor={theme.border.val} marginVertical="$2" />
                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate("TransactionHistory", {
                      userId: currentUser.id,
                    });
                    setServicesMenuVisible(false);
                  }}
                  style={{ paddingVertical: 8 }}
                >
                  <Text fontSize="$4" color="$text">
                    {t("transactionHistory")}
                  </Text>
                </TouchableOpacity>
              </>
            )}
            <Separator borderColor={theme.border.val} marginVertical="$2" />
            <TouchableOpacity
              onPress={() => {
                navigation.navigate("BrowseStore");
                setServicesMenuVisible(false);
              }}
              style={{ paddingVertical: 8 }}
            >
              <Text fontSize="$4" color="$text">
                {t("browseStore")}
              </Text>
            </TouchableOpacity>
          </YStack>
        </MenuModal>

        {/* User selection modal */}
        <Modal
          visible={isUserModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsUserModalVisible(false)}
        >
          <YStack
            f={1}
            bg="rgba(0, 0, 0, 0.5)"
            jc="center"
            ai="flex-end"
            paddingRight="$4"
          >
            <YStack
              bg="$background"
              borderRadius="$4"
              p="$4"
              width={200}
              maxHeight="80%"
              elevation={4}
            >
              {plaintUsers.length === 0 ? (
                <Text fontSize="$4" color="$text" mb="$4">
                  {t("noUsers")}
                </Text>
              ) : (
                <>
                  <Text
                    fontSize="$5"
                    fontWeight="bold"
                    color="$text"
                    textAlign="center"
                    mb="$4"
                  >
                    {t("filterUsers")}
                  </Text>
                  <ScrollView showsVerticalScrollIndicator={true}>
                    <YStack>
                      {plaintUsers.map((user, index) => (
                        <YStack key={user.id}>
                          <TouchableOpacity
                            onPress={() => toggleUserSelection(user)}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                              paddingVertical: 8,
                            }}
                            accessibilityLabel={t("selectUser", {
                              name: user.name,
                            })}
                            accessibilityRole="button"
                          >
                            <Text fontSize="$4" color="$text" flex={1}>
                              {user.name}
                            </Text>
                            {selectedUsers.some((u) => u.id === user.id) && (
                              <MaterialIcons
                                name="check"
                                size={20}
                                color={theme.primary.val}
                              />
                            )}
                          </TouchableOpacity>
                          {index < plaintUsers.length - 1 && (
                            <Separator
                              borderColor={theme.border.val}
                              marginVertical="$2"
                            />
                          )}
                        </YStack>
                      ))}
                    </YStack>
                  </ScrollView>
                  <XStack gap="$2" mt="$4" jc="flex-end">
                    <Button
                      onPress={() => {
                        clearSelectedUsers();
                        setIsUserModalVisible(false);
                      }}
                      color="$white"
                      accessibilityLabel={t("clearUsers")}
                      title={t("clear")}
                    />
                    <Button
                      onPress={() => setIsUserModalVisible(false)}
                      color="$white"
                      accessibilityLabel={t("close")}
                      title={t("close")}
                    />
                  </XStack>
                </>
              )}
            </YStack>
          </YStack>
        </Modal>
        {/* Context Menu Modal */}
        <ModalContainer
          visible={contextMenuVisible && !verifyCodeModalVisible}
          onClose={() => {
            setContextMenuVisible(false);
            setSelectedEventType(null);
          }}
        >
          <Text {...modalTitleProps}>{t("eventTypeOptions")}</Text>
          <CustomButton title={t("update")} onPress={handleUpdateEventType} />
          <CustomButton title={t("delete")} onPress={handleDeleteEventType} />
        </ModalContainer>

        {/* AddType/UpdateType Modal */}
        <ModalContainer
          visible={addTypeModalVisible}
          onClose={() => {
            setNewTypeName("");
            setSelectedIcon("event");
            setSelectedColor("#000000");
            setAvailability(0);
            setSelectedOwnerId(
              users.filter((u) => u.role_id === 3)[0]?.id || null
            );
            setNewFaceValue("1");
            setExpirationDate(null); // Reset expiration date
            setAddTypeModalVisible(false);
            setIsEditingEventType(false);
            setActiveTab("basic");
            setFilterIcon("");
          }}
        >
          <Text {...modalTitleProps}>
            {isEditingEventType ? t("updateEventType") : t("addNewEventType")}
          </Text>
          {activeTab === "basic" ? (
            <YStack w="100%">
              <XStack>
                <Text {...iconLabelProps} flex={2} alignSelf="center">
                  {t("selectIcon")}
                </Text>
                <StyledInput
                  my={2}
                  fontSize={"$3"}
                  flex={4}
                  placeholder={t("filterIcons")}
                  borderRadius={15}
                  height={35}
                  value={filterIcon}
                  onChangeText={setFilterIcon}
                  autoCapitalize="none"
                  accessibilityLabel={t("filterIcons")}
                />
              </XStack>
              <FlatList
                data={filteredIcons}
                renderItem={({ item: icon }) => (
                  <YStack
                    key={icon}
                    p="$2"
                    bg={selectedIcon === icon ? "$lightGray" : undefined}
                    br="$1"
                    width={iconItemWidth}
                    alignItems="center"
                  >
                    <TouchableOpacity onPress={() => setSelectedIcon(icon)}>
                      <MaterialIcons
                        name={icon}
                        size={40}
                        color={selectedColor}
                      />
                    </TouchableOpacity>
                  </YStack>
                )}
                keyExtractor={(icon) => icon}
                numColumns={nCols || 4} // Fallback to 4 columns if calculation fails
                contentContainerStyle={{ paddingBottom: 10 }}
                style={{ maxHeight: 180 }} // Limit height to prevent modal overflow
              />
              <Text {...iconLabelProps}>{t("selectColor")}</Text>
              <ScrollView horizontal style={{ flexGrow: 0, marginBottom: 10 }}>
                {availableColors.map((color) => (
                  <YStack
                    key={color}
                    w={30}
                    h={30}
                    br={50}
                    m="$1"
                    bg={color}
                    borderWidth={selectedColor === color ? 2 : 0}
                    borderColor="$primary"
                  >
                    <TouchableOpacity
                      onPress={() => setSelectedColor(color)}
                      style={{ flex: 1 }}
                    />
                  </YStack>
                ))}
              </ScrollView>
              <XStack jc="flex-end" w="100%" mt="$2">
                <Button
                  title={t("nextStep")}
                  onPress={() => setActiveTab("appearance")}
                />
              </XStack>
            </YStack>
          ) : (
            <YStack maxHeight="80%">
              <ScrollView>
                <YStack w="100%">
                  <StyledInput
                    editable={!isEditingEventType}
                    placeholder={t("namePlaceholder")}
                    value={newTypeName}
                    onChangeText={setNewTypeName}
                    maxLength={20}
                    autoFocus={!isEditingEventType}
                  />
                  <XStack ai="center">
                    <Text {...iconLabelProps} flex={1} alignSelf="center">
                      {t("selectAvailability")}
                    </Text>
                    <PickerField
                      width="50%"
                      selectedValue={availability}
                      onValueChange={setAvailability}
                      items={Array.from({ length: 101 }, (_, i) => ({
                        label: `${i}`,
                        value: i,
                      }))}
                    />
                  </XStack>
                  <XStack ai="center">
                    <Text {...iconLabelProps} flex={1} alignSelf="center">
                      {t("faceValue")}
                    </Text>
                    <PickerField
                      width="50%"
                      enabled={!isEditingEventType}
                      selectedValue={newFaceValue}
                      onValueChange={setNewFaceValue}
                      items={[1, 2, 3, 4, 5].map((value) => ({
                        label: value.toString(),
                        value: value.toString(),
                      }))}
                    />
                  </XStack>
                  <XStack ai="center">
                    <Text {...iconLabelProps} flex={1} alignSelf="center">
                      {t("selectOwner")}
                    </Text>
                    <PickerField
                      width="50%"
                      selectedValue={selectedOwnerId}
                      onValueChange={setSelectedOwnerId}
                      items={
                        users.filter((u) => u.role_id === 3).length > 0
                          ? users
                              .filter((u) => u.role_id === 3)
                              .map((user) => ({
                                label: user.name,
                                value: user.id,
                              }))
                          : [{ label: t("noOrdinaryUsers"), value: null }]
                      }
                      enabled={
                        !isEditingEventType &&
                        users.filter((u) => u.role_id === 3).length > 0
                      }
                    />
                  </XStack>
                  <Text {...iconLabelProps}>{t("expirationDate")}</Text>
                  <XStack ai="center" jc="space-between" w="100%" mb="$2">
                    <Text fontSize="$3" color="$text">
                      {formatDate(expirationDate)}
                    </Text>
                    <XStack>
                      <Button
                        title={t("selectDate")}
                        onPress={() => setShowDatePicker(true)}
                      />
                      {expirationDate && (
                        <Button
                          title={t("clear")}
                          onPress={() => setExpirationDate(null)}
                        />
                      )}
                    </XStack>
                  </XStack>
                  {showDatePicker && (
                    <DateTimePicker
                      value={expirationDate || new Date()}
                      mode="date"
                      display={Platform.OS === "ios" ? "inline" : "default"}
                      minimumDate={new Date()} // Prevent selecting dates before today
                      onChange={(event, date) => {
                        setShowDatePicker(Platform.OS === "ios"); // Keep picker open on iOS
                        if (date) {
                          setExpirationDate(date);
                        }
                      }}
                    />
                  )}
                </YStack>
              </ScrollView>
              <XStack jc="space-between" w="100%" mt="$2" bottom={-50}>
                <Button
                  title={t("prevStep")}
                  onPress={() => setActiveTab("basic")}
                />
                <Button
                  title={t("cancel")}
                  onPress={() => {
                    setNewTypeName("");
                    setSelectedIcon("event");
                    setSelectedColor("#000000");
                    setAvailability(0);
                    setSelectedOwnerId(
                      users.filter((u) => u.role_id === 3)[0]?.id || null
                    );
                    setNewFaceValue("1");
                    setAddTypeModalVisible(false);
                    setIsEditingEventType(false);
                    setActiveTab("basic");
                    setFilterIcon("");
                  }}
                />
                <Button
                  title={isEditingEventType ? t("update") : t("add")}
                  onPress={handleSubmitEventType}
                  disabled={!newTypeName.trim() || !selectedOwnerId}
                />
              </XStack>
            </YStack>
          )}
        </ModalContainer>

        {/* VerifyCode Modal */}
        <ModalContainer
          visible={verifyCodeModalVisible}
          onClose={() => {
            setVerifyCodeModalVisible(false);
            setInputCode("");
            setPendingEditUser(null);
            setSelectedUser(null);
            setIsAddingEventType(false);
            setIsDeletingEventType(false);
            setIsEditingEventType(false);
          }}
        >
          <Text {...modalTitleProps}>
            {isDeletingEventType
              ? t("verifyAdminForDeleteEventType")
              : isEditingEventType
              ? t("verifyAdminForUpdateEventType")
              : pendingEditUser
              ? t("verifyAdminForEdit")
              : isAddingEventType
              ? t("verifyAdminForAddEventType")
              : t("enterVerificationCode")}
          </Text>
          <StyledInput
            placeholder={t("codePlaceholder")}
            value={inputCode}
            onChangeText={handleCodeInputChange}
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
            autoFocus
          />
          <XStack jc="space-between" w="100%" mt="$2">
            <Button
              title={t("cancel")}
              onPress={() => {
                setVerifyCodeModalVisible(false);
                setInputCode("");
                setPendingEditUser(null);
                setSelectedUser(null);
                setIsAddingEventType(false);
                setIsDeletingEventType(false);
                setIsEditingEventType(false);
              }}
            />
            <Button
              title={t("verify")}
              onPress={
                switchUserModalVisible && !isEditingUsers
                  ? handleVerifySwitchUser
                  : handleVerifyCode
              }
              disabled={inputCode.trim() === ""}
            />
          </XStack>
        </ModalContainer>

        {/* UserProfile Modal */}
        <ModalContainer
          visible={
            userProfileModalVisible &&
            !switchUserModalVisible &&
            !editUserModalVisible &&
            !contactModalVisible &&
            !changeCodeModalVisible
          }
          onClose={() => setUserProfileModalVisible(false)}
        >
          <YStack maxHeight="90%" ai="center" mt="$3">
            {currentUser.icon ? (
              <Image
                source={{
                  uri: `${resolvePhotoUri(currentUser.icon)}?t=${cacheBuster}`,
                }}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  marginBottom: 10,
                }}
              />
            ) : (
              <MaterialIcons name="person" size={100} color={theme.icon.val} />
            )}
            <Text {...modalTitleProps}>{currentUser.name}</Text>
            {wallet ? (
              <Text fontSize="$4" color="$text" mb="$2">
                {t("assets")}: {wallet.assets} | {t("credit")}: {wallet.credit}
              </Text>
            ) : null}
            {currentUser.name === "Guest" ? (
              <XStack jc="center">
                <CustomButton
                  title={t("login")}
                  onPress={() => {
                    setSwitchUserModalVisible(true);
                    setUserProfileModalVisible(false);
                  }}
                />
              </XStack>
            ) : (
              <ScrollView>
                <YStack w="100%" mt="$2">
                  <CustomButton
                    title={t("changeIcon")}
                    onPress={() => currentUser && handleChangeIcon(currentUser)}
                  />
                  <CustomButton
                    title={t("switchUser")}
                    onPress={() => {
                      setIsEditingUsers(false);
                      setSwitchUserModalVisible(true);
                    }}
                  />
                  <CustomButton
                    title={t("modifyPassword")}
                    onPress={() => setChangeCodeModalVisible(true)}
                  />
                  <CustomButton
                    title={t("contactInfo")}
                    onPress={() => setContactModalVisible(true)}
                  />
                  {currentUser.role_id === 1 && (
                    <>
                      <CustomButton
                        title={t("createUser")}
                        onPress={() => setEditUserModalVisible(true)}
                      />
                      <CustomButton
                        title={t("editUser")}
                        onPress={() => {
                          setIsEditingUsers(true);
                          setSwitchUserModalVisible(true);
                        }}
                      />
                    </>
                  )}
                </YStack>
              </ScrollView>
            )}
          </YStack>
        </ModalContainer>

        {/* ChangeCode Modal */}
        <ModalContainer
          visible={changeCodeModalVisible}
          onClose={() => setChangeCodeModalVisible(false)}
        >
          <ChangeCode
            onCodeChanged={() => {
              setChangeCodeModalVisible(false);
              setUserProfileModalVisible(false);
            }}
            onCancel={() => setChangeCodeModalVisible(false)}
          />
        </ModalContainer>

        {/* SwitchUser Modal */}
        <ModalContainer
          visible={switchUserModalVisible && !selectedUser && !pendingEditUser}
          onClose={() => {
            setSwitchUserModalVisible(false);
            setIsEditingUsers(false);
          }}
        >
          <Text {...modalTitleProps}>{t("userList")}</Text>
          <FlatList
            data={
              currentUser.role_id !== 2 && !isEditingUsers
                ? users
                : users.filter((u) => u.name !== "Guest")
            }
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id.toString()}
          />
        </ModalContainer>

        {/* Create User Modal */}
        <ModalContainer
          visible={editUserModalVisible && !selectedUser}
          onClose={() => setEditUserModalVisible(false)}
        >
          <Text {...modalTitleProps}>{t("createUser")}</Text>
          <StyledInput
            placeholder={t("namePlaceholder")}
            value={newUserName}
            onChangeText={setNewUserName}
            autoFocus
          />
          <Text {...iconLabelProps}>{t("selectUserRolePrompt")}</Text>
          <PickerField
            selectedValue={newUserRoleId}
            onValueChange={setNewUserRoleId}
            items={[
              { label: "User", value: 3 },
              { label: "Admin", value: 1 },
            ]}
          />
          <Text {...iconLabelProps}>{t("initialPassword")}</Text>
          <StyledInput
            placeholder={t("passwordPlaceholder")}
            value={newUserPassword}
            onChangeText={(text) => {
              if (text.match(/^\d*$/)) {
                setNewUserPassword(text);
              }
            }}
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
          />
          <CustomButton
            title={t("create")}
            onPress={handleCreateUser}
            disabled={!newUserName.trim() || !newUserPassword.match(/^\d{4}$/)}
          />
        </ModalContainer>

        {/* Edit User Modal */}
        <ModalContainer
          visible={editUserModalVisible && !!selectedUser}
          onClose={() => {
            setEditUserModalVisible(false);
            setSelectedUser(null);
          }}
        >
          <Text {...modalTitleProps}>{t("editUser")}</Text>
          <Text {...modalTitleProps}>{selectedUser?.name}</Text>
          {selectedUser?.icon ? (
            <Image
              source={{
                uri: `${resolvePhotoUri(selectedUser.icon)}?t=${cacheBuster}`,
              }}
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                marginBottom: 10,
              }}
            />
          ) : (
            <MaterialIcons name="person" size={100} color={theme.icon.val} />
          )}
          <CustomButton
            title={t("changeIcon")}
            onPress={() => selectedUser && handleChangeIcon(selectedUser)}
          />
          <CustomButton
            title={t("resetPassword")}
            onPress={handleResetPassword}
          />
          <CustomButton title={t("deleteUser")} onPress={handleDeleteUser} />
        </ModalContainer>

        {/* Backup Data Modal */}
        <ModalContainer
          visible={backupModalVisible}
          onClose={() => setBackupModalVisible(false)}
        >
          <YStack jc="center">
            <BackupData onClose={() => setBackupModalVisible(false)} />
          </YStack>
        </ModalContainer>

        {/* Restore Data Modal */}
        <ModalContainer
          visible={restoreModalVisible}
          onClose={() => setRestoreModalVisible(false)}
        >
          <RestoreData onClose={() => setRestoreModalVisible(false)} />
        </ModalContainer>

        {/* Contact Info Modal */}
        <ModalContainer
          visible={contactModalVisible}
          onClose={() => {
            setContactModalVisible(false);
            setIsEditingContact(false);
            setEmail(currentUser?.email || "");
            setPhone(currentUser?.phone || "");
          }}
        >
          <Text {...modalTitleProps}>{t("contactInfo")}</Text>
          <StyledInput
            value={email}
            onChangeText={setEmail}
            placeholder={t("emailPlaceholder")}
            editable={isEditingContact}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <StyledInput
            value={phone}
            onChangeText={setPhone}
            placeholder={t("phonePlaceholder")}
            editable={isEditingContact}
            keyboardType="phone-pad"
          />
          <YStack w="100%" mt="$2">
            {isEditingContact ? (
              <>
                <Button
                  title={t("cancel")}
                  onPress={() => {
                    setIsEditingContact(false);
                    setEmail(currentUser?.email || "");
                    setPhone(currentUser?.phone || "");
                  }}
                />
                <Button
                  title={t("save")}
                  onPress={async () => {
                    if (!currentUser) return;
                    try {
                      await updateUserContact(currentUser.id, email, phone);
                      const updatedUser = { ...currentUser, email, phone };
                      setCurrentUser(updatedUser);
                      setUsers(
                        users.map((u) =>
                          u.id === currentUser.id ? updatedUser : u
                        )
                      );
                      setPlaintUsers(
                        users
                          .filter((u) => u.role_id === 3)
                          .map((u) =>
                            u.id === currentUser.id ? updatedUser : u
                          )
                      );
                      setIsEditingContact(false);
                      Alert.alert(t("success"), t("contactUpdated"));
                    } catch (error) {
                      Alert.alert(
                        "Error",
                        `${t("errorUpdateContact")}: ${error}`
                      );
                    }
                  }}
                />
              </>
            ) : (
              <CustomButton
                title={t("edit")}
                onPress={() => setIsEditingContact(true)}
              />
            )}
          </YStack>
        </ModalContainer>
      </SafeAreaView>
    );
};

export default HomeScreen;
