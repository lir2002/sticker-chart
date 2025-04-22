import * as SQLite from "expo-sqlite";
import { EventType } from "../types";

export const initDatabase = async () => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db");
  try {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS event_types (
        name TEXT PRIMARY KEY,
        icon TEXT NOT NULL,
        iconColor TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        markedAt TEXT NOT NULL,
        eventType TEXT NOT NULL,
        note TEXT,
        photoPath TEXT,
        FOREIGN KEY (eventType) REFERENCES event_types(name)
      );
    `);
  } catch (error) {
    throw new Error(`Failed to initialize database: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

export const insertEventType = async (name: string, icon: string, iconColor: string) => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db");
  try {
    const result = await db.runAsync(
      "INSERT INTO event_types (name, icon, iconColor) VALUES (?, ?, ?);",
      [name, icon, iconColor]
    );
    return result.lastInsertRowId || 0;
  } catch (error) {
    throw new Error(`Failed to insert event type: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

export const insertEvent = async (
  date: string,
  markedAt: string,
  eventType: string,
  note?: string,
  photoPath?: string
) => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db");
  try {
    const result = await db.runAsync(
      "INSERT INTO events (date, markedAt, eventType, note, photoPath) VALUES (?, ?, ?, ?, ?);",
      [date, markedAt, eventType, note || null, photoPath || null]
    );
    return result.lastInsertRowId || 0;
  } catch (error) {
    throw new Error(`Failed to insert event: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

export const fetchEvents = async (eventType: string) => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db");
  try {
    const events = await db.getAllAsync<Event>(
      "SELECT * FROM events WHERE eventType = ?;",
      [eventType]
    );
    return events;
  } catch (error) {
    throw new Error(`Failed to fetch events: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

export const fetchAllEvents = async () => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db");
  try {
    const events = await db.getAllAsync<Event>("SELECT * FROM events;");
    return events;
  } catch (error) {
    throw new Error(`Failed to fetch all events: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

export const getEventTypes = async () => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db");
  try {
    let types = await db.getAllAsync<EventType>("SELECT * FROM event_types;");
    if (!types.find((t) => t.name === "Default")) {
      const defaultType: EventType = {
        name: "Default",
        icon: "event",
        iconColor: "#000000",
      };
      await db.runAsync(
        "INSERT INTO event_types (name, icon, iconColor) VALUES (?, ?, ?);",
        [defaultType.name, defaultType.icon, defaultType.iconColor]
      );
      types = [...types, defaultType];
    }
    return types;
  } catch (error) {
    throw new Error(`Failed to get event types: ${error}`);
  } finally {
    await db.closeAsync();
  }
};