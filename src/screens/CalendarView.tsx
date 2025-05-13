import React, { useEffect, useState, useContext } from "react";
import { Alert, Dimensions, Modal as RNModal, Appearance } from "react-native";
import { Calendar } from "react-native-calendars";
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
import {
  YStack,
  XStack,
  Text,
  styled,
  Button,
  Image,
  ScrollView,
  useTheme,
} from "tamagui";
import { RouteProp } from "@react-navigation/native";
import { useLanguage } from "../contexts/LanguageContext";
import { UserContext } from "../contexts/UserContext";
import { StyledInput, CustomButton } from "../components/SharedComponents";
import { RootStackParamList, Event } from "../types";
import {
  insertEvent,
  fetchEventsWithCreator,
  getEventTypes,
  updateEventType,
  verifyUserCode,
  deleteEvent,
  verifyEventWithTransaction,
} from "../db/database";
import { availableColors, availableIcons } from "../icons";
import { resolvePhotoUri } from "../utils/fileUtils";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface CalendarViewProps {
  route: RouteProp<RootStackParamList, "Calendar">;
}

const MAX_NOTE_LENGTH = 200;
const MAX_PHOTO_SIZE = 1_048_576;

// Styled components (unchanged)
const Container = styled(YStack, {
  flex: 1,
  p: "$4",
  bg: "$background",
});

const TitleContainer = styled(XStack, {
  ai: "center",
  jc: "space-between",
  mb: "$4",
});

const Title = styled(Text, {
  fontSize: "$5",
  fontWeight: "bold",
  color: "$text",
  maxWidth: "60%",
});

const LeftContainer = styled(XStack, {
  ai: "center",
});

const WeightText = styled(Text, {
  fontSize: "$5",
  fontWeight: "bold",
  color: "$gray",
});

const AchievementCountText = styled(Text, {
  fontSize: "$5",
  fontWeight: "bold",
  color: "$gray",
});

const ModalContainer = styled(YStack, {
  f: 1,
  jc: "center",
  ai: "center",
  bg: "$overlay",
});

const ModalContent = styled(YStack, {
  bg: "$modalBackground",
  p: "$4",
  br: "$2",
  w: "80%",
  ai: "center",
});

const ModalTitle = styled(Text, {
  fontSize: "$5",
  fontWeight: "bold",
  mb: "$2",
  color: "$text",
});

const ModalText = styled(Text, {
  fontSize: "$3",
  mb: "$2",
  ta: "center",
  color: "$text",
});

const CharCount = styled(Text, {
  fontSize: "$2",
  color: "$gray",
  alignSelf: "flex-end",
  mb: "$2",
});

const PhotoButtonContainer = styled(XStack, {
  jc: "space-between",
  w: "100%",
  mb: "$2",
});

const PhotoButton = styled(Button, {
  bg: "$primary",
  p: "$2",
  br: "$2",
  f: 1,
  mx: "$2",
  h: 40,
});

const PhotoButtonText = styled(Text, {
  color: "$modalBackground",
  fontSize: "$3",
  ta: "center",
});

const PhotoPreview = styled(Image, {
  w: 100,
  h: 100,
  br: "$2",
  mb: "$2",
});

const EventDisplay = styled(YStack, {
  mt: "$4",
  p: "$3",
  bg: "$lightGray",
  borderWidth: 1,
  borderColor: "$border",
  br: "$2",
  f: 1,
});

const EventTitle = styled(Text, {
  fontSize: "$4",
  fontWeight: "bold",
  mb: "$2",
  color: "$text",
});

const EventItem = styled(YStack, {
  mb: "$3",
  pb: "$2",
  borderBottomWidth: 1,
  borderBottomColor: "$border",
});

const EventHeader = styled(XStack, {
  jc: "space-between",
  ai: "center",
  mb: "$1",
});

const EventText = styled(Text, {
  fontSize: "$4",
  mb: "$1",
  color: "$text",
});

const NoEventText = styled(Text, {
  fontSize: "$4",
  color: "$gray",
  ta: "center",
  mb: "$2",
});

const MaxAchievementsText = styled(Text, {
  fontSize: "$4",
  color: "$gray",
  ta: "center",
  mt: "$2",
});

