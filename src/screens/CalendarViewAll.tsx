import React, { useEffect, useState } from "react";
import { Alert, Dimensions, Modal as RNModal, Appearance } from "react-native";
import { Calendar } from "react-native-calendars";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
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
  Separator,
} from "tamagui";
import { useNavigation } from "@react-navigation/native";
import { useLanguage } from "../contexts/LanguageContext";
import { Event, EventType } from "../types";
import {
  fetchAllEventsWithDetails,
  getEventTypes,
  getUsers,
} from "../db/database";
import { resolvePhotoUri } from "../utils/fileUtils";
import { CustomButton } from "../components/SharedComponents";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Styled components (unchanged)
const Container = styled(YStack, {
  flex: 1,
  p: "$4",
  bg: "$background",
});

const FilterHeader = styled(XStack, {
  jc: "space-between",
  ai: "center",
  mb: "$2",
});

const FilterSummary = styled(Text, {
  fontSize: "$3",
  color: "$text",
  flex: 1,
});

const AchievementCountText = styled(Text, {
  fontSize: "$3",
  fontWeight: "bold",
  color: "$gray",
  flex: 1,
  ta: "center",
});

const FilterButton = styled(XStack, {
  flexDirection: "row",
  ai: "center",
  p: "$2",
  bg: "$selectedBackground",
  br: "$2",
});

const FilterButtonText = styled(Text, {
  fontSize: "$3",
  color: "$primary",
  ml: "$2",
});

const FilterItem = styled(XStack, {
  flexDirection: "row",
  ai: "center",
  p: "$3",
  borderBottomWidth: 1,
  borderBottomColor: "$border",
});

const FilterText = styled(Text, {
  fontSize: "$3",
  color: "$text",
  flex: 1,
});

const FilterSectionTitle = styled(Text, {
  fontSize: "$4",
  fontWeight: "bold",
  mt: "$2",
  mb: "$1",
  color: "$text",
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
  maxHeight: "80%",
});

const ModalTitle = styled(Text, {
  fontSize: "$5",
  fontWeight: "bold",
  mb: "$2",
  color: "$text",
});

const ModalButtonContainer = styled(XStack, {
  jc: "space-between",
  mt: "$2",
  w: "50%",
  gap: "$3",
});

const EventDisplay = styled(YStack, {
  mt: "$4",
  p: "$3",
  bg: "$lightGray",
  br: "$2",
  borderWidth: 1,
  borderColor: "$border",
  f: 1,
});

const EventTitle = styled(Text, {
  fontSize: "$4",
  fontWeight: "bold",
  mb: "$2",
  color: "$text",
});

const EventItem = styled(XStack, {
  flexDirection: "row",
  ai: "center",
  mb: "$2",
});

const EventText = styled(Text, {
  fontSize: "$3",
  color: "$text",
});

const VerifiedContainer = styled(XStack, {
  flexDirection: "row",
  ai: "center",
});

const EventPhoto = styled(Image, {
  w: 100,
  h: 100,
  br: "$2",
  mt: "$2",
});

