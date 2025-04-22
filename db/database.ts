import * as SQLite from "expo-sqlite";
import { EventType } from "../types";

export const initDatabase = async () => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", {useNewConnection: true});
  try {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS event_types (
        name TEXT PRIMARY KEY,
        icon TEXT NOT NULL,
        iconColor TEXT NOT NULL,
        availability INTEGER NOT NULL DEFAULT 0
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

export const insertEventType = async (name: string, icon: string, iconColor: string, availability: number) => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db");
  try {
    const result = await db.runAsync(
      "INSERT INTO event_types (name, icon, iconColor, availability) VALUES (?, ?, ?, ?);",
      [name, icon, iconColor, availability]
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
    throw new Error(`Failed to fetch all stickers: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

export const getEventTypes = async () => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", {useNewConnection: true});
  try {
    let types = await db.getAllAsync<EventType>("SELECT * FROM event_types;");
    return types;
  } catch (error) {
    throw new Error(`Failed to get event types: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

export const updateEventType = async (name: string, icon: string, iconColor: string) => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db");
  try {
    await db.runAsync(
      "UPDATE event_types SET icon = ?, iconColor = ? WHERE name = ?;",
      [icon, iconColor, name]
    );
  } catch (error) {
    throw new Error(`Failed to update event type: ${error}`);
  } finally {
    await db.closeAsync();
  }
};