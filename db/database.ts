import * as SQLite from "expo-sqlite";
import { Event, EventType, User } from "../types";

// Current database version
const CURRENT_DB_VERSION = 1;

export const initDatabase = async () => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
  try {
    await db.withTransactionAsync(async () => {
      // Create version table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS db_version (
          version INTEGER PRIMARY KEY
        );
      `);

      // Check current version
      const versionRecord = await db.getFirstAsync<{ version: number }>(
        "SELECT version FROM db_version;"
      );
      const currentVersion = versionRecord?.version || 0;

      if (currentVersion >= CURRENT_DB_VERSION) {
        // Database is up-to-date, no need for initialization or migration
        return;
      }

      if (currentVersion === 0) {
        // First initialization: create all tables and insert initial data
        await db.execAsync(`
          PRAGMA journal_mode = WAL;

          -- Create roles table
          CREATE TABLE IF NOT EXISTS roles (
            role_id INTEGER PRIMARY KEY AUTOINCREMENT,
            role_name TEXT NOT NULL UNIQUE
          );

          -- Initialize role data
          INSERT OR IGNORE INTO roles (role_name) VALUES ('Admin');
          INSERT OR IGNORE INTO roles (role_name) VALUES ('Guest');
          INSERT OR IGNORE INTO roles (role_name) VALUES ('User');

          -- Create users table
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            role_id INTEGER NOT NULL,
            code INTEGER NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            icon TEXT,createUser


            FOREIGN KEY (role_id) REFERENCES roles(role_id)
          );

          -- Insert initial admin user
          INSERT OR IGNORE INTO users (name, role_id, code, is_active, created_at, updated_at, icon)
          VALUES ('Admin', 1, 0, 1, '${new Date().toISOString()}', '${new Date().toISOString()}', NULL);

          -- Insert initial Guest user
          INSERT OR IGNORE INTO users (name, role_id, code, is_active, created_at, updated_at, icon)
          VALUES ('Guest', 2, 0, 1, '${new Date().toISOString()}', '${new Date().toISOString()}', NULL);

          -- Create event_types table
          CREATE TABLE IF NOT EXISTS event_types (
            name TEXT PRIMARY KEY,
            icon TEXT NOT NULL,
            iconColor TEXT NOT NULL,
            availability INTEGER NOT NULL DEFAULT 0,
            owner INTEGER,
            weight INTEGER NOT NULL DEFAULT 1 CHECK (weight >= 1),
            FOREIGN KEY (owner) REFERENCES users(id)
          );

          -- Create events table
          CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            markedAt TEXT NOT NULL,
            eventType TEXT NOT NULL,
            note TEXT,
            photoPath TEXT,
            created_by INTEGER,
            is_verified INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (eventType) REFERENCES event_types(name),
            FOREIGN KEY (created_by) REFERENCES users(id)
          );
        `);

        // Check if old tables (event_types_old or events_old) exist for migration
        const tables = await db.getAllAsync<{ name: string }>(
          "SELECT name FROM sqlite_master WHERE type='table';"
        );
        const tableNames = tables.map((t) => t.name);

        if (tableNames.includes("event_types_old") || tableNames.includes("events_old")) {
          // Get admin user ID
          const adminUser = await db.getFirstAsync<{ id: number }>(
            "SELECT id FROM users WHERE name = 'Admin';"
          );
          const adminId = adminUser?.id;
          if (!adminId) {
            throw new Error("Failed to retrieve admin user ID");
          }

          // Migrate event_types_old (if exists)
          if (tableNames.includes("event_types_old")) {
            await db.execAsync(`
              INSERT INTO event_types (name, icon, iconColor, availability, owner, weight)
              SELECT name, icon, iconColor, availability, ${adminId}, 1
              FROM event_types_old;
              DROP TABLE IF EXISTS event_types_old;
            `);
          }

          // Migrate events_old (if exists)
          if (tableNames.includes("events_old")) {
            await db.execAsync(`
              INSERT INTO events (id, date, markedAt, eventType, note, photoPath, created_by, is_verified)
              SELECT id, date, markedAt, eventType, note, photoPath, ${adminId}, 0
              FROM events_old;
              DROP TABLE IF EXISTS events_old;
            `);
          }
        }
      }

      // Update version number
      await db.runAsync(
        "INSERT OR REPLACE INTO db_version (version) VALUES (?);",
        [CURRENT_DB_VERSION]
      );
    });
    console.log("Database initialized successfully");
  } catch (error) {
    throw new Error(`Failed to initialize database: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

