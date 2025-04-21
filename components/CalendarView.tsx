import React, { useEffect, useState } from "react";
import { View, Text, Alert, StyleSheet, TextInput, Modal, Button } from "react-native";
import { Calendar } from "react-native-calendars";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Event, VerificationCode } from "../types";
import { initDatabase, insertEvent, fetchEvents } from "../db/database";
import CodeSetup from "./CodeSetup";
import ChangeCode from "./ChangeCode";

const CalendarView: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [markedDates, setMarkedDates] = useState<{ [key: string]: any }>({});
  const [codeState, setCodeState] = useState<VerificationCode>({ isSet: false, code: null });
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [changeCodeModalVisible, setChangeCodeModalVisible] = useState(false);
  const [inputCode, setInputCode] = useState("");
  const [pendingDate, setPendingDate] = useState<string | null>(null);

  // Initialize app
  useEffect(() => {
    const initialize = async () => {
      try {
        const isCodeSet = await AsyncStorage.getItem("isCodeSet");
        const storedCode = await AsyncStorage.getItem("verificationCode");
        if (isCodeSet === "true" && storedCode) {
          setCodeState({ isSet: true, code: storedCode });
        }
        await initDatabase();
        const loadedEvents = await fetchEvents();
        setEvents(loadedEvents);
        updateMarkedDates(loadedEvents);
      } catch (error) {
        console.error("Initialization error:", error);
        Alert.alert("Error", "Failed to initialize app.");
      }
    };
    initialize();
  }, []);

  const updateMarkedDates = (events: Event[]) => {
    const marked: { [key: string]: any } = {};
    events.forEach((event) => {
      marked[event.date] = { marked: true, dotColor: "red" };
    });
    setMarkedDates(marked);
  };

  const handleCodeSet = () => {
    setCodeState((prev) => ({ ...prev, isSet: true }));
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

  const handleDayPress = (day: { dateString: string }) => {
    const date = day.dateString;
    const existingEvent = events.find((event) => event.date === date);

    if (existingEvent) {
      Alert.alert(
        "Event Details",
        `Date: ${existingEvent.date}\nMarked At: ${new Date(existingEvent.markedAt).toLocaleString()}`
      );
    } else {
      setPendingDate(date);
      setVerifyModalVisible(true);
    }
  };

  const handleVerifyCode = async () => {
    if (inputCode === codeState.code) {
      try {
        const markedAt = new Date().toISOString();
        if (pendingDate) {
          const insertedId = await insertEvent(pendingDate, markedAt);
          const newEvent: Event = {
            id: insertedId,
            date: pendingDate,
            markedAt,
          };
          const updatedEvents = [...events, newEvent];
          setEvents(updatedEvents);
          updateMarkedDates(updatedEvents);
        }
        setVerifyModalVisible(false);
        setInputCode("");
        setPendingDate(null);
      } catch (error: any) {
        console.error("Error marking event:", error);
        Alert.alert("Error", `Failed to mark event: ${error.message}`);
      }
    } else {
      Alert.alert("Error", "Incorrect verification code.");
      setInputCode("");
    }
  };

  if (!codeState.isSet) {
    return <CodeSetup onCodeSet={handleCodeSet} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Event Marker</Text>
      <Button title="Change Verification Code" onPress={() => setChangeCodeModalVisible(true)} />
      <Calendar
        onDayPress={handleDayPress}
        markedDates={markedDates}
        theme={{
          selectedDayBackgroundColor: "#007AFF",
          todayTextColor: "#007AFF",
          arrowColor: "#007AFF",
        }}
      />
      {/* Verification Modal */}
      <Modal
        visible={verifyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVerifyModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Verification Code</Text>
            <TextInput
              style={styles.input}
              placeholder="4-digit code"
              keyboardType="numeric"
              maxLength={4}
              value={inputCode}
              onChangeText={setInputCode}
              secureTextEntry // Mask input
            />
            <View style={styles.buttonContainer}>
              <Button title="Cancel" onPress={() => setVerifyModalVisible(false)} />
              <Button title="Verify" onPress={handleVerifyCode} />
            </View>
          </View>
        </View>
      </Modal>
      {/* Change Code Modal */}
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
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginVertical: 10,
    borderRadius: 5,
    width: "100%",
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
});

export default CalendarView;