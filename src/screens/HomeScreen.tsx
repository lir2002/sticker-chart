import React, { useState, useEffect, useContext } from "react";
import {
  Alert,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  Button,
  Dimensions,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import * as ImagePicker from "expo-image-picker";
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
  hasEventsForEventType, // New
  deleteEventType, // New
  updateEventType, // New
} from "../db/database";
import CodeSetup from "../components/CodeSetup";
import ChangeCode from "../components/ChangeCode";
import { useLanguage } from "../contexts/LanguageContext";
import LocaleConfig from "../config/calendarConfig";
import { availableColors, availableIcons } from "../icons";
import { UserContext } from "../contexts/UserContext";
import { CustomButton, StyledInput } from "../components/SharedComponents";
import BackupData from "../components/BackupData";
import RestoreData from "../components/RestoreData";
import { YStack, XStack, Text, useTheme } from "tamagui";
import { processUserIcon, resolvePhotoUri } from "../utils/fileUtils";

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Home"
>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

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

const PickerField: React.FC<{
  selectedValue: any;
  onValueChange: (value: any) => void;
  items: { label: string; value: any }[];
  enabled?: boolean;
}> = ({ selectedValue, onValueChange, items, enabled }) => (
  <Picker
    selectedValue={selectedValue}
    onValueChange={onValueChange}
    style={{ width: "100%", marginBottom: 10 }}
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
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
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
  const [contextMenuVisible, setContextMenuVisible] = useState(false); // New
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(
    null
  ); // New
  const [isEditingEventType, setIsEditingEventType] = useState(false); // New
  const [isDeletingEventType, setIsDeletingEventType] = useState(false); // New

  const modalTitleProps = {
    fontSize: "$4",
    fontWeight: "bold",
    mb: "$2",
    color: "$text",
  };

  const iconLabelProps = {
    fontSize: "$3",
    my: "$2",
    alignSelf: "flex-start" as const,
    color: "$text",
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
    try {
      if (isEditingEventType && selectedEventType) {
        await updateEventType(
          selectedEventType.name,
          selectedEventType.owner!,
          selectedIcon,
          selectedColor,
          availability,
          newTypeName,
          selectedOwnerId,
          parseInt(newFaceValue)
        );
      } else {
        await insertEventType(
          newTypeName,
          selectedIcon,
          selectedColor,
          availability,
          selectedOwnerId,
          parseInt(newFaceValue)
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
      setAddTypeModalVisible(false);
      setIsEditingEventType(false);
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
      const hasEvents = await hasEventsForEventType(
        selectedEventType.name,
        selectedEventType.owner
      );
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
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
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

        setCacheBuster(Date.now());
      } catch (error: any) {
        console.error("Error updating icon:", error);
        Alert.alert("Error", `${t("errorUpdateIcon")}: ${error.message}`);
      }
    }
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
      Alert.alert("Error", t("errorResetPassword"));
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
      if (currentUser?.id === selectedUser.id) {
        const guestUser = await getUserByName("Guest");
        if (guestUser) setCurrentUser(guestUser);
      }
      setEditUserModalVisible(false);
      setSelectedUser(null);
    } catch (error) {
      Alert.alert("Error", t("errorDeleteUser"));
    }
  };

  const renderEventType = ({ item }: { item: EventType }) => (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate("Calendar", {
          eventType: item.name,
          owner: item.owner,
          icon: item.icon,
          iconColor: item.iconColor,
        })
      }
      onLongPress={() => handleLongPressEventType(item)}
      delayLongPress={2000} // 2 seconds
      style={{ margin: 5 }}
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
            {item.weight}
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
            Alert.alert("Error", t("errorSetPassword"));
          }
        }}
      />
    );
  }

  const screenWidth = Dimensions.get("window").width;
  const numColumns = Math.floor(screenWidth / 80);
  const iconItemWidth = 80; // Approximate width per icon (including padding)
  const nCols = Math.floor((screenWidth * 0.8) / iconItemWidth);

  if (currentUser)
    return (
      <YStack f={1} p="$4" bg="$background">
        <XStack jc="space-between" ai="center" mb="$4">
          <Text fontSize="$5" fontWeight="bold" color="$text">
            {t("title")}
          </Text>
          <TouchableOpacity onPress={() => setUserProfileModalVisible(true)}>
            {currentUser.icon ? (
              <Image
                source={{
                  uri: `${resolvePhotoUri(currentUser.icon)}?t=${cacheBuster}`,
                }}
                style={{ width: 30, height: 30, borderRadius: 15 }}
              />
            ) : (
              <MaterialIcons name="person" size={30} color={theme.icon.val} />
            )}
          </TouchableOpacity>
        </XStack>
        <Text fontSize="$5" fontWeight="bold" mt="$4" mb="$2" color="$text">
          {t("achievements")}
        </Text>
        <FlatList
          data={eventTypes}
          renderItem={renderEventType}
          keyExtractor={(item) => `${item.name}-${item.owner || "null"}`}
          numColumns={numColumns || 4}
          contentContainerStyle={{
            paddingBottom: 8,
            alignItems: "flex-start",
          }}
          ListEmptyComponent={
            <Text fontSize="$4" color="$gray" textAlign="center" mt="$4">
              {t("noEventTypes")}
            </Text>
          }
        />
        <CustomButton
          title={t("viewAllStickers")}
          onPress={() => navigation.navigate("CalendarViewAll")}
        />
        {currentUser.role_id === 1 && (
          <>
            <CustomButton
              title={t("newAchievementType")}
              onPress={handleAddEventType}
            />
            <CustomButton
              title={t("backupData")}
              onPress={() => setBackupModalVisible(true)}
            />
            <CustomButton
              title={t("restoreData")}
              onPress={() => setRestoreModalVisible(true)}
            />
          </>
        )}
        <CustomButton
          title={language === "en" ? "切换到中文" : "Switch to English"}
          onPress={() => setLanguage(language === "en" ? "zh" : "en")}
        />

        {/* Context Menu Modal */}
        <ModalContainer
          visible={contextMenuVisible}
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
            setAddTypeModalVisible(false);
            setIsEditingEventType(false);
          }}
        >
          <Text {...modalTitleProps}>
            {isEditingEventType ? t("updateEventType") : t("addNewEventType")}
          </Text>
          <StyledInput
            editable={!isEditingEventType}
            placeholder={t("namePlaceholder")}
            value={newTypeName}
            onChangeText={setNewTypeName}
            maxLength={20}
            autoFocus={!isEditingEventType}
          />
          <Text {...iconLabelProps}>{t("selectIcon")}</Text>
          <FlatList
            data={availableIcons}
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
                  <MaterialIcons name={icon} size={40} color={selectedColor} />
                </TouchableOpacity>
              </YStack>
            )}
            keyExtractor={(icon) => icon}
            numColumns={nCols || 4} // Fallback to 4 columns if calculation fails
            contentContainerStyle={{ paddingBottom: 10 }}
            style={{ maxHeight: 200 }} // Limit height to prevent modal overflow
          />
          <Text {...iconLabelProps}>{t("selectColor")}</Text>
          <ScrollView horizontal style={{ flexGrow: 0, marginBottom: 10 }}>
            {availableColors.map((color) => (
              <YStack
                key={color}
                w={30}
                h={30}
                br="$10"
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
          <Text {...iconLabelProps}>{t("selectAvailability")}</Text>
          <PickerField
            selectedValue={availability}
            onValueChange={setAvailability}
            items={Array.from({ length: 101 }, (_, i) => ({
              label: `${i}`,
              value: i,
            }))}
          />
          <Text {...iconLabelProps}>{t("faceValue")}</Text>
          <PickerField
            enabled={!isEditingEventType}
            selectedValue={newFaceValue}
            onValueChange={setNewFaceValue}
            items={[1, 2, 3, 4, 5].map((value) => ({
              label: value.toString(),
              value: value.toString(),
            }))}
          />
          <Text {...iconLabelProps}>{t("selectOwner")}</Text>
          <PickerField
            selectedValue={selectedOwnerId}
            onValueChange={setSelectedOwnerId}
            items={
              users.filter((u) => u.role_id === 3).length > 0
                ? users
                    .filter((u) => u.role_id === 3)
                    .map((user) => ({ label: user.name, value: user.id }))
                : [{ label: t("noOrdinaryUsers"), value: null }]
            }
            enabled={
              !isEditingEventType &&
              users.filter((u) => u.role_id === 3).length > 0
            }
          />
          <XStack jc="space-between" w="100%" mt="$2">
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
              }}
            />
            <Button
              title={isEditingEventType ? t("update") : t("add")}
              onPress={handleSubmitEventType}
              disabled={!newTypeName.trim() || !selectedOwnerId}
            />
          </XStack>
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
          visible={userProfileModalVisible}
          onClose={() => setUserProfileModalVisible(false)}
        >
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
            <CustomButton
              title={t("login")}
              onPress={() => setSwitchUserModalVisible(true)}
            />
          ) : (
            <YStack w="100%" mt="$2">
              <CustomButton
                title={t("transactionHistory")}
                onPress={() => {
                  setUserProfileModalVisible(false);
                  navigation.navigate("TransactionHistory", {
                    userId: currentUser.id,
                  });
                }}
              />
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
          )}
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
          visible={switchUserModalVisible}
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
          <BackupData onClose={() => setBackupModalVisible(false)} />
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
                      setIsEditingContact(false);
                      Alert.alert(t("success"), t("contactUpdated"));
                    } catch (error) {
                      Alert.alert("Error", t("errorUpdateContact"));
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
      </YStack>
    );
};

export default HomeScreen;