const NoEventText = styled(Text, {
  fontSize: "$3",
  color: "$gray",
  ta: "center",
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

const CalendarViewAll: React.FC = () => {
  const { t, language } = useLanguage();
  const navigation = useNavigation();
  const theme = useTheme();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [users, setUsers] = useState<{ id: number; name: string }[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<string[]>(["All"]);
  const [tempFilters, setTempFilters] = useState<string[]>(["All"]);
  const [selectedOwnerFilters, setSelectedOwnerFilters] = useState<string[]>([
    "All",
  ]);
  const [tempOwnerFilters, setTempOwnerFilters] = useState<string[]>(["All"]);
  const [verifiedFilter, setVerifiedFilter] = useState<string>("All");
  const [tempVerifiedFilter, setTempVerifiedFilter] = useState<string>("All");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [markedDates, setMarkedDates] = useState<{ [key: string]: any }>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDateEvents, setSelectedDateEvents] = useState<Event[]>([]);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);
  const [currentYear, setCurrentYear] = useState<number>(
    new Date().getFullYear()
  );
  const [currentMonth, setCurrentMonth] = useState<number>(
    new Date().getMonth() + 1
  );
  const [monthlyAchievementCount, setMonthlyAchievementCount] =
    useState<number>(0);
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
        const loadedEvents = await fetchAllEventsWithDetails();
        setEvents(loadedEvents);
        setFilteredEvents(loadedEvents);
        const types = await getEventTypes();
        setEventTypes(types);
        const loadedUsers = await getUsers();
        const ownerIds = [
          ...new Set(
            types.map((t) => t.owner).filter((id): id is number => id !== null)
          ),
        ];
        const ownerUsers = loadedUsers
          .filter((u) => ownerIds.includes(u.id))
          .map((u) => ({ id: u.id, name: u.name }));
        setUsers([{ id: 0, name: "All" }, ...ownerUsers]); // Add "All" option
        updateMarkedDates(loadedEvents, types);
      } catch (error) {
        console.error("Initialization error:", error);
        Alert.alert("Error", t("errorInitCalendar"));
      }
    };
    initialize();
  }, [t]);

  useEffect(() => {
    navigation.setOptions({
      title: t("calendarViewAll"),
    });
  }, [navigation, t]);

  useEffect(() => {
    calculateMonthlyAchievements(filteredEvents, currentYear, currentMonth);
  }, [filteredEvents, currentYear, currentMonth]);

  const updateMarkedDates = (events: Event[], types: EventType[]) => {
    const marked: { [key: string]: any } = {};
    events.forEach((event) => {
      // Match eventType and owner for uniqueness
      const type = types.find(
        (t) => t.name === event.eventType && t.owner === event.owner
      );
      const dotColor = type?.iconColor || "#000000";
      const dotKey = `${event.eventType}-${event.owner || "null"}`; // Unique key for eventType and owner
      if (!marked[event.date]) {
        marked[event.date] = {
          dots: [{ key: dotKey, color: dotColor }],
        };
      } else if (
        !marked[event.date].dots.some((dot: any) => dot.key === dotKey)
      ) {
        marked[event.date].dots.push({ key: dotKey, color: dotColor });
      }
    });
    setMarkedDates(marked);
  };

  const toggleFilter = (filter: string) => {
    setTempFilters((prev) => {
      if (filter === "All") {
        return ["All"];
      }
      if (prev.includes("All")) {
        return [filter];
      }
      if (prev.includes(filter)) {
        const newFilters = prev.filter((f) => f !== filter);
        return newFilters.length > 0 ? newFilters : ["All"];
      }
      return [...prev, filter];
    });
  };

  const toggleOwnerFilter = (ownerId: string) => {
    setTempOwnerFilters((prev) => {
      if (ownerId === "All") {
        return ["All"];
      }
      if (prev.includes("All")) {
        return [ownerId];
      }
      if (prev.includes(ownerId)) {
        const newFilters = prev.filter((f) => f !== ownerId);
        return newFilters.length > 0 ? newFilters : ["All"];
      }
      return [...prev, ownerId];
    });
  };

  const toggleVerifiedFilter = (status: string) => {
    setTempVerifiedFilter(status);
  };

  const applyFilters = () => {
    setSelectedFilters(tempFilters);
    setSelectedOwnerFilters(tempOwnerFilters);
    setVerifiedFilter(tempVerifiedFilter);
    setFilterModalVisible(false);

    let filtered = events;
    if (!tempFilters.includes("All")) {
      filtered = filtered.filter((event) =>
        tempFilters.includes(event.eventType)
      );
    }
    if (!tempOwnerFilters.includes("All")) {
      filtered = filtered.filter((event) => {
        const eventType = eventTypes.find(
          (t) => t.name === event.eventType && t.owner === event.owner
        );
        return (
          eventType &&
          tempOwnerFilters.includes(eventType.owner?.toString() || "null")
        );
      });
    }
    if (tempVerifiedFilter === "Verified") {
      filtered = filtered.filter((event) => event.is_verified);
    } else if (tempVerifiedFilter === "Unverified") {
      filtered = filtered.filter((event) => !event.is_verified);
    }
    setFilteredEvents(filtered);
    updateMarkedDates(filtered, eventTypes);
  };

  useEffect(() => {
    if (selectedDate) {
      const dateEvents = filteredEvents.filter(
        (event) => event.date === selectedDate
      );
      setSelectedDateEvents(dateEvents);
    }
  }, [filteredEvents, selectedDate]);

  const handleDayPress = (day: { dateString: string }) => {
    const date = day.dateString;
    setSelectedDate(date);
    const dateEvents = filteredEvents.filter((event) => event.date === date);
    setSelectedDateEvents(dateEvents);
  };

  const handleMonthChange = (month: { year: number; month: number }) => {
    setCurrentYear(month.year);
    setCurrentMonth(month.month);
  };

  const renderFilterItem = ({ item }: { item: string }) => (
    <FilterItem key={item} onPress={() => toggleFilter(item)}>
      <FilterText>{item}</FilterText>
      {tempFilters.includes(item) && (
        <MaterialIcons name="check" size={16} color={theme.primary.val} />
      )}
    </FilterItem>
  );

  const renderOwnerFilterItem = ({
    item,
  }: {
    item: { id: number; name: string };
  }) => (
    <FilterItem
      key={item.id.toString()}
      onPress={() => toggleOwnerFilter(item.id.toString())}
    >
      <FilterText>{item.name}</FilterText>
      {tempOwnerFilters.includes(item.id.toString()) && (
        <MaterialIcons name="check" size={16} color={theme.primary.val} />
      )}
    </FilterItem>
  );

  const renderVerifiedFilterItem = ({ item }: { item: string }) => (
    <FilterItem key={item} onPress={() => toggleVerifiedFilter(item)}>
      <FilterText>{t(item.toLowerCase())}</FilterText>
      {tempVerifiedFilter === item && (
        <MaterialIcons name="check" size={16} color={theme.primary.val} />
      )}
    </FilterItem>
  );

  const getFilterSummary = () => {
    const parts = [];
    if (selectedFilters.includes("All")) {
      parts.push(t("allTypes"));
    } else {
      parts.push(selectedFilters.join(", ") || t("none"));
    }
    if (selectedOwnerFilters.includes("All")) {
      parts.push(t("allOwners"));
    } else {
      const ownerNames = selectedOwnerFilters
        .map((id) => {
          if (id === "0") return t("allOwners");
          return users.find((u) => u.id.toString() === id)?.name || id;
        })
        .join(", ");
      parts.push(ownerNames || t("none"));
    }
    parts.push(t(verifiedFilter.toLowerCase()));
    return parts.join(" | ");
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

  // Calendar theme (unchanged)
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

  return (
    <Container>
      <FilterHeader>
        <FilterSummary>
          {t("filters")}: {getFilterSummary()}
        </FilterSummary>
        <AchievementCountText>{monthlyAchievementCount}</AchievementCountText>
        <FilterButton
          onPress={() => {
            setTempFilters(selectedFilters);
            setTempOwnerFilters(selectedOwnerFilters);
            setTempVerifiedFilter(verifiedFilter);
            setFilterModalVisible(true);
          }}
        >
          <MaterialIcons
            name="filter-list"
            size={24}
            color={theme.primary.val}
          />
          <FilterButtonText>{t("filterEvents")}</FilterButtonText>
        </FilterButton>
      </FilterHeader>
      <Calendar
        key={colorScheme}
        onDayPress={handleDayPress}
        onMonthChange={handleMonthChange}
        markedDates={markedDates}
        markingType={"multi-dot"}
        locale={language}
        theme={calendarTheme}
      />
      <EventDisplay>
        {selectedDateEvents.length > 0 ? (
          <ScrollView flexGrow={1}>
            <EventTitle>
              {t("achievementsOn")} {selectedDate}
            </EventTitle>
            {selectedDateEvents.map((event, index) => {
              const type = eventTypes.find(
                (t) => t.name === event.eventType && t.owner === event.owner
              );
              return (
                <YStack
                  key={`${event.id}-${event.eventType}-${
                    event.owner || "null"
                  }`}
                >
                  <EventItem>
                    <YStack>
                      <XStack ai="center">
                        <EventText fontWeight={"bold"}>
                          {t("type")}: {event.eventType}
                        </EventText>
                        <MaterialIcons
                          name={type?.icon || "event"}
                          size={16}
                          color={type?.iconColor || "#000000"}
                          style={{ marginLeft: 5 }}
                        />
                      </XStack>
                      <EventText>
                        {t("date")}: {event.date}
                      </EventText>
                      <EventText>
                        {t("gotAt")}:{" "}
                        {new Date(event.markedAt).toLocaleString()}
                      </EventText>
                      <VerifiedContainer>
                        <EventText>
                          {t("verified")}:{" "}
                          {event.is_verified ? t("yes") : t("no")}
                        </EventText>
                        {event.is_verified ? (
                          <MaterialIcons
                            name="check-circle"
                            size={16}
                            color={theme.verified.val}
                            style={{ marginLeft: 5 }}
                          />
                        ) : null}
                      </VerifiedContainer>
                      {event.is_verified ? (
                        <>
                          <EventText>
                            {t("verifiedAt")}:{" "}
                            {new Date(event.verified_at!).toLocaleString()}
                          </EventText>
                          <EventText>
                            {t("verifiedBy")}:{" "}
                            {event.verifierName ?? t("unknown")}
                          </EventText>
                        </>
                      ) : null}
                      <EventText>
                        {t("createdBy")}: {event.creatorName ?? t("unknown")}
                      </EventText>
                      <EventText>
                        {t("owner")}: {event?.ownerName ?? t("unknown")}
                      </EventText>
                      {event.note && (
                        <EventText>
                          {t("for")}: {event.note}
                        </EventText>
                      )}
                      {event.photoPath && (
                        <EventPhoto
                          source={{ uri: resolvePhotoUri(event.photoPath)! }}
                          onPress={() => openPhotoModal(event.photoPath!)}
                        />
                      )}
                    </YStack>
                  </EventItem>
                  {index < selectedDateEvents.length - 1 && (
                    <Separator
                      borderColor="$border"
                      marginVertical="$2"
                      alignSelf="stretch"
                    />
                  )}
                </YStack>
              );
            })}
          </ScrollView>
        ) : (
          <NoEventText>
            {selectedDate
              ? `${t("noEventsFor")} ${selectedDate}`
              : t("noDateSelected")}
          </NoEventText>
        )}
      </EventDisplay>
      <RNModal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <ModalContainer>
          <ModalContent>
            <ModalTitle>{t("selectFilters")}</ModalTitle>
            <FilterSectionTitle>{t("achievementTypes")}</FilterSectionTitle>
            <ScrollView style={{ maxHeight: 150 }}>
              {["All", ...new Set(eventTypes.map((type) => type.name))].map(
                (item) => renderFilterItem({ item })
              )}
            </ScrollView>
            <FilterSectionTitle>{t("owners")}</FilterSectionTitle>
            <ScrollView style={{ maxHeight: 150 }}>
              {users.map((item) => renderOwnerFilterItem({ item }))}
            </ScrollView>
            <FilterSectionTitle>{t("verificationStatus")}</FilterSectionTitle>
            <ScrollView style={{ maxHeight: 150 }}>
              {["All", "Verified", "Unverified"].map((item) =>
                renderVerifiedFilterItem({ item })
              )}
            </ScrollView>
            <ModalButtonContainer>
              <CustomButton
                title={t("cancel")}
                onPress={() => setFilterModalVisible(false)}
              />
              <CustomButton title={t("done")} onPress={applyFilters} />
            </ModalButtonContainer>
          </ModalContent>
        </ModalContainer>
      </RNModal>
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
    </Container>
  );
};

export default CalendarViewAll;
