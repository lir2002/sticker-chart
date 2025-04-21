import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Alert,
  StyleSheet,
  TextInput,
  Modal,
  Button,
  TouchableOpacity,
} from "react-native";
import { Calendar } from "react-native-calendars";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp } from "@react-navigation/native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { RootStackParamList, Event } from "../types";
import { insertEvent, fetchEvents, initDatabase, getEventTypes } from "../db/database";

interface CalendarViewProps {
  route: RouteProp<RootStackParamList, "Calendar">;
}

const CalendarView: React.FC<CalendarViewProps> = ({ route }) => {
  const { eventType } = route.params;
  const [events, setEvents] = useState<Event[]>([]);
  const [markedDates, setMarkedDates] = useState<{ [key: string]: any }>({});
  const [code, setCode] = useState<string | null>(null);
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [inputCode, setInputCode] = useState("");
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [icon, setIcon] = useState<string>("event");
  const [iconColor, setIconColor] = useState<string>("#000000");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Load events, code, icon, and color
  useEffect(() => {
    const initialize = async () => {
      try {
        await initDatabase();
        const storedCode = await AsyncStorage.getItem("verificationCode");
        setCode(storedCode);
        const loadedEvents = await fetchEvents(eventType);
        setEvents(loadedEvents);
        // Fetch icon and color for the event type
        const eventTypes = await getEventTypes();
        const type = eventTypes.find((t) => t.name === eventType);
        if (type?.icon) {
          setIcon(type.icon);
        }
        if (type?.iconColor) {
          setIconColor(type.iconColor);
        }
        // Update marked dates with iconColor
        updateMarkedDates(loadedEvents, type?.iconColor || "#000000");
      } catch (error) {
        console.error("Initialization error:", error);
        Alert.alert("Error", "Failed to initialize calendar.");
      }
    };
    initialize();
  }, [eventType]);

  const updateMarkedDates = (events: Event[], dotColor: string) => {
    const marked: { [key: string]: any } = {};
    events.forEach((event) => {
      marked[event.date] = { marked: true, dotColor };
    });
    setMarkedDates(marked);
  };

  const handleDayPress = (day: { dateString: string }) => {
    const date = day.dateString;
    setSelectedDate(date);
    const existingEvent = events.find((event) => event.date === date);
    setSelectedEvent(existingEvent || null);
  };

  const handleMarkEvent = () => {
    if (selectedDate) {
      setPendingDate(selectedDate);
      setVerifyModalVisible(true);
    }
  };

  const handleVerifyCode = async () => {
    if (inputCode === code) {
      try {
        const markedAt = new Date().toISOString();
        if (pendingDate) {
          const insertedId = await insertEvent(pendingDate, markedAt, eventType);
          const newEvent: Event = {
            id: insertedId,
            date: pendingDate,
            markedAt,
            eventType,
          };
          const updatedEvents = [...events, newEvent];
          setEvents(updatedEvents);
          setSelectedEvent(newEvent);
          updateMarkedDates(updatedEvents, iconColor);
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

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <MaterialIcons name={icon} size={24} color={iconColor} style={styles.icon} />
        <Text style={styles.title}>{eventType}</Text>
      </View>
      <Calendar
        onDayPress={handleDayPress}
        markedDates={markedDates}
        theme={{
          selectedDayBackgroundColor: "#007AFF",
          todayTextColor: "#007AFF",
          arrowColor: "#007AFF",
        }}
      />
      <View style={styles.eventDisplay}>
        {selectedEvent ? (
          <>
            <Text style={styles.eventTitle}>Event Details</Text>
            <Text style={styles.eventText}>Date: {selectedEvent.date}</Text>
            <Text style={styles.eventText}>
              Marked At: {new Date(selectedEvent.markedAt).toLocaleString()}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.noEventText}>
              {selectedDate ? `No event on ${selectedDate}` : "No date selected"}
            </Text>
            {selectedDate && (
              <TouchableOpacity
                style={styles.markButton}
                onPress={handleMarkEvent}
              >
                <Text style={styles.markButtonText}>Mark Event</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
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
              secureTextEntry
              autoFocus
            />
            <View style={styles.buttonContainer}>
              <Button title="Cancel" onPress={() => setVerifyModalVisible(false)} />
              <Button title="Verify" onPress={handleVerifyCode} />
            </View>
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
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  icon: {
    marginRight: 10,
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
  eventDisplay: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  eventText: {
    fontSize: 14,
    marginBottom: 5,
  },
  noEventText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 10,
  },
  markButton: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  markButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default CalendarView;