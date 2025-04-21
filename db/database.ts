import * as SQLite from "expo-sqlite";
import { Event, EventType } from "../types";
import AsyncStorage from "@react-native-async-storage/async-storage";

const db = SQLite.openDatabaseSync("eventMarker.db");

export const initDatabase = async (): Promise<void> => {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        markedAt TEXT NOT NULL,
        eventType TEXT NOT NULL,
        UNIQUE(date, eventType)
      );
    `);

    // Initialize default event type if not exists
    const eventTypes = await AsyncStorage.getItem("eventTypes");
    if (!eventTypes) {
      await AsyncStorage.setItem("eventTypes", JSON.stringify([{ name: "Default" }]));
    }
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
};

export const insertEvent = async (date: string, markedAt: string, eventType: string): Promise<number> => {
  try {
    if (!date || !markedAt || !date.match(/^\d{4}-\d{2}-\d{2}$/) || !markedAt.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)) {
      throw new Error("Invalid date or markedAt format");
    }
    if (!eventType || eventType.length > 20) {
      throw new Error("Invalid event type");
    }

    const result = await db.runAsync(
      `INSERT INTO events (date, markedAt, eventType) VALUES (?, ?, ?);`,
      [date, markedAt, eventType]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error("Error inserting event:", error);
    throw error;
  }
};

export const fetchEvents = async (eventType: string): Promise<Event[]> => {
  try {
    const result = await db.getAllAsync<Event>(
      `SELECT * FROM events WHERE eventType = ?;`,
      [eventType]
    );
    return result;
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
};

export const getEventTypes = async (): Promise<EventType[]> => {
  try {
    const eventTypes = await AsyncStorage.getItem("eventTypes");
    return eventTypes ? JSON.parse(eventTypes) : [];
  } catch (error) {
    console.error("Error fetching event types:", error);
    return [];
  }
};

export const addEventType = async (name: string): Promise<void> => {
  try {
    if (!name || name.length > 20 || !name.match(/^[a-zA-Z0-9\s]+$/)) {
      throw new Error("Event type name must be 1-20 alphanumeric characters.");
    }
    const eventTypes = await getEventTypes();
    if (eventTypes.some((type) => type.name === name)) {
      throw new Error("Event type already exists.");
    }
    const updatedTypes = [...eventTypes, { name }];
    await AsyncStorage.setItem("eventTypes", JSON.stringify(updatedTypes));
  } catch (error) {
    console.error("Error adding event type:", error);
    throw error;
  }
};