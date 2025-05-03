import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Button,
  Alert,
  Image,
  ScrollView,
} from "react-native";
import { Calendar } from "react-native-calendars";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Event, EventType } from "../types";
import {
  fetchAllEventsWithDetails, // Renamed from fetchAllEventsWithCreator
  getEventTypes,
  getUsers,
} from "../db/database";
import { useLanguage } from "../contexts/LanguageContext";
import { useNavigation } from "@react-navigation/native";
import { styles } from "../styles/calendarViewAllStyles";
import { resolvePhotoUri } from "../utils/fileUtils";

const CalendarViewAll: React.FC = () => {
  const { t, language } = useLanguage();
  const navigation = useNavigation();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [users, setUsers] = useState<{ id: number; name: string }[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<string[]>(["All"]);
  const [tempFilters, setTempFilters] = useState<string[]>(["All"]);
  const [selectedOwnerFilters, setSelectedOwnerFilters] = useState<string[]>(["All"]);
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
        const loadedEvents = await fetchAllEventsWithDetails();
        setEvents(loadedEvents);
        setFilteredEvents(loadedEvents);
        const types = await getEventTypes();
        setEventTypes(types);
        const loadedUsers = await getUsers();
        // Filter users who are owners in event_types
        const ownerIds = types
          .map((t) => t.owner)
          .filter((id): id is number => id !== null);
        const ownerUsers = loadedUsers
          .filter((u) => ownerIds.includes(u.id))
          .map((u) => ({ id: u.id, name: u.name }));
        setUsers(ownerUsers);
        updateMarkedDates(loadedEvents, types);
      } catch (error) {
        console.error("Initialization error:", error);
        Alert.alert("Error", t("errorInitCalendar"));
      }
    };
    initialize();
  }, []);

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
      const type = types.find((t) => t.name === event.eventType);
      const dotColor = type?.iconColor || "#000000";
      if (!marked[event.date]) {
        marked[event.date] = {
          dots: [{ key: event.eventType, color: dotColor }],
        };
      } else if (
        !marked[event.date].dots.some((dot: any) => dot.key === event.eventType)
      ) {
        marked[event.date].dots.push({ key: event.eventType, color: dotColor });
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
        const eventType = eventTypes.find((t) => t.name === event.eventType);
        return eventType?.owner
          ? tempOwnerFilters.includes(eventType.owner.toString())
          : false;
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
    <TouchableOpacity
      style={styles.filterItem}
      onPress={() => toggleFilter(item)}
    >
      <Text style={styles.filterText}>{item}</Text>
      {tempFilters.includes(item) && (
        <MaterialIcons name="check" size={16} color="#007AFF" />
      )}
    </TouchableOpacity>
  );

  const renderOwnerFilterItem = ({
    item,
  }: {
    item: { id: number; name: string };
  }) => (
    <TouchableOpacity
      style={styles.filterItem}
      onPress={() => toggleOwnerFilter(item.id.toString())}
    >
      <Text style={styles.filterText}>{item.name}</Text>
      {tempOwnerFilters.includes(item.id.toString()) && (
        <MaterialIcons name="check" size={16} color="#007AFF" />
      )}
    </TouchableOpacity>
  );

  const renderVerifiedFilterItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.filterItem}
      onPress={() => toggleVerifiedFilter(item)}
    >
      <Text style={styles.filterText}>{t(item.toLowerCase())}</Text>
      {tempVerifiedFilter === item && (
        <MaterialIcons name="check" size={16} color="#007AFF" />
      )}
    </TouchableOpacity>
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
        .map((id) => users.find((u) => u.id.toString() === id)?.name || id)
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

  return (
    <View style={styles.container}>
      <View style={styles.filterHeader}>
        <Text style={styles.filterSummary}>
          {t("filters")}: {getFilterSummary()}
        </Text>
        <Text style={styles.achievementCountText}>
          {monthlyAchievementCount}
        </Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => {
            setTempFilters(selectedFilters);
            setTempOwnerFilters(selectedOwnerFilters);
            setTempVerifiedFilter(verifiedFilter);
            setFilterModalVisible(true);
          }}
        >
          <MaterialIcons name="filter-list" size={24} color="#007AFF" />
          <Text style={styles.filterButtonText}>{t("filterEvents")}</Text>
        </TouchableOpacity>
      </View>
      <Calendar
        onDayPress={handleDayPress}
        onMonthChange={handleMonthChange}
        markedDates={markedDates}
        markingType={"multi-dot"}
        locale={language}
        theme={{
          selectedDayBackgroundColor: "#007AFF",
          todayTextColor: "#007AFF",
          arrowColor: "#007AFF",
        }}
      />
      <View style={styles.eventDisplay}>
        {selectedDateEvents.length > 0 ? (
          <ScrollView style={styles.eventScrollView}>
            <Text style={styles.eventTitle}>
              {t("achievementsOn")} {selectedDate}
            </Text>
            {selectedDateEvents.map((event) => {
              const type = eventTypes.find((t) => t.name === event.eventType);
              return (
                <View key={event.id} style={styles.eventItem}>
                  <MaterialIcons
                    name={type?.icon || "event"}
                    size={16}
                    color={type?.iconColor || "#000000"}
                    style={styles.eventIcon}
                  />
                  <View>
                    <Text style={styles.eventText}>
                      {t("type")}: {event.eventType}
                    </Text>
                    <Text style={styles.eventText}>
                      {t("date")}: {event.date}
                    </Text>
                    <Text style={styles.eventText}>
                      {t("gotAt")}: {new Date(event.markedAt).toLocaleString()}
                    </Text>
                    <View style={styles.verifiedContainer}>
                      <Text style={styles.eventText}>
                        {t("verified")}: {event.is_verified ? t("yes") : t("no")}
                      </Text>
                      {event.is_verified ? (
                        <MaterialIcons
                          name="check-circle"
                          size={16}
                          color="green"
                          style={styles.verifiedIcon}
                        />
                      ) : null}
                    </View>
                    {event.is_verified ? (
                      <>
                        <Text style={styles.eventText}>
                          {t("verifiedAt")}:{" "}
                          {new Date(event.verified_at!).toLocaleString()}
                        </Text>
                        <Text style={styles.eventText}>
                          {t("verifiedBy")}:{" "}
                          {event.verifierName ?? t("unknown")}
                        </Text>
                      </>
                    ) : null}
                    <Text style={styles.eventText}>
                      {t("createdBy")}: {event.creatorName ?? t("unknown")}
                    </Text>
                    <Text style={styles.eventText}>
                      {t("owner")}: {type?.ownerName ?? t("unknown")}
                    </Text>
                    {event.note && (
                      <Text style={styles.eventText}>
                        {t("for")}: {event.note}
                      </Text>
                    )}
                    {event.photoPath && (
                      <TouchableOpacity
                        onPress={() => openPhotoModal(event.photoPath!)}
                      >
                        <Image
                          source={{ uri: resolvePhotoUri(event.photoPath)! }}
                          style={styles.eventPhoto}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <Text style={styles.noEventText}>
            {selectedDate
              ? `${t("noEventsFor")} ${selectedDate}`
              : t("noDateSelected")}
          </Text>
        )}
      </View>
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("selectFilters")}</Text>
            <Text style={styles.filterSectionTitle}>{t("achievementTypes")}</Text>
            <FlatList
              data={["All", ...eventTypes.map((type) => type.name)]}
              renderItem={renderFilterItem}
              keyExtractor={(item) => item}
              style={styles.filterList}
            />
            <Text style={styles.filterSectionTitle}>{t("owners")}</Text>
            <FlatList
              data={users}
              renderItem={renderOwnerFilterItem}
              keyExtractor={(item) => item.id.toString()}
              style={styles.filterList}
            />
            <Text style={styles.filterSectionTitle}>
              {t("verificationStatus")}
            </Text>
            <FlatList
              data={["All", "Verified", "Unverified"]}
              renderItem={renderVerifiedFilterItem}
              keyExtractor={(item) => item}
              style={styles.filterList}
            />
            <View style={styles.modalButtonContainer}>
              <Button
                title={t("cancel")}
                onPress={() => setFilterModalVisible(false)}
              />
              <Button title={t("done")} onPress={applyFilters} />
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
              source={{ uri: resolvePhotoUri(selectedPhotoUri) || "" }}
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
    </View>
  );
};

export default CalendarViewAll;