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
  Dimensions,
  ScrollView, // Added for scrolling
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
import { fetchAllEvents, getEventTypes } from "../db/database";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const CalendarViewAll: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<string[]>(["All"]);
  const [tempFilters, setTempFilters] = useState<string[]>(["All"]);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [markedDates, setMarkedDates] = useState<{ [key: string]: any }>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDateEvents, setSelectedDateEvents] = useState<Event[]>([]);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);

  // Zoom and pan state for photo modal
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Load events and event types
  useEffect(() => {
    const initialize = async () => {
      try {
        const loadedEvents = await fetchAllEvents();
        setEvents(loadedEvents);
        setFilteredEvents(loadedEvents);
        const types = await getEventTypes();
        setEventTypes(types);
        updateMarkedDates(loadedEvents, types);
      } catch (error) {
        console.error("Initialization error:", error);
        Alert.alert("Error", "Failed to initialize calendar.");
      }
    };
    initialize();
  }, []);

  // Update marked dates with multiple dots for different event types
  const updateMarkedDates = (events: Event[], types: EventType[]) => {
    const marked: { [key: string]: any } = {};
    events.forEach((event) => {
      const type = types.find((t) => t.name === event.eventType);
      const dotColor = type?.iconColor || "#000000";
      if (!marked[event.date]) {
        marked[event.date] = { dots: [{ key: event.eventType, color: dotColor }] };
      } else if (!marked[event.date].dots.some((dot: any) => dot.key === event.eventType)) {
        marked[event.date].dots.push({ key: event.eventType, color: dotColor });
      }
    });
    setMarkedDates(marked);
  };

  // Handle filter changes in the modal
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

  // Apply filters when modal is closed
  const applyFilters = () => {
    setSelectedFilters(tempFilters);
    setFilterModalVisible(false);
  };

  // Update filtered events and marked dates when filters change
  useEffect(() => {
    if (selectedFilters.includes("All")) {
      setFilteredEvents(events);
    } else {
      setFilteredEvents(events.filter((event) => selectedFilters.includes(event.eventType)));
    }
  }, [selectedFilters, events]);

  // Update marked dates and selected date events when filtered events change
  useEffect(() => {
    updateMarkedDates(filteredEvents, eventTypes);
    if (selectedDate) {
      const dateEvents = filteredEvents.filter((event) => event.date === selectedDate);
      setSelectedDateEvents(dateEvents);
    }
  }, [filteredEvents, eventTypes, selectedDate]);

  const handleDayPress = (day: { dateString: string }) => {
    const date = day.dateString;
    setSelectedDate(date);
    const dateEvents = filteredEvents.filter((event) => event.date === date);
    setSelectedDateEvents(dateEvents);
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

  const getFilterSummary = () => {
    if (selectedFilters.includes("All")) {
      return "All";
    }
    return selectedFilters.join(", ") || "None";
  };

  // Open photo modal
  const openPhotoModal = (uri: string) => {
    setSelectedPhotoUri(uri);
    setPhotoModalVisible(true);
    // Reset zoom and pan
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  // Pinch gesture for zooming
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = savedScale.value * event.scale;
      if (scale.value < 1) scale.value = 1;
      if (scale.value > 3) scale.value = 3;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  // Pan gesture for moving
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

  // Combine gestures
  const composedGestures = Gesture.Simultaneous(pinchGesture, panGesture);

  // Animated style for image
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
        <Text style={styles.filterSummary}>Filters: {getFilterSummary()}</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => {
            setTempFilters(selectedFilters);
            setFilterModalVisible(true);
          }}
        >
          <MaterialIcons name="filter-list" size={24} color="#007AFF" />
          <Text style={styles.filterButtonText}>Filter Events</Text>
        </TouchableOpacity>
      </View>
      <Calendar
        onDayPress={handleDayPress}
        markedDates={markedDates}
        markingType={"multi-dot"}
        theme={{
          selectedDayBackgroundColor: "#007AFF",
          todayTextColor: "#007AFF",
          arrowColor: "#007AFF",
        }}
      />
      <View style={styles.eventDisplay}>
        {selectedDateEvents.length > 0 ? (
          <ScrollView style={styles.eventScrollView}>
            <Text style={styles.eventTitle}>Events on {selectedDate}</Text>
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
                    <Text style={styles.eventText}>Type: {event.eventType}</Text>
                    <Text style={styles.eventText}>Date: {event.date}</Text>
                    <Text style={styles.eventText}>
                      Marked At: {new Date(event.markedAt).toLocaleString()}
                    </Text>
                    {event.note && <Text style={styles.eventText}>Note: {event.note}</Text>}
                    {event.photoPath && (
                      <TouchableOpacity onPress={() => openPhotoModal(event.photoPath)}>
                        <Image source={{ uri: event.photoPath }} style={styles.eventPhoto} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <Text style={styles.noEventText}>
            {selectedDate ? `No events for ${selectedDate}` : "No date selected"}
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
            <Text style={styles.modalTitle}>Select Filters</Text>
            <FlatList
              data={["All", ...eventTypes.map((type) => type.name)]}
              renderItem={renderFilterItem}
              keyExtractor={(item) => item}
              style={styles.filterList}
            />
            <View style={styles.modalButtonContainer}>
              <Button
                title="Cancel"
                onPress={() => setFilterModalVisible(false)}
              />
              <Button title="Done" onPress={applyFilters} />
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  filterSummary: {
    fontSize: 14,
    color: "#333",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#e0f0ff",
    borderRadius: 5,
  },
  filterButtonText: {
    fontSize: 14,
    color: "#007AFF",
    marginLeft: 5,
  },
  filterList: {
    maxHeight: 300,
  },
  filterItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  filterText: {
    fontSize: 14,
    flex: 1,
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
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  eventDisplay: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    flex: 1, // Ensure eventDisplay takes available space
  },
  eventScrollView: { // Added for ScrollView
    flexGrow: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  eventItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  eventIcon: {
    marginRight: 10,
  },
  eventText: {
    fontSize: 14,
  },
  eventPhoto: {
    width: 100,
    height: 100,
    borderRadius: 5,
    marginTop: 10,
  },
  noEventText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
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
});

export default CalendarViewAll;