const MarkButton = styled(Button, {
  bg: "$primary",
  p: "$2",
  br: "$2",
  h: 40,
});

const MarkButtonText = styled(Text, {
  color: "$modalBackground",
  fontSize: "$3",
  fontWeight: "bold",
  ta: "center",
});

const EventPhoto = styled(Image, {
  w: 100,
  h: 100,
  br: "$2",
  mt: "$2",
});

const PhotoModalContainer = styled(YStack, {
  f: 1,
  bg: "$photoBackground",
  jc: "center",
  ai: "center",
});

const CloseButton = styled(Button, {
  position: "absolute",
  top: 40,
  right: 20,
  bg: "$overlay",
  br: 20,
  p: "$1",
});

const IconLabel = styled(Text, {
  fontSize: "$4",
  my: "$2",
  alignSelf: "flex-start",
  color: "$text",
});

const IconOption = styled(YStack, {
  p: "$2",
  variants: {
    selected: {
      true: {
        bg: "$selectedBackground",
        br: "$2",
      },
    },
  },
});

const ColorOption = styled(YStack, {
  w: 30,
  h: 30,
  br: 15,
  mx: "$1",
  variants: {
    selected: {
      true: {
        borderWidth: 2,
        borderColor: "$primary",
      },
    },
  },
});

const ActionButtons = styled(XStack, {
  flexDirection: "row",
});

const ActionButton = styled(Button, {
  ml: "$2",
  bg: "$primary",
  p: "$1",
  br: "$2",
  h: 30,
});

const ActionButtonText = styled(Text, {
  color: "$modalBackground",
  fontSize: "$3",
});

