import React, { useEffect, useState, useContext } from "react";
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
  ScrollView,
} from "react-native";
import { Calendar } from "react-native-calendars";
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
import {
  insertEvent,
  fetchEventsWithCreator,
  getEventTypes,
  updateEventType,
  verifyUserCode,
  deleteEvent,
  verifyEvent,
  getUsers,
} from "../db/database";
import { useLanguage } from "../contexts/LanguageContext";
import { availableColors, availableIcons } from "../icons";
import { UserContext } from "../contexts/UserContext";
import { styles } from "../styles/calendarViewStyles";

interface CalendarViewProps {
  route: RouteProp<RootStackParamList, "Calendar">;
}

const MAX_NOTE_LENGTH = 200;
const MAX_PHOTO_SIZE = 1_048_576;

const CalendarView: React.FC<CalendarViewProps> = ({ route }) => {
  const {
    eventType,
    icon: initialIcon,
    iconColor: initialIconColor,
  } = route.params;
  const { currentUser } = useContext(UserContext);
  const [icon, setIcon] = useState<string>(initialIcon || "event");
  const [iconColor, setIconColor] = useState<string>(
    initialIconColor || "#000000"
  );
  const { t } = useLanguage();
  const [events, setEvents] = useState<Event[]>([]);
  const [markedDates, setMarkedDates] = useState<{ [key: string]: any }>({});
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [verifyEventModalVisible, setVerifyEventModalVisible] = useState(false);
  const [inputCode, setInputCode] = useState("");
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);
  const [availability, setAvailability] = useState<number>(0);
  const [weight, setWeight] = useState<number>(1);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newIcon, setNewIcon] = useState<string>("event");
  const [newIconColor, setNewIconColor] = useState<string>("#000000");
  const [monthlyAchievementCount, setMonthlyAchievementCount] =
    useState<number>(0);
  const [currentYear, setCurrentYear] = useState<number>(
    new Date().getFullYear()
  );
  const [currentMonth, setCurrentMonth] = useState<number>(
    new Date().getMonth() + 1
  );
  const [eventTypeOwnerId, setEventTypeOwnerId] = useState<number | null>(null);
  const [users, setUsers] = useState<{ id: number; name: string }[]>([]);
  const [pendingEventId, setPendingEventId] = useState<number | null>(null);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const calculateMonthlyAchievements = (
    events: Event[],
    year: number,
    month: number
  ) => {
    const count = events.filter((event) => {
      const [eventYear, eventMonth] = event.date.split("-").map(Number);
      return eventYear === year && eventMonth === month;
    }).length;
    setMonthlyAchievementCount(count);
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        // Fetch users for creator names
        const allUsers = await getUsers();
        setUsers(allUsers.map((u) => ({ id: u.id, name: u.name })));
        // Fetch events with creator names
        const loadedEvents = await fetchEventsWithCreator(eventType);
        setEvents(loadedEvents);
        calculateMonthlyAchievements(loadedEvents, currentYear, currentMonth);
        // Fetch event type details
        const eventTypes = await getEventTypes();
        const type = eventTypes.find((t) => t.name === eventType);
        if (type?.icon) setIcon(type.icon);
        if (type?.iconColor) setIconColor(type.iconColor);
        setAvailability(type?.availability || 0);
        setWeight(type?.weight || 1);
        setEventTypeOwnerId(type?.owner || null);
        setNewIcon(type?.icon || "event");
        setNewIconColor(type?.iconColor || "#000000");
        updateMarkedDates(loadedEvents, type?.iconColor || "#000000");
      } catch (error) {
        console.error("Initialization error:", error);
        Alert.alert("Error", t("errorInitCalendar"));
      }
    };
    initialize();
  }, [eventType, t, currentYear, currentMonth]);

  const handleMonthChange = (month: { year: number; month: number }) => {
    setCurrentYear(month.year);
    setCurrentMonth(month.month);
    calculateMonthlyAchievements(events, month.year, month.month);
  };

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
  };

  const handleAskSticker = () => {
    if (selectedDate) {
      setPendingDate(selectedDate);
      setVerifyModalVisible(true);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", t("permissionDeniedGallery"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
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
      Alert.alert("Permission Denied", t("permissionDeniedCamera"));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
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

        const newFileInfo = await FileSystem.getInfoAsync(finalUri, {
          size: true,
        });
        if (newFileInfo.exists && newFileInfo.size > MAX_PHOTO_SIZE) {
          const compressMore = await ImageManipulator.manipulateAsync(
            finalUri,
            [],
            { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
          );
          finalUri = compressMore.uri;
        }
      }

      const permanentPath = `${
        FileSystem.documentDirectory
      }photos/${Date.now()}.jpg`;
      await FileSystem.makeDirectoryAsync(
        `${FileSystem.documentDirectory}photos/`,
        {
          intermediates: true,
        }
      );
      await FileSystem.moveAsync({ from: finalUri, to: permanentPath });
      setPhotoUri(permanentPath);
    } catch (error) {
      console.error("Error processing image:", error);
      Alert.alert("Error", t("errorProcessImage"));
    }
  };

  const handleVerifyCode = async () => {
    if (!currentUser) {
      Alert.alert("Error", t("noCurrentUser"));
      return;
    }
    try {
      if (pendingDate) {
        const markedAt = new Date().toISOString();
        const insertedId = await insertEvent(
          pendingDate,
          markedAt,
          eventType,
          currentUser.id,
          note || undefined,
          photoUri || undefined,
          false // is_verified = false
        );
        const newEvent: Event = {
          id: insertedId,
          date: pendingDate,
          markedAt,
          eventType,
          created_by: currentUser.id,
          is_verified: false,
          note: note || undefined,
          photoPath: photoUri || undefined,
          creatorName: currentUser.name,
        };
        const updatedEvents = [...events, newEvent];
        setEvents(updatedEvents);
        calculateMonthlyAchievements(
          updatedEvents,
          currentYear,
          currentMonth
        );
        updateMarkedDates(updatedEvents, iconColor);
      }
      setVerifyModalVisible(false);
      setInputCode("");
      setNote("");
      setPhotoUri(null);
      setPendingDate(null);
    } catch (error: any) {
      console.error("Error marking event:", error);
      Alert.alert("Error", `${t("errorMarkEvent")}: ${error.message}`);
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    setPendingEventId(eventId);
    setDeleteModalVisible(true);
  };

  const handleVerifyDelete = async () => {
    if (!currentUser || !pendingEventId) return;
    try {
      const isValid = await verifyUserCode(currentUser.id, inputCode);
      if (isValid) {
        await deleteEvent(pendingEventId);
        const updatedEvents = events.filter((e) => e.id !== pendingEventId);
        setEvents(updatedEvents);
        calculateMonthlyAchievements(updatedEvents, currentYear, currentMonth);
        updateMarkedDates(updatedEvents, iconColor);
        setDeleteModalVisible(false);
        setInputCode("");
        setPendingEventId(null);
        Alert.alert(t("success"), t("eventDeleted"));
      } else {
        Alert.alert("Error", t("errorIncorrectCode"));
        setInputCode("");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      Alert.alert("Error", t("errorDeleteEvent"));
    }
  };

  const handleVerifyEvent = async (eventId: number) => {
    setPendingEventId(eventId);
    setVerifyEventModalVisible(true);
  };

  const handleConfirmVerifyEvent = async () => {
    if (!currentUser || !pendingEventId) return;
    try {
      const isValid = await verifyUserCode(currentUser.id, inputCode);
      if (isValid) {
        await verifyEvent(pendingEventId, currentUser.id);
        const updatedEvents = await fetchEventsWithCreator(eventType);
        setEvents(updatedEvents);
        setVerifyEventModalVisible(false);
        setInputCode("");
        setPendingEventId(null);
        Alert.alert(t("success"), t("eventVerified"));
      } else {
        Alert.alert("Error", t("errorIncorrectCode"));
        setInputCode("");
      }
    } catch (error) {
      console.error("Error verifying event:", error);
      Alert.alert("Error", t("errorVerifyEvent"));
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
      await updateEventType(eventType, newIcon, newIconColor, eventTypeOwnerId);
      setIcon(newIcon);
      setIconColor(newIconColor);
      updateMarkedDates(events, newIconColor);
      setEditModalVisible(false);
    } catch (error) {
      Alert.alert("Error", t("errorUpdateIconColor"));
    }
  };

  const renderIconOption = (icon: string) => (
    <TouchableOpacity
      key={icon}
      style={[styles.iconOption, newIcon === icon && styles.selectedIconOption]}
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
    ></TouchableOpacity>
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
        translateX.value =
          savedTranslateX.value + event.translationX / scale.value;
        translateY.value =
          savedTranslateY.value + event.translationY / scale.value;
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

  const showAskStickerButton =
    selectedDate &&
    (availability === 0 || selectedDateEvents.length < availability) &&
    (currentUser?.id === eventTypeOwnerId || currentUser?.role_id === 1);

  if (!currentUser) {
    return (
      <View style={styles.container}>
        <Text>{t("loading")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.titleContainer}
        onPress={() => {
          if (currentUser.role_id === 1) {
            setEditModalVisible(true);
          }
        }}
      >
        <View style={styles.leftContainer}>
          <MaterialIcons
            name={icon}
            size={24}
            color={iconColor}
            style={styles.icon}
          />
          <Text style={styles.weightText}>{weight}</Text>
        </View>
        <Text style={styles.title}>{eventType}</Text>
        <Text style={styles.achievementCountText}>
          {monthlyAchievementCount}
        </Text>
      </TouchableOpacity>
      <Calendar
        onDayPress={handleDayPress}
        onMonthChange={handleMonthChange}
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
            <Text style={styles.eventTitle}>{t("achievementDetails")}</Text>
            {selectedDateEvents.map((event, index) => (
              <View key={event.id || index} style={styles.eventItem}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventText}>
                    {t("achievement")} {index + 1}
                  </Text>
                  {event.is_verified ? (
                    <MaterialIcons
                      name="check-circle"
                      size={20}
                      color="green"
                    />
                  ) : (
                    <View style={styles.actionButtons}>
                      {currentUser.role_id === 1 && (
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleVerifyEvent(event.id)}
                        >
                          <Text style={styles.actionButtonText}>
                            {t("verify")}
                          </Text>
                        </TouchableOpacity>
                      )}
                      {(currentUser.id === event.created_by ||
                        currentUser.role_id === 1) && (
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleDeleteEvent(event.id)}
                        >
                          <Text style={styles.actionButtonText}>
                            {t("delete")}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
                <Text style={styles.eventText}>
                  {t("date")}: {String(event.date)}
                </Text>
                <Text style={styles.eventText}>
                  {t("gotAt")}: {new Date(event.markedAt).toLocaleString()}
                </Text>
                <Text style={styles.eventText}>
                  {t("createdBy")}: {event.creatorName ?? "Unknown"}
                </Text>
                <Text style={styles.eventText}>
                  {t("verified")}: {event.is_verified ? t("yes") : t("no")}
                </Text>
                {event.note && (
                  <Text style={styles.eventText}>
                    {t("for")}: {String(event.note)}
                  </Text>
                )}
                {event.is_verified ? (
                  <>
                    <Text style={styles.eventText}>
                      {t("verifiedAt")}:{" "}
                      {new Date(event.verified_at!).toLocaleString()}
                    </Text>
                    <Text style={styles.eventText}>
                      {t("verifiedBy")}: {event.verifierName ?? t("unknown")}
                    </Text>
                  </>
                ) : null}
                {event.photoPath && (
                  <TouchableOpacity
                    onPress={() => openPhotoModal(event.photoPath)}
                  >
                    <Image
                      source={{ uri: event.photoPath }}
                      style={styles.eventPhoto}
                    />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>
        ) : (
          <>
            <Text style={styles.noEventText}>
              {selectedDate
                ? `${t("noAchievement")} ${selectedDate}`
                : t("noDateSelected")}
            </Text>
            <Text style={styles.maxAchievementsText}>
              {t("maxAchievements", {
                availability:
                  availability === 0 ? t("unlimited") : availability,
              })}
            </Text>
          </>
        )}
        {showAskStickerButton && (
          <TouchableOpacity
            style={styles.markButton}
            onPress={handleAskSticker}
          >
            <Text style={styles.markButtonText}>
              {currentUser.role_id === 1 ? t("giveSticker") : t("askSticker")}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {/* Ask Sticker Modal */}
      <Modal
        visible={verifyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVerifyModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {currentUser.role_id === 1 ? t("giveSticker") : t("askSticker")}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={t("notePlaceholder")}
              maxLength={MAX_NOTE_LENGTH}
              value={note}
              onChangeText={setNote}
              multiline
            />
            <Text style={styles.charCount}>
              {note.length}/{MAX_NOTE_LENGTH}
            </Text>
            <View style={styles.photoButtonContainer}>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={captureImage}
              >
                <Text style={styles.photoButtonText}>{t("takePhoto")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                <Text style={styles.photoButtonText}>{t("uploadPhoto")}</Text>
              </TouchableOpacity>
            </View>
            {photoUri && (
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            )}
            <View style={styles.buttonContainer}>
              <Button
                title={t("cancel")}
                onPress={() => {
                  setVerifyModalVisible(false);
                  setNote("");
                  setPhotoUri(null);
                  setPendingDate(null);
                }}
              />
              <Button title={t("confirm")} onPress={handleVerifyCode} />
            </View>
          </View>
        </View>
      </Modal>
      {/* Delete Event Verification Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("verifyDeleteEvent")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("codePlaceholder")}
              keyboardType="numeric"
              maxLength={4}
              value={inputCode}
              onChangeText={setInputCode}
              secureTextEntry
              autoFocus
            />
            <View style={styles.buttonContainer}>
              <Button
                title={t("cancel")}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setInputCode("");
                  setPendingEventId(null);
                }}
              />
              <Button title={t("confirm")} onPress={handleVerifyDelete} />
            </View>
          </View>
        </View>
      </Modal>
      {/* Verify Event Verification Modal */}
      <Modal
        visible={verifyEventModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVerifyEventModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("verifyEvent")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("codePlaceholder")}
              keyboardType="numeric"
              maxLength={4}
              value={inputCode}
              onChangeText={setInputCode}
              secureTextEntry
              autoFocus
            />
            <View style={styles.buttonContainer}>
              <Button
                title={t("cancel")}
                onPress={() => {
                  setVerifyEventModalVisible(false);
                  setInputCode("");
                  setPendingEventId(null);
                }}
              />
              <Button title={t("confirm")} onPress={handleConfirmVerifyEvent} />
            </View>
          </View>
        </View>
      </Modal>
      {/* Photo Modal */}
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
      {/* Edit Icon/Color Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("editIconColor")}</Text>
            <Text style={styles.iconLabel}>{t("selectIcon")}</Text>
            <ScrollView horizontal style={styles.iconPicker}>
              {availableIcons.map(renderIconOption)}
            </ScrollView>
            <Text style={styles.iconLabel}>{t("selectColor")}</Text>
            <ScrollView horizontal style={styles.colorPicker}>
              {availableColors.map(renderColorOption)}
            </ScrollView>
            <View style={styles.buttonContainer}>
              <Button
                title={t("cancel")}
                onPress={() => {
                  setNewIcon(icon);
                  setNewIconColor(iconColor);
                  setEditModalVisible(false);
                }}
              />
              <Button title={t("save")} onPress={handleUpdateIconAndColor} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};


export default CalendarView;