export const insertEventType = async (
  name: string,
  icon: string,
  iconColor: string,
  availability: number,
  owner?: number,
  weight: number = 1
) => {
  if (weight < 1) {
    throw new Error("Weight must be at least 1");
  }
  const db = await SQLite.openDatabaseAsync("eventmarker.db", {useNewConnection: true});
  try {
    const result = await db.runAsync(
      "INSERT INTO event_types (name, icon, iconColor, availability, owner, weight) VALUES (?, ?, ?, ?, ?, ?);",
      [name, icon, iconColor, availability, owner || null, weight]
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
  createdBy: number,
  note?: string,
  photoPath?: string,
  isVerified: boolean = false
) => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", {useNewConnection: true});
  try {
    const result = await db.runAsync(
      "INSERT INTO events (date, markedAt, eventType, created_by, note, photoPath, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?);",
      [date, markedAt, eventType, createdBy, note || null, photoPath || null, isVerified ? 1 : 0]
    );
    return result.lastInsertRowId || 0;
  } catch (error) {
    throw new Error(`Failed to insert event: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

export const fetchEvents = async (eventType: string) => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", {useNewConnection: true});
  try {
    const events = await db.getAllAsync<Event>(
      "SELECT id, date, markedAt, eventType, note, photoPath, created_by, is_verified FROM events WHERE eventType = ?;",
      [eventType]
    );
    return events;
  } catch (error) {
    throw new Error(`Failed to fetch events: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

export const fetchEventsWithCreator = async (eventType: string) => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
  try {
    const events = await db.getAllAsync<Event>(
      `SELECT e.id, e.date, e.markedAt, e.eventType, e.note, e.photoPath, 
              e.created_by, e.is_verified, u.name as creatorName
       FROM events e
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.eventType = ?;`,
      [eventType]
    );
    return events;
  } catch (error) {
    throw new Error(`Failed to fetch events with creator: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

export const fetchAllEventsWithCreator = async () => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
  try {
    const events = await db.getAllAsync<Event>(
      `SELECT e.id, e.date, e.markedAt, e.eventType, e.note, e.photoPath, 
              e.created_by, e.is_verified, u.name as creatorName
       FROM events e
       LEFT JOIN users u ON e.created_by = u.id;`
    );
    return events;
  } catch (error) {
    throw new Error(`Failed to fetch all events with creator: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

export const fetchAllEvents = async () => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", {useNewConnection: true});
  try {
    const events = await db.getAllAsync<Event>(
      "SELECT id, date, markedAt, eventType, note, photoPath, created_by, is_verified FROM events;"
    );
    return events;
  } catch (error) {
    throw new Error(`Failed to fetch all stickers: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

export const deleteEvent = async (eventId: number): Promise<void> => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
  console.log("Deleting event:", eventId);
  try {
    await db.runAsync("DELETE FROM events WHERE id = ?;", [eventId]);
    console.log("Event deleted:", eventId);
  } catch (error) {
    console.error("Error deleting event:", error);
    throw new Error(`Failed to delete event: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

export const verifyEvent = async (eventId: number): Promise<void> => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
  console.log("Verifying event:", eventId);
  try {
    await db.runAsync("UPDATE events SET is_verified = 1 WHERE id = ?;", [eventId]);
    console.log("Event verified:", eventId);
  } catch (error) {
    console.error("Error verifying event:", error);
    throw new Error(`Failed to verify event: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

export const getEventTypes = async () => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
  try {
    const types = await db.getAllAsync<EventType>(
      "SELECT name, icon, iconColor, availability, owner, weight FROM event_types;"
    );
    return types;
  } catch (error) {
    throw new Error(`Failed to get event types: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

export const getEventTypesWithOwner = async () => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
  try {
    const types = await db.getAllAsync<EventType>(
      `SELECT et.name, et.icon, et.iconColor, et.availability, et.owner, et.weight, u.name as ownerName
       FROM event_types et
       LEFT JOIN users u ON et.owner = u.id;`
    );
    return types;
  } catch (error) {
    throw new Error(`Failed to get event types with owner: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

export const updateEventType = async (
  name: string,
  icon: string,
  iconColor: string,
  owner?: number,
  weight?: number
) => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", {useNewConnection: true});
  try {
    if (weight !== undefined && weight < 1) {
      throw new Error("Weight must be at least 1");
    }
    const query = weight !== undefined
      ? "UPDATE event_types SET icon = ?, iconColor = ?, owner = ?, weight = ? WHERE name = ?;"
      : "UPDATE event_types SET icon = ?, iconColor = ?, owner = ? WHERE name = ?;";
    const params = weight !== undefined
      ? [icon, iconColor, owner || null, weight, name]
      : [icon, iconColor, owner || null, name];
    await db.runAsync(query, params);
  } catch (error) {
    throw new Error(`Failed to update event type: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

export const getUsers = async () => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", {useNewConnection: true});
  try {
    const users = await db.getAllAsync<{
      id: number;
      name: string;
      role_id: number;
      code: number;
      is_active: number;
      created_at: string;
      updated_at: string;
      icon?: string;
    }>(
      "SELECT id, name, role_id, code, is_active, created_at, updated_at, icon FROM users;"
    );
    return users;
  } catch (error) {
    throw new Error(`Failed to get users: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

export const forceAdminPasswordSetup = async (): Promise<boolean> => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", {useNewConnection: true});
  try {
    const admin = await db.getFirstAsync<{ code: number }>(
      "SELECT code FROM users WHERE name = 'Admin';"
    );
    if (!admin) {
      throw new Error("Admin user not found");
    }
    return admin.code === 0;
  } catch (error) {
    throw new Error(`Failed to check admin password: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

export const updateUserCode = async (userId: number, newCode: number) => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", {useNewConnection: true});
  try {
    await db.runAsync(
      "UPDATE users SET code = ?, updated_at = ? WHERE id = ?;",
      [newCode, new Date().toISOString(), userId]
    );
  } catch (error) {
    throw new Error(`Failed to update user code: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

// Get user by name
export const getUserByName = async (name: string): Promise<User | null> => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", {useNewConnection: true});
  try {
    const user = await db.getFirstAsync<User>(
      "SELECT id, name, role_id, code, is_active, created_at, updated_at, icon FROM users WHERE name = ?;",
      [name]
    );
    return user || null;
  } catch (error) {
    throw new Error(`Failed to get user by name: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

// Verify user code
export const verifyUserCode = async (userId: number, code: number): Promise<boolean> => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", {useNewConnection: true});
  try {
    const user = await db.getFirstAsync<{ code: number }>(
      "SELECT code FROM users WHERE id = ?;",
      [userId]
    );
    return user ? user.code === code : false;
  } catch (error) {
    throw new Error(`Failed to verify user code: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

// Create new user
export const createUser = async (name: string, roleId: number, code: number): Promise<number> => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", {useNewConnection: true});
  try {
    const result = await db.runAsync(
      "INSERT INTO users (name, role_id, code, is_active, created_at, updated_at, icon) VALUES (?, ?, ?, ?, ?, ?, ?);",
      [name, roleId, code, 1, new Date().toISOString(), new Date().toISOString(), null]
    );
    return result.lastInsertRowId || 0;
  } catch (error) {
    throw new Error(`Failed to create user: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

// Update user icon
export const updateUserIcon = async (userId: number, icon: string) => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", {useNewConnection: true});
  try {
    await db.runAsync(
      "UPDATE users SET icon = ?, updated_at = ? WHERE id = ?;",
      [icon, new Date().toISOString(), userId]
    );
  } catch (error) {
    throw new Error(`Failed to update user icon: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

// Reset user code
export const resetUserCode = async (userId: number, newCode: number) => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", {useNewConnection: true});
  try {
    await db.runAsync(
      "UPDATE users SET code = ?, updated_at = ? WHERE id = ?;",
      [newCode, new Date().toISOString(), userId]
    );
  } catch (error) {
    throw new Error(`Failed to reset user code: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

// Delete user
export const deleteUser = async (userId: number) => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", {useNewConnection: true});
  try {
    await db.runAsync("DELETE FROM users WHERE id = ?;", [userId]);
  } catch (error) {
    throw new Error(`Failed to delete user: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

// Check if user is owner of any event type
export const hasEventTypeOwner = async (userId: number): Promise<boolean> => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", {useNewConnection: true});
  try {
    const count = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM event_types WHERE owner = ?;",
      [userId]
    );
    return (count?.count || 0) > 0;
  } catch (error) {
    throw new Error(`Failed to check event type owner: ${error}`);
  } finally {
    await db.closeAsync();
  }
};