const CalendarView: React.FC<CalendarViewProps> = ({ route }) => {
  const {
    eventType,
    owner,
    ownerName,
    icon: initialIcon,
    iconColor: initialIconColor,
  } = route.params;
  const { currentUser } = useContext(UserContext);
  const [icon, setIcon] = useState<string>(initialIcon || "event");
  const [iconColor, setIconColor] = useState<string>(
    initialIconColor || "#000000"
  );
  const { t } = useLanguage();
  const theme = useTheme();
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
  const [pendingEventId, setPendingEventId] = useState<number | null>(null);
  const [confirmVerifyModalVisible, setConfirmVerifyModalVisible] =
    useState(false);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [expirationDate, setExpirationDate] = useState<string | null>(null);
  const [colorScheme, setColorScheme] = useState(Appearance.getColorScheme());

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Listen for system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setColorScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

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
        // Fetch events with owner
        const loadedEvents = await fetchEventsWithCreator(eventType, owner);
        setEvents(loadedEvents);
        calculateMonthlyAchievements(loadedEvents, currentYear, currentMonth);
        // Fetch event type details including created_at and expiration_date
        const eventTypes = await getEventTypes();
        const type = eventTypes.find(
          (t) => t.name === eventType && t.owner === owner
        );
        if (type?.icon) setIcon(type.icon);
        if (type?.iconColor) setIconColor(type.iconColor);
        setAvailability(type?.availability || 0);
        setWeight(type?.weight || 1);
        setEventTypeOwnerId(type?.owner || null);
        setNewIcon(type?.icon || "event");
        setNewIconColor(type?.iconColor || "#000000");
        setCreatedAt(type?.created_at || null); // Set created_at
        setExpirationDate(type?.expiration_date || null); // Set expiration_date
        // Update markedDates with events and selected date
        const marked: { [key: string]: any } = {};
        loadedEvents.forEach((event) => {
          marked[event.date] = { marked: true, dotColor: type?.iconColor || "#000000" };
        });
        if (selectedDate) {
          marked[selectedDate] = {
            ...marked[selectedDate],
            selected: true,
            selectedColor: theme.primary.val,
          };
        }
        setMarkedDates(marked);
      } catch (error) {
        console.error("Initialization error:", error);
        Alert.alert("Error", t("errorInitCalendar"));
      }
    };
    initialize();
  }, [eventType, owner, t, currentYear, currentMonth]);

  // Function to check if a date is valid (between created_at and expiration_date)
  const isDateValid = (date: string): boolean => {
    // Parse dates as local time by splitting YYYY-MM-DD and creating Date objects
    const [year, month, day] = date.split("-").map(Number);
    const selectedDate = new Date(year, month - 1, day); // Local time
    if (createdAt) {
      const [cYear, cMonth, cDay] = createdAt
        .split("T")[0]
        .split("-")
        .map(Number);
      const createdDate = new Date(cYear, cMonth - 1, cDay); // Local time
      if (selectedDate < createdDate) {
        return false;
      }
    }
    if (expirationDate) {
      const [eYear, eMonth, eDay] = expirationDate
        .split("T")[0]
        .split("-")
        .map(Number);
      const expiration = new Date(eYear, eMonth - 1, eDay); // Local time
      if (selectedDate > expiration) {
        return false;
      }
    }
    return true;
  };

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
    // Update markedDates to highlight selected date
    const updatedMarkedDates = { ...markedDates };
    // Clear previous selected styles
    Object.keys(updatedMarkedDates).forEach((key) => {
      if (updatedMarkedDates[key].selected) {
        delete updatedMarkedDates[key].selected;
        delete updatedMarkedDates[key].selectedColor;
      }
    });
    // Add selected style for the pressed date
    updatedMarkedDates[date] = {
      ...updatedMarkedDates[date],
      selected: true,
      selectedColor: theme.primary.val, // Circle background color
    };
    setMarkedDates(updatedMarkedDates);
  };

  const handleAskSticker = () => {
    if (selectedDate && isDateValid(selectedDate)) {
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
      Alert.alert("Permission Denied", t("permissionDeniedCamera"));
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

      const photoDir = `${FileSystem.documentDirectory}photos/`;
      const fileName = `${Date.now()}.jpg`;
      const relativePath = `photos/${fileName}`;
      const permanentPath = `${photoDir}${fileName}`;

      await FileSystem.makeDirectoryAsync(photoDir, {
        intermediates: true,
      });
      await FileSystem.moveAsync({ from: finalUri, to: permanentPath });
      setPhotoUri(relativePath);
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
        // Updated to pass owner
        const insertedId = await insertEvent(
          pendingDate,
          markedAt,
          eventType,
          eventTypeOwnerId, // Pass owner from eventTypeOwnerId
          currentUser.id,
          note || undefined,
          photoUri || undefined,
          false
        );
        const newEvent: Event = {
          id: insertedId,
          date: pendingDate,
          markedAt,
          eventType,
          owner: eventTypeOwnerId, // Include owner
          created_by: currentUser.id,
          is_verified: false,
          note: note || undefined,
          photoPath: photoUri || undefined,
          creatorName: currentUser.name,
        };
        const updatedEvents = [...events, newEvent];
        setEvents(updatedEvents);
        calculateMonthlyAchievements(updatedEvents, currentYear, currentMonth);
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

  const handleVerifyEvent = (eventId: number) => {
    setPendingEventId(eventId);
    setConfirmVerifyModalVisible(true);
  };

  const handleConfirmVerification = () => {
    setConfirmVerifyModalVisible(false);
    setVerifyEventModalVisible(true);
  };

  const handleConfirmVerifyEvent = async () => {
    if (!currentUser || !pendingEventId) return;
    try {
      const isValid = await verifyUserCode(currentUser.id, inputCode);
      if (isValid) {
        const event = events.find((e) => e.id === pendingEventId);
        if (!event) {
          throw new Error("Event not found");
        }
        await verifyEventWithTransaction(
          pendingEventId,
          currentUser.id,
          event.eventType,
          eventTypeOwnerId,
          t("transactionReasonVerify", {
            eventType: event.eventType,
            createdAt: new Date(event.markedAt).toLocaleString(),
          }),
          t("transactionReasonReceive", {
            eventType: event.eventType,
            createdAt: new Date(event.markedAt).toLocaleString(),
          })
        );
        // Updated to pass owner
        const updatedEvents = await fetchEventsWithCreator(eventType, owner);
        setEvents(updatedEvents);
        calculateMonthlyAchievements(updatedEvents, currentYear, currentMonth);
        updateMarkedDates(updatedEvents, iconColor);
        setVerifyEventModalVisible(false);
        setInputCode("");
        setPendingEventId(null);
        Alert.alert(t("success"), t("eventVerified"));
      } else {
        Alert.alert("Error", t("errorIncorrectCode"));
        setInputCode("");
      }
    } catch (error: any) {
      console.error("Error verifying event:", error);
      Alert.alert("Error", `${t("errorVerifyEvent")}: ${error.message}`);
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
      // Updated to pass owner
      await updateEventType(
        eventType,
        eventTypeOwnerId!,
        newIcon,
        newIconColor
      );
      setIcon(newIcon);
      setIconColor(newIconColor);
      updateMarkedDates(events, newIconColor);
      setEditModalVisible(false);
    } catch (error) {
      console.error("Error updating icon and color:", error);
      Alert.alert("Error", t("errorUpdateIconColor"));
    }
  };

  const renderIconOption = (icon: string) => (
    <IconOption
      key={icon}
      selected={newIcon === icon}
      onPress={() => setNewIcon(icon)}
    >
      <MaterialIcons name={icon} size={40} color={newIconColor} />
    </IconOption>
  );

  const renderColorOption = (color: string) => (
    <ColorOption
      key={color}
      backgroundColor={color}
      selected={newIconColor === color}
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
    isDateValid(selectedDate) &&
    (availability === 0 || selectedDateEvents.length < availability) &&
    (currentUser?.id === eventTypeOwnerId || currentUser?.role_id === 1) &&
    (() => {
      const [year, month, day] = selectedDate.split("-").map(Number);
      const selected = new Date(year, month - 1, day); // Local time
      const today = new Date(); // Local time
      // Set time to 00:00:00 for both to compare dates only
      selected.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      return selected <= today; // Only show button for today or earlier
    })();

  // Added function to determine status message
  const getDateStatusMessage = (): string | null => {
    if (!selectedDate) return null;
    const [year, month, day] = selectedDate.split("-").map(Number);
    const selected = new Date(year, month - 1, day); // Local time
    if (createdAt) {
      const [cYear, cMonth, cDay] = createdAt
        .split("T")[0]
        .split("-")
        .map(Number);
      const created = new Date(cYear, cMonth - 1, cDay); // Local time
      if (selected < created) {
        return t("activityNotStarted");
      }
    }
    if (expirationDate) {
      const [eYear, eMonth, eDay] = expirationDate
        .split("T")[0]
        .split("-")
        .map(Number);
      const expiration = new Date(eYear, eMonth - 1, eDay); // Local time
      if (selected > expiration) {
        return t("activityEnded");
      }
    }
    return null;
  };

  // Calendar theme dependent on current theme
  const calendarTheme = {
    calendarBackground: theme.background.val,
    textSectionTitleColor: theme.text.val,
    selectedDayBackgroundColor: theme.primary.val,
    selectedDayTextColor: theme.modalBackground.val,
    todayTextColor: theme.primary.val,
    dayTextColor: theme.text.val,
    textDisabledColor: theme.gray.val,
    arrowColor: theme.primary.val,
    monthTextColor: theme.text.val,
  };

  if (!currentUser) {
    return (
      <Container>
        <Text color="$text">{t("loading")}</Text>
      </Container>
    );
  }

  return (
    <Container>
      <TitleContainer
        onPress={() => {
          if (currentUser.role_id === 1) {
            setEditModalVisible(true);
          }
        }}
      >
        <LeftContainer>
          <MaterialIcons
            name={icon}
            size={40}
            color={iconColor}
            style={{ marginRight: 10 }}
          />
          <WeightText>{weight}</WeightText>
        </LeftContainer>
        <Title>
          {eventType} | {ownerName}
        </Title>
        <AchievementCountText>
          {monthlyAchievementCount * weight}
        </AchievementCountText>
      </TitleContainer>
      <Calendar
        key={colorScheme}
        onDayPress={handleDayPress}
        onMonthChange={handleMonthChange}
        markedDates={markedDates}
        theme={calendarTheme}
      />
      <EventDisplay>
        {selectedDateEvents.length > 0 ? (
          <ScrollView flexGrow={1}>
            <EventTitle>{t("achievementDetails")}</EventTitle>
            {selectedDateEvents.map((event, index) => (
              <EventItem key={event.id || index}>
                <EventHeader>
                  <EventText>
                    {t("achievement")} {index + 1}
                  </EventText>
                  {event.is_verified ? (
                    <MaterialIcons
                      name="check-circle"
                      size={20}
                      color={theme.verified.val}
                    />
                  ) : (
                    <ActionButtons>
                      {currentUser.role_id === 1 && (
                        <ActionButton
                          onPress={() => handleVerifyEvent(event.id)}
                        >
                          <ActionButtonText>{t("verify")}</ActionButtonText>
                        </ActionButton>
                      )}
                      {(currentUser.id === eventTypeOwnerId ||
                        currentUser.role_id === 1) && (
                        <ActionButton
                          onPress={() => handleDeleteEvent(event.id)}
                        >
                          <ActionButtonText>{t("delete")}</ActionButtonText>
                        </ActionButton>
                      )}
                    </ActionButtons>
                  )}
                </EventHeader>
                <EventText>
                  {t("date")}: {String(event.date)}
                </EventText>
                <EventText>
                  {t("gotAt")}: {new Date(event.markedAt).toLocaleString()}
                </EventText>
                <EventText>
                  {t("createdBy")}: {event.creatorName ?? "Unknown"}
                </EventText>
                <EventText>
                  {t("verified")}: {event.is_verified ? t("yes") : t("no")}
                </EventText>
                {event.note && (
                  <EventText>
                    {t("for")}: {String(event.note)}
                  </EventText>
                )}
                {event.is_verified ? (
                  <>
                    <EventText>
                      {t("verifiedAt")}:{" "}
                      {new Date(event.verified_at!).toLocaleString()}
                    </EventText>
                    <EventText>
                      {t("verifiedBy")}: {event.verifierName ?? t("unknown")}
                    </EventText>
                  </>
                ) : null}
                {event.photoPath && (
                  <EventPhoto
                    source={{ uri: resolvePhotoUri(event.photoPath)! }}
                    onPress={() => openPhotoModal(event.photoPath)}
                  />
                )}
              </EventItem>
            ))}
          </ScrollView>
        ) : (
          <>
            <NoEventText>
              {selectedDate
                ? `${t("noAchievement")} ${selectedDate}`
                : t("noDateSelected")}
            </NoEventText>
            {/* Added status message for invalid dates */}
            {getDateStatusMessage() && (
              <NoEventText>{getDateStatusMessage()}</NoEventText>
            )}
            <MaxAchievementsText>
              {t("maxAchievements", {
                availability:
                  availability === 0 ? t("unlimited") : availability,
              })}
            </MaxAchievementsText>
          </>
        )}
        {showAskStickerButton && (
          <MarkButton onPress={handleAskSticker}>
            <MarkButtonText>
              {currentUser.role_id === 1 ? t("giveSticker") : t("askSticker")}
            </MarkButtonText>
          </MarkButton>
        )}
      </EventDisplay>
      {/* Ask Sticker Modal */}
      <RNModal
        visible={verifyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVerifyModalVisible(false)}
      >
        <ModalContainer>
          <ModalContent>
            <ModalTitle>
              {currentUser.role_id === 1 ? t("giveSticker") : t("askSticker")}
            </ModalTitle>
            <StyledInput
              placeholder={t("notePlaceholder")}
              maxLength={MAX_NOTE_LENGTH}
              value={note}
              onChangeText={setNote}
              multiline
            />
            <CharCount>
              {note.length}/{MAX_NOTE_LENGTH}
            </CharCount>
            <PhotoButtonContainer>
              <PhotoButton onPress={captureImage}>
                <PhotoButtonText>{t("takePhoto")}</PhotoButtonText>
              </PhotoButton>
              <PhotoButton onPress={pickImage}>
                <PhotoButtonText>{t("uploadPhoto")}</PhotoButtonText>
              </PhotoButton>
            </PhotoButtonContainer>
            {photoUri && (
              <PhotoPreview source={{ uri: resolvePhotoUri(photoUri)! }} />
            )}
            <XStack jc="space-between" w="50%" gap="$3">
              <CustomButton
                title={t("cancel")}
                onPress={() => {
                  setVerifyModalVisible(false);
                  setNote("");
                  setPhotoUri(null);
                  setPendingDate(null);
                }}
              />
              <CustomButton title={t("confirm")} onPress={handleVerifyCode} />
            </XStack>
          </ModalContent>
        </ModalContainer>
      </RNModal>
      {/* Delete Event Verification Modal */}
      <RNModal
        visible={deleteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <ModalContainer>
          <ModalContent>
            <ModalTitle>{t("verifyDeleteEvent")}</ModalTitle>
            <StyledInput
              placeholder={t("codePlaceholder")}
              keyboardType="numeric"
              maxLength={4}
              value={inputCode}
              onChangeText={setInputCode}
              secureTextEntry
              autoFocus
            />
            <XStack jc="space-between" w="50%" gap="$3">
              <CustomButton
                title={t("cancel")}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setInputCode("");
                  setPendingEventId(null);
                }}
              />
              <CustomButton title={t("confirm")} onPress={handleVerifyDelete} />
            </XStack>
          </ModalContent>
        </ModalContainer>
      </RNModal>
      {/* Verify Event Verification Modal */}
      <RNModal
        visible={verifyEventModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVerifyEventModalVisible(false)}
      >
        <ModalContainer>
          <ModalContent>
            <ModalTitle>{t("verifyEvent")}</ModalTitle>
            <StyledInput
              placeholder={t("codePlaceholder")}
              keyboardType="numeric"
              maxLength={4}
              value={inputCode}
              onChangeText={setInputCode}
              secureTextEntry
              autoFocus
            />
            <XStack jc="space-between" w="50%" gap="$3">
              <CustomButton
                title={t("cancel")}
                onPress={() => {
                  setVerifyEventModalVisible(false);
                  setInputCode("");
                  setPendingEventId(null);
                }}
              />
              <CustomButton
                title={t("confirm")}
                onPress={handleConfirmVerifyEvent}
              />
            </XStack>
          </ModalContent>
        </ModalContainer>
      </RNModal>
      {/* Photo Modal */}
      <RNModal
        visible={photoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <PhotoModalContainer>
          <GestureDetector gesture={composedGestures}>
            <Animated.Image
              source={{ uri: resolvePhotoUri(selectedPhotoUri) || "" }}
              style={[
                animatedStyle,
                { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
              ]}
              resizeMode="contain"
            />
          </GestureDetector>
          <CloseButton onPress={() => setPhotoModalVisible(false)}>
            <MaterialIcons
              name="close"
              size={30}
              color={theme.modalBackground.val}
            />
          </CloseButton>
        </PhotoModalContainer>
      </RNModal>
      {/* Edit Icon/Color Modal */}
      <RNModal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <ModalContainer>
          <ModalContent>
            <ModalTitle>{t("editIconColor")}</ModalTitle>
            <IconLabel>{t("selectIcon")}</IconLabel>
            <ScrollView
              horizontal
              contentContainerStyle={{ flexGrow: 0, mb: "$2" }}
            >
              {availableIcons.map(renderIconOption)}
            </ScrollView>
            <IconLabel>{t("selectColor")}</IconLabel>
            <ScrollView
              horizontal
              contentContainerStyle={{ flexGrow: 0, mb: "$2" }}
            >
              {availableColors.map(renderColorOption)}
            </ScrollView>
            <XStack jc="space-between" w="50%" gap="$3">
              <CustomButton
                title={t("cancel")}
                onPress={() => {
                  setNewIcon(icon);
                  setNewIconColor(iconColor);
                  setEditModalVisible(false);
                }}
              />
              <CustomButton
                title={t("save")}
                onPress={handleUpdateIconAndColor}
              />
            </XStack>
          </ModalContent>
        </ModalContainer>
      </RNModal>
      {/* Verify Confirmation Modal */}
      <RNModal
        visible={confirmVerifyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setConfirmVerifyModalVisible(false)}
      >
        <ModalContainer>
          <ModalContent>
            <ModalTitle>{t("verifyEvent")}</ModalTitle>
            <ModalText>
              {t("verifyConfirmation", { faceValue: weight })}
            </ModalText>
            <XStack jc="space-between" w="50%" gap="$3">
              <CustomButton
                title={t("cancel")}
                onPress={() => {
                  setConfirmVerifyModalVisible(false);
                  setPendingEventId(null);
                }}
              />
              <CustomButton
                title={t("confirm")}
                onPress={handleConfirmVerification}
              />
            </XStack>
          </ModalContent>
        </ModalContainer>
      </RNModal>
    </Container>
  );
};

export default CalendarView;
