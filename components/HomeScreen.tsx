import React, { useState, useEffect } from "react";
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
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { RootStackParamList, EventType, VerificationCode } from "../types";
import { getEventTypes, insertEventType, initDatabase } from "../db/database";
import ChangeCode from "./ChangeCode";
import CodeSetup from "./CodeSetup";
import { useLanguage } from "../LanguageContext"; // Import LanguageContext
import { LocaleConfig } from "react-native-calendars";
import { availableColors, availableIcons } from "../icons";

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Home"
>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { language, setLanguage, t } = useLanguage(); // Use LanguageContext
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [newTypeName, setNewTypeName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<string>("event");
  const [selectedColor, setSelectedColor] = useState<string>("#000000");
  const [availability, setAvailability] = useState<number>(0);
  const [codeState, setCodeState] = useState<VerificationCode>({
    isSet: false,
    code: null,
  });
  const [changeCodeModalVisible, setChangeCodeModalVisible] = useState(false);
  const [addTypeModalVisible, setAddTypeModalVisible] = useState(false);
  const [verifyCodeModalVisible, setVerifyCodeModalVisible] = useState(false);
  const [inputCode, setInputCode] = useState("");

  // Load event types and code state
  useEffect(() => {
    const loadData = async () => {
      try {
        await initDatabase();
        const types = await getEventTypes();
        setEventTypes(types);
        const isCodeSet = await AsyncStorage.getItem("isCodeSet");
        const storedCode = await AsyncStorage.getItem("verificationCode");
        if (isCodeSet === "true" && storedCode) {
          setCodeState({ isSet: true, code: storedCode });
        }
      } catch (error) {
        console.error("Initialization error:", error);
        Alert.alert("Error", "Failed to initialize app.");
      }
    };

    loadData();

    const unsubscribe = navigation.addListener("focus", loadData);
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    LocaleConfig.defaultLocale = language;
  }, [language]);

  const handleAddEventType = async () => {
    setVerifyCodeModalVisible(true);
  };

  const handleVerifyCode = async () => {
    if (inputCode === codeState.code) {
      try {
        await insertEventType(
          newTypeName,
          selectedIcon,
          selectedColor,
          availability
        );
        const updatedTypes = await getEventTypes();
        setEventTypes(updatedTypes);
        setNewTypeName("");
        setSelectedIcon("event");
        setSelectedColor("#000000");
        setAvailability(0);
        setAddTypeModalVisible(false);
        setVerifyCodeModalVisible(false);
        setInputCode("");
      } catch (error: any) {
        Alert.alert("Error", `${t("errorAddEventType")}: ${error.message}`);
      }
    } else {
      Alert.alert("Error", t("errorIncorrectCode"));
      setInputCode("");
    }
  };

  const handleCodeChanged = async () => {
    try {
      const newCode = await AsyncStorage.getItem("verificationCode");
      setCodeState((prev) => ({ ...prev, code: newCode }));
      setChangeCodeModalVisible(false);
    } catch (error) {
      console.error("Error updating code state:", error);
      Alert.alert("Error", "Failed to update code state.");
    }
  };

  const handleCodeInputChange = (text: string) => {
    if (text.match(/^\d*$/)) {
      setInputCode(text);
    }
  };

  const renderEventType = ({ item }: { item: EventType }) => (
    <TouchableOpacity
      style={styles.typeItem}
      onPress={() =>
        navigation.navigate("Calendar", {
          eventType: item.name,
          icon: item.icon,
          iconColor: item.iconColor,
        })
      }
    >
      <MaterialIcons
        name={item.icon}
        size={20}
        color={item.iconColor || "#000000"}
        style={styles.icon}
      />
      <Text style={styles.typeText}>{item.name}</Text>
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

  const CustomButton = ({
    title,
    onPress,
    disabled,
  }: {
    title: string;
    onPress: () => void;
    disabled?: boolean;
  }) => (
    <View style={styles.customButtonContainer}>
      <Button
        title={title}
        onPress={onPress}
        color="#6A5ACD"
        disabled={disabled}
      />
    </View>
  );

  if (!codeState.isSet) {
    return (
      <CodeSetup onCodeSet={(newCode: string) => setCodeState({ isSet: true, code: newCode })} />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("title")}</Text>
      <Text style={styles.subtitle}>{t("achievements")}</Text>
      <FlatList
        data={eventTypes}
        renderItem={renderEventType}
        keyExtractor={(item) => item.name}
        ListEmptyComponent={<Text>{t("noEventTypes")}</Text>}
      />
      <CustomButton
        title={t("viewAllStickers")}
        onPress={() => navigation.navigate("CalendarViewAll")}
      />
      <CustomButton
        title={t("newAchievementType")}
        onPress={() => setAddTypeModalVisible(true)}
      />
      <CustomButton
        title={t("changeCode")}
        onPress={() => setChangeCodeModalVisible(true)}
      />
      {/* Language Switcher */}
      <CustomButton
        title={language === "en" ? "切换到中文" : "Switch to English"}
        onPress={() => setLanguage(language === "en" ? "zh" : "en")}
      />
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
              {availableIcons.map(renderIconOption)}
            </ScrollView>
            <Text style={styles.iconLabel}>{t("selectColor")}</Text>
            <ScrollView horizontal style={styles.colorPicker}>
              {availableColors.map(renderColorOption)}
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
            <View style={styles.buttonContainer}>
              <Button
                title={t("cancel")}
                onPress={() => {
                  setNewTypeName("");
                  setSelectedIcon("event");
                  setSelectedColor("#000000");
                  setAvailability(0);
                  setAddTypeModalVisible(false);
                }}
              />
              <Button
                title={t("add")}
                onPress={handleAddEventType}
                disabled={newTypeName.trim() === ""}
              />
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={verifyCodeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVerifyCodeModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("enterVerificationCode")}</Text>
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
            <View style={styles.buttonContainer}>
              <Button
                title={t("cancel")}
                onPress={() => {
                  setVerifyCodeModalVisible(false);
                  setInputCode("");
                }}
              />
              <Button
                title={t("verify")}
                onPress={handleVerifyCode}
                disabled={inputCode.trim() === ""}
              />
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={changeCodeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setChangeCodeModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <ChangeCode
            currentCode={codeState.code || ""}
            onCodeChanged={handleCodeChanged}
            onCancel={() => setChangeCodeModalVisible(false)}
          />
        </View>
      </Modal>
    </View>
  );
};

// Update styles to include language switcher
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
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
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  picker: {
    width: "100%",
    marginBottom: 10,
  },
  customButtonContainer: {
    width: "66.67%",
    alignSelf: "center",
    marginVertical: 10,
  },
});

export default HomeScreen;
