import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import * as ImagePicker from "expo-image-picker";
import { RootStackParamList, EventType, User } from "../types";
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
} from "../db/database";
import CodeSetup from "./CodeSetup";
import ChangeCode from "./ChangeCode";
import { useLanguage } from "../LanguageContext";
import { LocaleConfig } from "react-native-calendars";
import { availableColors, availableIcons } from "../icons";
import { UserContext } from "../UserContext";
import { CustomButton } from "./SharedComponents";
import BackupData from "./BackupData";
import RestoreData from "./RestoreData";

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Home"
>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
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
  const [newUserRoleId, setNewUserRoleId] = useState<number>(3); // Default to User
  const [isAddingEventType, setIsAddingEventType] = useState(false);
  const [newUserPassword, setNewUserPassword] = useState<string>("0000");
  const [newFaceValue, setNewFaceValue] = useState("1"); // Default face value
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);

  // Initialize database and user state
  useEffect(() => {
    const initialize = async () => {
      try {
        const needsPasswordSetup = await forceAdminPasswordSetup();
        console.log("Current user:", currentUser?.name);
        if (needsPasswordSetup) {
          // Admin password not set, show CodeSetup
          setCurrentUser(null);
        } else if (!currentUser) {
          // Only set Guest if no user is currently set
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

  // Reset selectedOwnerId when users change
  useEffect(() => {
    const ordinaryUsers = users.filter((u) => u.role_id === 3);
    if (ordinaryUsers.length > 0 && !selectedOwnerId) {
      setSelectedOwnerId(ordinaryUsers[0].id); // Default to first ordinary user
    } else if (ordinaryUsers.length === 0) {
      setSelectedOwnerId(null);
    }
  }, [users, selectedOwnerId]);

  // Handle adding new event type (admin only)
  const handleAddEventType = async () => {
    if (!currentUser || currentUser.role_id !== 1) {
      Alert.alert("Error", t("adminOnly"));
      return;
    }
    setIsAddingEventType(true);
    setVerifyCodeModalVisible(true);
  };

  // Handle submitting event type from AddType Modal
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
      await insertEventType(
        newTypeName,
        selectedIcon,
        selectedColor,
        availability,
        selectedOwnerId,
        1
      );
      const updatedTypes = await getEventTypesWithOwner();
      setEventTypes(updatedTypes);
      setNewTypeName("");
      setSelectedIcon("event");
      setSelectedColor("#000000");
      setAvailability(0);
      setSelectedOwnerId(users.filter((u) => u.role_id === 3)[0]?.id || null);
      setAddTypeModalVisible(false);
      Alert.alert(t("success"), t("successAddEventType"));
    } catch (error: any) {
      Alert.alert("Error", `${t("errorAddEventType")}: ${error.message}`);
    }
  };

  // Verify admin password for adding event type or editing user
  const handleVerifyCode = async () => {
    if (!currentUser) return;
    const isValid = await verifyUserCode(currentUser.id, inputCode);
    if (isValid) {
      if (isAddingEventType) {
        setAddTypeModalVisible(true);
        setIsAddingEventType(false);
      } else if (pendingEditUser) {
        await handleVerifyEditUser();
      }
      setVerifyCodeModalVisible(false);
      setInputCode("");
    } else {
      Alert.alert("Error", t("invalidPassword"));
      setInputCode("");
    }
  };

  // Handle code input for verification
  const handleCodeInputChange = (text: string) => {
    if (text.match(/^\d*$/)) {
      setInputCode(text);
    }
  };

  // Handle user icon selection
  const handleChangeIcon = async () => {
    if (!currentUser) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Error", t("selectImagePermission"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets[0].uri) {
      try {
        await updateUserIcon(currentUser.id, result.assets[0].uri);
        const updatedUser = { ...currentUser, icon: result.assets[0].uri };
        setCurrentUser(updatedUser);
        const updatedUsers = users.map((u) =>
          u.id === currentUser.id ? updatedUser : u
        );
        setUsers(updatedUsers);
      } catch (error) {
        Alert.alert("Error", t("errorUpdateIcon"));
      }
    }
  };

  // Handle switching user
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

  // Verify password for switching user
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

  // Handle creating new user (admin only)
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
        setNewUserPassword("0000"); // Reset to default
        setEditUserModalVisible(false);
        Alert.alert(t("success"), t("successCreateUser"));
      }
    } catch (error) {
      Alert.alert("Error", t("errorCreateUser"));
    }
  };

  // Handle initiating user edit with password verification
  const handleEditUser = (user: User) => {
    if (!currentUser || currentUser.role_id !== 1) {
      Alert.alert("Error", t("adminOnly"));
      return;
    }
    setPendingEditUser(user); // Store user to edit
    setVerifyCodeModalVisible(true); // Prompt for admin password
  };

  // Verify admin password for editing user
  const handleVerifyEditUser = async () => {
    if (!currentUser || !pendingEditUser) return;
    const isValid = await verifyUserCode(currentUser.id, inputCode);
    if (isValid) {
      setSelectedUser(pendingEditUser);
      setEditUserModalVisible(true);
      setVerifyCodeModalVisible(false);
      setInputCode("");
      setPendingEditUser(null);
      setSwitchUserModalVisible(false);
    } else {
      Alert.alert("Error", t("invalidPassword"));
      setInputCode("");
    }
  };

  // Handle resetting user password
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

  // Handle deleting user
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
      style={styles.eventTypeItem}
      onPress={() =>
        navigation.navigate("Calendar", {
          eventType: item.name,
          icon: item.icon,
          iconColor: item.iconColor,
        })
      }
    >
      <View style={styles.leftContainer}>
        <MaterialIcons
          name={item.icon}
          size={24}
          color={item.iconColor}
          style={styles.icon}
        />
        <Text style={styles.weightText}>{item.weight}</Text>
        <Text style={styles.eventTypeText}>{item.name}</Text>
      </View>
      <Text style={styles.ownerText}>{item.ownerName ?? t("unknown")}</Text>
    </TouchableOpacity>
  );

  const renderIconOption = (icon: string) => (
    <TouchableOpacity
      key={icon}
      style={[
        styles.iconOption,
        selectedIcon === icon && styles.selectedIconOption,
      ]}
      onPress={() => setSelectedIcon(icon)}
    >
      <MaterialIcons name={icon} size={24} color={selectedColor} />
    </TouchableOpacity>
  );

  const renderColorOption = (color: string) => (
    <TouchableOpacity
      key={color}
      style={[
        styles.colorOption,
        { backgroundColor: color },
        selectedColor === color && styles.selectedColorOption,
      ]}
      onPress={() => setSelectedColor(color)}
    />
  );

  if (!currentUser) {
    return (
      <CodeSetup
        onCodeSet={async (newCode: string) => {
          try {
            const adminUser = await getUserByName("Admin");
            if (adminUser) {
              await updateUserCode(adminUser.id, newCode);
              setCurrentUser(adminUser);
            }
          } catch (error) {
            Alert.alert("Error", t("errorSetPassword"));
          }
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("title")}</Text>
        <TouchableOpacity onPress={() => setUserProfileModalVisible(true)}>
          {currentUser.icon ? (
            <Image source={{ uri: currentUser.icon }} style={styles.userIcon} />
          ) : (
            <MaterialIcons name="person" size={30} color="#000" />
          )}
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>{t("achievements")}</Text>
      <FlatList
        data={eventTypes}
        renderItem={renderEventType}
        keyExtractor={(item) => item.name}
        ListEmptyComponent={<Text>{t("noEventTypes")}</Text>}
      />
      <CustomButton
        title={t("viewAllStickers")}
        onPress={() => {
          console.log(
            "Navigating to CalendarViewAll, currentUser:",
            currentUser?.name
          );
          navigation.navigate("CalendarViewAll");
        }}
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
      {/* AddType Modal */}
      <Modal
        visible={addTypeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddTypeModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("addNewEventType")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("namePlaceholder")}
              maxLength={20}
              value={newTypeName}
              onChangeText={setNewTypeName}
              autoFocus
            />
            <Text style={styles.iconLabel}>{t("selectIcon")}</Text>
            <ScrollView horizontal style={styles.iconPicker}>
              {availableIcons.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconOption,
                    selectedIcon === icon && styles.selectedIconOption,
                  ]}
                  onPress={() => setSelectedIcon(icon)}
                >
                  <MaterialIcons name={icon} size={24} color={selectedColor} />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.iconLabel}>{t("selectColor")}</Text>
            <ScrollView horizontal style={styles.colorPicker}>
              {availableColors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.selectedColorOption,
                  ]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </ScrollView>
            <Text style={styles.iconLabel}>{t("selectAvailability")}</Text>
            <Picker
              selectedValue={availability}
              onValueChange={(value) => setAvailability(value)}
              style={styles.picker}
            >
              {Array.from({ length: 101 }, (_, i) => (
                <Picker.Item key={i} label={`${i}`} value={i} />
              ))}
            </Picker>
            <Text style={styles.faceValueLabel}>{t("faceValue")}</Text>
            <Picker
              selectedValue={newFaceValue}
              onValueChange={(value) => setNewFaceValue(value)}
              style={styles.picker}
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <Picker.Item
                  key={value}
                  label={value.toString()}
                  value={value.toString()}
                />
              ))}
            </Picker>
            <Text style={styles.iconLabel}>{t("selectOwner")}</Text>
            <Picker
              selectedValue={selectedOwnerId}
              onValueChange={(value) => setSelectedOwnerId(value)}
              style={styles.picker}
              enabled={users.filter((u) => u.role_id === 3).length > 0}
            >
              {users
                .filter((u) => u.role_id === 3)
                .map((user) => (
                  <Picker.Item
                    key={user.id}
                    label={user.name}
                    value={user.id}
                  />
                ))}
              {users.filter((u) => u.role_id === 3).length === 0 && (
                <Picker.Item label={t("noOrdinaryUsers")} value={null} />
              )}
            </Picker>
            <View style={styles.buttonContainerOk}>
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
                  setAddTypeModalVisible(false);
                }}
              />
              <Button
                title={t("add")}
                onPress={handleSubmitEventType}
                disabled={!newTypeName.trim() || !selectedOwnerId}
              />
            </View>
          </View>
        </View>
      </Modal>
      {/* VerifyCode Modal */}
      <Modal
        visible={verifyCodeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVerifyCodeModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {pendingEditUser
                ? t("verifyAdminForEdit")
                : isAddingEventType
                ? t("verifyAdminForAddEventType")
                : t("enterVerificationCode")}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={t("codePlaceholder")}
              keyboardType="numeric"
              maxLength={4}
              value={inputCode}
              onChangeText={handleCodeInputChange}
              secureTextEntry
              autoFocus
            />
            <View style={styles.buttonContainerOk}>
              <Button
                title={t("cancel")}
                onPress={() => {
                  setVerifyCodeModalVisible(false);
                  setInputCode("");
                  setPendingEditUser(null);
                  setSelectedUser(null);
                  setIsAddingEventType(false);
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
            </View>
          </View>
        </View>
      </Modal>
      {/* UserProfile Modal */}
      <Modal
        visible={userProfileModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setUserProfileModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setUserProfileModalVisible(false)}
            >
              <MaterialIcons name="close" size={24} color="#000" />
            </TouchableOpacity>
            {currentUser.icon ? (
              <Image
                source={{ uri: currentUser.icon }}
                style={styles.largeUserIcon}
              />
            ) : (
              <MaterialIcons name="person" size={100} color="#000" />
            )}
            <Text style={styles.modalTitle}>{currentUser.name}</Text>
            {currentUser.name === "Guest" ? (
              <Button
                title={t("login")}
                onPress={() => setSwitchUserModalVisible(true)}
              />
            ) : (
              <View style={styles.buttonContainer}>
                <CustomButton
                  title={t("changeIcon")}
                  onPress={handleChangeIcon}
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
              </View>
            )}
          </View>
        </View>
      </Modal>
      {/* ChangeCode Modal */}
      <Modal
        visible={changeCodeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setChangeCodeModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setChangeCodeModalVisible(false)}
          >
            <MaterialIcons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <ChangeCode
            onCodeChanged={() => {
              setChangeCodeModalVisible(false);
              setUserProfileModalVisible(false); // Optional: Close user profile modal
            }}
            onCancel={() => setChangeCodeModalVisible(false)}
          />
        </View>
      </Modal>
      {/* SwitchUser Modal */}
      <Modal
        visible={switchUserModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSwitchUserModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setSwitchUserModalVisible(false);
                setIsEditingUsers(false);
              }}
            >
              <MaterialIcons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t("userList")}</Text>
            <FlatList
              data={
                currentUser.role_id !== 2 && !isEditingUsers
                  ? users
                  : users.filter((u) => u.name !== "Guest")
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.typeItem}
                  onPress={() =>
                    isEditingUsers
                      ? handleEditUser(item)
                      : handleSwitchUser(item)
                  }
                >
                  <View style={styles.userItemContainer}>
                    {item.icon ? (
                      <Image
                        source={{ uri: item.icon }}
                        style={styles.userIcon}
                      />
                    ) : (
                      <MaterialIcons name="person" size={24} color="#000" />
                    )}
                    <Text style={styles.userNameText}>{item.name}</Text>
                  </View>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id.toString()}
            />
          </View>
        </View>
      </Modal>
      {/* Create User Modal */}
      <Modal
        visible={editUserModalVisible && !selectedUser}
        transparent
        animationType="slide"
        onRequestClose={() => setEditUserModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setEditUserModalVisible(false)}
            >
              <MaterialIcons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t("createUser")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("namePlaceholder")}
              value={newUserName}
              onChangeText={setNewUserName}
              autoFocus
            />
            <Text style={styles.iconLabel}>{t("selectUserRolePrompt")}</Text>
            <Picker
              selectedValue={newUserRoleId}
              onValueChange={(value) => setNewUserRoleId(value)}
              style={styles.picker}
            >
              <Picker.Item label="User" value={3} />
              <Picker.Item label="Admin" value={1} />
            </Picker>
            <Text style={styles.iconLabel}>{t("initialPassword")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("passwordPlaceholder")}
              keyboardType="numeric"
              maxLength={4}
              value={newUserPassword}
              onChangeText={(text) => {
                if (text.match(/^\d*$/)) {
                  setNewUserPassword(text);
                }
              }}
              secureTextEntry
            />
            <Button
              title={t("create")}
              onPress={handleCreateUser}
              disabled={
                !newUserName.trim() || !newUserPassword.match(/^\d{4}$/)
              }
            />
          </View>
        </View>
      </Modal>
      {/* Edit User Modal */}
      <Modal
        visible={editUserModalVisible && !!selectedUser}
        transparent
        animationType="slide"
        onRequestClose={() => setEditUserModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setEditUserModalVisible(false);
                setSelectedUser(null);
              }}
            >
              <MaterialIcons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t("editUser")}</Text>
            <Text style={styles.modalTitle}>{selectedUser?.name}</Text>
            {selectedUser?.icon ? (
              <Image
                source={{ uri: selectedUser.icon }}
                style={styles.largeUserIcon}
              />
            ) : (
              <MaterialIcons name="person" size={100} color="#000" />
            )}
            <CustomButton
              title={t("changeIcon")}
              onPress={async () => {
                const permission =
                  await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!permission.granted) {
                  Alert.alert("Error", t("selectImagePermission"));
                  return;
                }
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: true,
                  aspect: [1, 1],
                  quality: 1,
                });
                if (!result.canceled && result.assets[0].uri && selectedUser) {
                  try {
                    await updateUserIcon(selectedUser.id, result.assets[0].uri);
                    const updatedUser = {
                      ...selectedUser,
                      icon: result.assets[0].uri,
                    };
                    setSelectedUser(updatedUser);
                    setUsers(
                      users.map((u) =>
                        u.id === selectedUser.id ? updatedUser : u
                      )
                    );
                  } catch (error) {
                    Alert.alert("Error", t("errorUpdateIcon"));
                  }
                }
              }}
            />
            <CustomButton
              title={t("resetPassword")}
              onPress={handleResetPassword}
            />
            <CustomButton title={t("deleteUser")} onPress={handleDeleteUser} />
          </View>
        </View>
      </Modal>
      {/* Backup Data Modal */}
      <Modal
        visible={backupModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBackupModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setBackupModalVisible(false)}
            >
              <MaterialIcons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <BackupData onClose={() => setBackupModalVisible(false)} />
          </View>
        </View>
      </Modal>

      {/* Restore Data Modal */}
      <Modal
        visible={restoreModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRestoreModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setRestoreModalVisible(false)}
            >
              <MaterialIcons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <RestoreData onClose={() => setRestoreModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginVertical: 10,
    borderRadius: 5,
    fontSize: 16,
    width: "100%",
  },
  typeItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  icon: {
    marginRight: 10,
  },
  typeText: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "80%",
    alignItems: "center",
    position: "relative",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  iconLabel: {
    fontSize: 16,
    marginVertical: 10,
    alignSelf: "flex-start",
  },
  iconPicker: {
    flexGrow: 0,
    marginBottom: 10,
  },
  iconOption: {
    padding: 10,
  },
  selectedIconOption: {
    backgroundColor: "#e0f0ff",
    borderRadius: 5,
  },
  colorPicker: {
    flexGrow: 0,
    marginBottom: 10,
  },
  colorOption: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginHorizontal: 5,
  },
  selectedColorOption: {
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  buttonContainer: {
    width: "100%",
    marginTop: 10,
  },
  buttonContainerOk: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
  },
  picker: {
    width: "100%",
    marginBottom: 10,
  },
  faceValueLabel: {
    fontSize: 16,
    marginBottom: 5,
    alignSelf: "flex-start",
  },
  userIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  largeUserIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  eventTypeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  leftContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  weightText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007AFF",
    marginRight: 10,
  },
  eventTypeText: {
    fontSize: 16,
    color: "#333",
  },
  ownerText: {
    fontSize: 14,
    color: "#666",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 20,
  },
  userItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
  },
  userNameText: {
    fontSize: 16,
    marginLeft: 10,
  },
});

export default HomeScreen;
