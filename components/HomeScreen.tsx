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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { RootStackParamList, EventType, VerificationCode } from "../types";
import { getEventTypes, addEventType, initDatabase } from "../db/database";
import ChangeCode from "./ChangeCode";
import CodeSetup from "./CodeSetup";

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "Home">;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

// Predefined list of MaterialIcons for selection
const availableIcons = [
  "event",
  "star",
  "favorite",
  "work",
  "home",
  "school",
  "celebration",
  "sports",
  "flight",
  "restaurant",
  "music-note",
  "movie",
];

// Predefined list of colors for selection
const availableColors = [
  "#000000", // Black
  "#FF0000", // Red
  "#00FF00", // Green
  "#0000FF", // Blue
  "#FFA500", // Orange
  "#800080", // Purple
  "#FFC0CB", // Pink
];

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [newTypeName, setNewTypeName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<string>("event");
  const [selectedColor, setSelectedColor] = useState<string>("#000000");
  const [codeState, setCodeState] = useState<VerificationCode>({ isSet: false, code: null });
  const [changeCodeModalVisible, setChangeCodeModalVisible] = useState(false);
  const [addTypeModalVisible, setAddTypeModalVisible] = useState(false);

  // Initialize database, event types, and code state
  useEffect(() => {
    const initialize = async () => {
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
    initialize();
  }, []);

  const handleAddEventType = async () => {
    try {
      await addEventType(newTypeName, selectedIcon, selectedColor);
      const updatedTypes = await getEventTypes();
      setEventTypes(updatedTypes);
      setNewTypeName("");
      setSelectedIcon("event");
      setSelectedColor("#000000");
      setAddTypeModalVisible(false);
    } catch (error: any) {
      Alert.alert("Error", error.message);
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

  const renderEventType = ({ item }: { item: EventType }) => (
    <TouchableOpacity
      style={styles.typeItem}
      onPress={() => navigation.navigate("Calendar", { eventType: item.name })}
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
      <MaterialIcons
        name={icon}
        size={24}
        color={selectedColor}
      />
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

  if (!codeState.isSet) {
    return <CodeSetup onCodeSet={() => setCodeState({ isSet: true, code: null })} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Event Marker</Text>
      <Button
        title="Change Verification Code"
        onPress={() => setChangeCodeModalVisible(true)}
      />
      <Text style={styles.subtitle}>Event Types</Text>
      <FlatList
        data={eventTypes}
        renderItem={renderEventType}
        keyExtractor={(item) => item.name}
        ListEmptyComponent={<Text>No event types yet.</Text>}
      />
      <Button
        title="Add Event Type"
        onPress={() => setAddTypeModalVisible(true)}
      />
      {/* Modal for adding new event type */}
      <Modal
        visible={addTypeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddTypeModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Event Type</Text>
            <TextInput
              style={styles.input}
              placeholder="Name (max 20 chars, any visible)"
              maxLength={20}
              value={newTypeName}
              onChangeText={setNewTypeName}
              autoFocus
            />
            <Text style={styles.iconLabel}>Select Icon</Text>
            <ScrollView horizontal style={styles.iconPicker}>
              {availableIcons.map(renderIconOption)}
            </ScrollView>
            <Text style={styles.iconLabel}>Select Icon Color</Text>
            <ScrollView horizontal style={styles.colorPicker}>
              {availableColors.map(renderColorOption)}
            </ScrollView>
            <View style={styles.buttonContainer}>
              <Button
                title="Cancel"
                onPress={() => {
                  setNewTypeName("");
                  setSelectedIcon("event");
                  setSelectedColor("#000000");
                  setAddTypeModalVisible(false);
                }}
              />
              <Button
                title="Add"
                onPress={handleAddEventType}
                disabled={newTypeName.trim() === ""}
              />
            </View>
          </View>
        </View>
      </Modal>
      {/* Modal for changing verification code */}
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
});

export default HomeScreen;