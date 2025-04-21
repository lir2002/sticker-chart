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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList, EventType, VerificationCode } from "../types";
import { getEventTypes, addEventType, initDatabase } from "../db/database";
import ChangeCode from "./ChangeCode";
import CodeSetup from "./CodeSetup";

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "Home">;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [newTypeName, setNewTypeName] = useState("");
  const [codeState, setCodeState] = useState<VerificationCode>({ isSet: false, code: null });
  const [changeCodeModalVisible, setChangeCodeModalVisible] = useState(false);

  // Initialize database, event types, and code state
  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize database first
        await initDatabase();
        // Load event types
        const types = await getEventTypes();
        setEventTypes(types);
        // Check verification code
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
      await addEventType(newTypeName);
      const updatedTypes = await getEventTypes();
      setEventTypes(updatedTypes);
      setNewTypeName("");
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
      <Text style={styles.typeText}>{item.name}</Text>
    </TouchableOpacity>
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
      <TextInput
        style={styles.input}
        placeholder="New event type (max 20 chars)"
        maxLength={20}
        value={newTypeName}
        onChangeText={setNewTypeName}
      />
      <Button title="Add Event Type" onPress={handleAddEventType} />
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
  },
  typeItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
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
});

export default HomeScreen;