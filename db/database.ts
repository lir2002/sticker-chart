import * as SQLite from "expo-sqlite";
import { Event } from "../types";

const db = SQLite.openDatabaseSync("eventMarker.db");

export const initDatabase = async (): Promise<void> => {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        markedAt TEXT NOT NULL
      );
    `);
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
};

export const insertEvent = async (date: string, markedAt: string): Promise<number> => {
  try {
    if (!date || !markedAt || !date.match(/^\d{4}-\d{2}-\d{2}$/) || !markedAt.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)) {
      throw new Error("Invalid date or markedAt format");
    }

    const result = await db.runAsync(
      `INSERT INTO events (date, markedAt) VALUES (?, ?);`,
      [date, markedAt]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error("Error inserting event:", error);
    throw error;
  }
};

export const fetchEvents = async (): Promise<Event[]> => {
  try {
    const result = await db.getAllAsync<Event>(`SELECT * FROM events;`);
    return result;
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
};