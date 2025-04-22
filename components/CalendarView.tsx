import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Modal,
  Button,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  ScrollView,
} from "react-native";
import { Calendar } from "react-native-calendars";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp } from "@react-navigation/native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { RootStackParamList, Event } from "../types";
import { insertEvent, fetchEvents, initDatabase, getEventTypes, updateEventType } from "../db/database";

interface CalendarViewProps {
  route: RouteProp<RootStackParamList, "Calendar">;
}

const MAX_NOTE_LENGTH = 200;
const MAX_PHOTO_SIZE = 1_048_576;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Reused from HomeScreen.tsx
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
const availableColors = [
  "#000000",
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFA500",
  "#800080",
  "#FFC0CB",
];

const CalendarView: React.FC<CalendarViewProps> = ({ route }) => {
  const { eventType } = route.params;
  const [events, setEvents] = useState<Event[]>([]);
  const [markedDates, setMarkedDates] = useState<{ [key: string]: any }>({});
  const [code, setCode] = useState<string | null>(null);
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [inputCode, setInputCode] = useState("");
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [icon, setIcon] = useState<string>("event");
  const [iconColor, setIconColor] = useState<string>("#000000");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);
  const [availability, setAvailability] = useState<number>(0);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newIcon, setNewIcon] = useState<string>("event");
  const [newIconColor, setNewIconColor] = useState<string>("#000000");

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    const initialize = async () => {
      try {
        await initDatabase();
        const storedCode = await AsyncStorage.getItem("verificationCode");
        setCode(storedCode);
        const loadedEvents = await fetchEvents(eventType);
        setEvents(loadedEvents);
        const eventTypes = await getEventTypes();
        const type = eventTypes.find((t) => t.name === eventType);
        if (type?.icon) setIcon(type.icon);
        if (type?.iconColor) setIconColor(type.iconColor);
        setAvailability(type?.availability || 0);
        setNewIcon(type?.icon || "event");
        setNewIconColor(type?.iconColor || "#000000");
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
    setSelectedEvent(null);
  };

  const handleMarkEvent = () => {
    if (selectedDate) {
      setPendingDate(selectedDate);
      setVerifyModalVisible(true);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Please grant gallery access to upload photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets[0].uri) {
      await processImage(result.assets[0].uri);
    }
  };

  const captureImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Please grant camera access to take photos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets[0].uri) {
      await processImage(result.assets[0].uri);
    }
  };

  const processImage = async (uri: string) => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
      let finalUri = uri;

      if (fileInfo.exists && fileInfo.size > MAX_PHOTO_SIZE) {
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        finalUri = manipulatedImage.uri;

        const newFileInfo = await FileSystem.getInfoAsync(finalUri, { size: true });
        if (newFileInfo.exists && newFileInfo.size > MAX_PHOTO_SIZE) {
          const compressMore = await ImageManipulator.manipulateAsync(
            finalUri,
            [],
            { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
          );
          finalUri = compressMore.uri;
        }
      }

      const permanentPath = `${FileSystem.documentDirectory}photos/${Date.now()}.jpg`;
      await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}photos/`, {
        intermediates: true,
      });
      await FileSystem.moveAsync({ from: finalUri, to: permanentPath });
      setPhotoUri(permanentPath);
    } catch (error) {
      console.error("Error processing image:", error);
      Alert.alert("Error", "Failed to process image.");
    }
  };

  const handleVerifyCode = async () => {
    if (inputCode === code) {
      try {
        const markedAt = new Date().toISOString();
        if (pendingDate) {
          const insertedId = await insertEvent(
            pendingDate,
            markedAt,
            eventType,
            note || undefined,
            photoUri || undefined
          );
          const newEvent: Event = {
            id: insertedId,
            date: pendingDate,
            markedAt,
            eventType,
            note: note || undefined,
            photoPath: photoUri || undefined,
          };
          const updatedEvents = [...events, newEvent];
          setEvents(updatedEvents);
          setSelectedEvent(newEvent);
          updateMarkedDates(updatedEvents, iconColor);
        }
        setVerifyModalVisible(false);
        setInputCode("");
        setNote("");
        setPhotoUri(null);
        setPendingDate(null);
      } catch (error: any) {
        console.error("Error marking event:", error);
        Alert.alert("Error", `Failed to Give a Sticker: ${error.message}`);
      }
    } else {
      Alert.alert("Error", "Incorrect verification code.");
      setInputCode("");
    }
  };

  const openPhotoModal = (uri: string) => {
    setSelectedPhotoUri(uri);
    setPhotoModalVisible(true);
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const handleUpdateIconAndColor = async () => {
    try {
      await updateEventType(eventType, newIcon, newIconColor);
      setIcon(newIcon);
      setIconColor(newIconColor);
      updateMarkedDates(events, newIconColor); // Update dot colors
      setEditModalVisible(false);
    } catch (error) {
      Alert.alert("Error", "Failed to update icon and color.");
    }
  };

  const renderIconOption = (icon: string) => (
    <TouchableOpacity
      key={icon}
      style={[
        styles.iconOption,
        newIcon === icon && styles.selectedIconOption,
      ]}
      onPress={() => setNewIcon(icon)}
    >
      <MaterialIcons name={icon} size={24} color={newIconColor} />
    </TouchableOpacity>
  );

  const renderColorOption = (color: string) => (
    <TouchableOpacity
      key={color}
      style={[
        styles.colorOption,
        { backgroundColor: color },
        newIconColor === color && styles.selectedColorOption,
      ]}
      onPress={() => setNewIconColor(color)}
    />
  );

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = savedScale.value * event.scale;
      if (scale.value < 1) scale.value = 1;
      if (scale.value > 3) scale.value = 3;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + event.translationX / scale.value;
        translateY.value = savedTranslateY.value + event.translationY / scale.value;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composedGestures = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(scale.value) },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const selectedDateEvents = selectedDate
    ? events.filter((event) => event.date === selectedDate)
    : [];

  const showMarkEventButton =
    selectedDate &&
    (availability === 0 || selectedDateEvents.length < availability);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.titleContainer}
        onPress={() => setEditModalVisible(true)}
      >
        <MaterialIcons name={icon} size={24} color={iconColor} style={styles.icon} />
        <Text style={styles.title}>{eventType}</Text>
        <Text style={styles.availabilityText}>{availability}</Text>
      </TouchableOpacity>
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
        {selectedDateEvents.length > 0 ? (
          <ScrollView style={styles.eventScrollView}>
            <Text style={styles.eventTitle}>Achievement Details</Text>
            {selectedDateEvents.map((event, index) => (
              <View key={event.id || index} style={styles.eventItem}>
                <Text style={styles.eventText}>Achievement {index + 1}</Text>
                <Text style={styles.eventText}>Date: {event.date}</Text>
                <Text style={styles.eventText}>
                  Got At: {new Date(event.markedAt).toLocaleString()}
                </Text>
                {event.note && (
                  <Text style={styles.eventText}>For: {event.note}</Text>
                )}
                {event.photoPath && (
                  <TouchableOpacity onPress={() => openPhotoModal(event.photoPath)}>
                    <Image source={{ uri: event.photoPath }} style={styles.eventPhoto} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.noEventText}>
            {selectedDate ? `No achievement on ${selectedDate}` : "No date selected"}
          </Text>
        )}
        {showMarkEventButton && (
          <TouchableOpacity style={styles.markButton} onPress={handleMarkEvent}>
            <Text style={styles.markButtonText}>Give a Sticker</Text>
          </TouchableOpacity>
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
            <Text style={styles.modalTitle}>Give a Sticker</Text>
            <TextInput
              style={styles.input}
              placeholder="4-digit code"
              keyboardType="numeric"
              maxLength={4}
              value={inputCode}x
              onChangeText={setInputCode}
              secureTextEntry
              autoFocus
            />
            <TextInput
              style={styles.input}
              placeholder="Add a note (optional)"
              maxLength={MAX_NOTE_LENGTH}
              value={note}
              onChangeText={setNote}
              multiline
            />
            <Text style={styles.charCount}>{note.length}/{MAX_NOTE_LENGTH}</Text>
            <View style={styles.photoButtonContainer}>
              <TouchableOpacity style={styles.photoButton} onPress={captureImage}>
                <Text style={styles.photoButtonText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                <Text style={styles.photoButtonText}>Upload Photo</Text>
              </TouchableOpacity>
            </View>
            {photoUri && <Image source={{ uri: photoUri }} style={styles.photoPreview} />}
            <View style={styles.buttonContainer}>
              <Button title="Cancel" onPress={() => setVerifyModalVisible(false)} />
              <Button title="Verify" onPress={handleVerifyCode} />
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={photoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <View style={styles.photoModalContainer}>
          <GestureDetector gesture={composedGestures}>
            <Animated.Image
              source={{ uri: selectedPhotoUri || "" }}
              style={[styles.fullScreenPhoto, animatedStyle]}
              resizeMode="contain"
            />
          </GestureDetector>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setPhotoModalVisible(false)}
          >
            <MaterialIcons name="close" size={30} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Icon and Color</Text>
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
                  setNewIcon(icon);
                  setNewIconColor(iconColor);
                  setEditModalVisible(false);
                }}
              />
              <Button title="Save" onPress={handleUpdateIconAndColor} />
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
    justifyContent: "space-between", // Changed for availability
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  icon: {
    marginRight: 10,
  },
  availabilityText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
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
  charCount: {
    fontSize: 12,
    color: "#666",
    alignSelf: "flex-end",
    marginBottom: 10,
  },
  photoButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 10,
  },
  photoButton: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: "center",
  },
  photoButtonText: {
    color: "#fff",
    fontSize: 14,
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: 5,
    marginBottom: 10,
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
    flex: 1,
  },
  eventScrollView: {
    flexGrow: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  eventItem: {
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
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
  eventPhoto: {
    width: 100,
    height: 100,
    borderRadius: 5,
    marginTop: 10,
  },
  photoModalContainer: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenPhoto: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 5,
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
});

export default CalendarView;