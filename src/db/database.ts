import * as SQLite from "expo-sqlite";
import { Event, EventType, User } from "../types";

// Current database version
const CURRENT_DB_VERSION = 4; // Incremented from 3 to 4

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
        // Database is up-to-date
        return;
      }

      if (currentVersion === 0) {
        // First initialization: create all tables
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

          -- Create users table with new fields
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            role_id INTEGER NOT NULL,
            code TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            icon TEXT,
            email TEXT NOT NULL DEFAULT '',
            phone TEXT NOT NULL DEFAULT '',
            FOREIGN KEY (role_id) REFERENCES roles(role_id)
          );

          -- Insert initial admin user
          INSERT OR IGNORE INTO users (name, role_id, code, is_active, created_at, updated_at, icon, email, phone)
          VALUES ('Admin', 1, '0000', 1, '${new Date().toISOString()}', '${new Date().toISOString()}', NULL, '', '');

          -- Insert initial Guest user
          INSERT OR IGNORE INTO users (name, role_id, code, is_active, created_at, updated_at, icon, email, phone)
          VALUES ('Guest', 2, '0000', 1, '${new Date().toISOString()}', '${new Date().toISOString()}', NULL, '', '');

          -- Create wallets table
          CREATE TABLE IF NOT EXISTS wallets (
            owner INTEGER PRIMARY KEY,
            assets INTEGER NOT NULL DEFAULT 5,
            credit INTEGER NOT NULL DEFAULT 100,
            FOREIGN KEY (owner) REFERENCES users(id)
          );

          -- Create transactions template table
          CREATE TABLE IF NOT EXISTS transactions_tmpl (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reason TEXT,
            amount INTEGER,
            counterparty INTEGER,
            timestamp TEXT,
            balance INTEGER,
            FOREIGN KEY (counterparty) REFERENCES users(id)
          );

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
            verified_at TEXT,
            verified_by INTEGER,
            FOREIGN KEY (eventType) REFERENCES event_types(name),
            FOREIGN KEY (created_by) REFERENCES users(id),
            FOREIGN KEY (verified_by) REFERENCES users(id)
          );
        `);

        // Create wallets for initial users (Admin only, not Guest)
        const adminUser = await db.getFirstAsync<{ id: number }>(
          "SELECT id FROM users WHERE name = 'Admin';"
        );
        if (adminUser?.id) {
          await db.runAsync(
            "INSERT OR IGNORE INTO wallets (owner, assets, credit) VALUES (?, ?, ?);",
            [adminUser.id, 5, 100]
          );
        }

        // Create transactions table for Admin
        if (adminUser?.id) {
          await db.execAsync(`
            CREATE TABLE IF NOT EXISTS transactions_${adminUser.id} (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              reason TEXT,
              amount INTEGER,
              counterparty INTEGER,
              timestamp TEXT,
              balance INTEGER,
              FOREIGN KEY (counterparty) REFERENCES users(id)
            );
          `);
        }

        // Check for old tables for migration
        const tables = await db.getAllAsync<{ name: string }>(
          "SELECT name FROM sqlite_master WHERE type='table';"
        );
        const tableNames = tables.map((t) => t.name);

        if (tableNames.includes("event_types_old") || tableNames.includes("events_old")) {
          const adminId = adminUser?.id;
          if (!adminId) {
            throw new Error("Failed to retrieve admin user ID");
          }

          // Migrate event_types_old
          if (tableNames.includes("event_types_old")) {
            await db.execAsync(`
              INSERT INTO event_types (name, icon, iconColor, availability, owner, weight)
              SELECT name, icon, iconColor, availability, ${adminId}, 1
              FROM event_types_old;
              DROP TABLE IF EXISTS event_types_old;
            `);
          }

          // Migrate events_old
          if (tableNames.includes("events_old")) {
            await db.execAsync(`
              INSERT INTO events (id, date, markedAt, eventType, note, photoPath, created_by, is_verified, verified_at, verified_by)
              SELECT id, date, markedAt, eventType, note, photoPath, ${adminId}, 0, NULL, NULL
              FROM events_old;
              DROP TABLE IF EXISTS events_old;
            `);
          }
        }
      }

      // Migration for version 1 to 2
      if (currentVersion === 1) {
        await db.execAsync(`
          ALTER TABLE events ADD COLUMN verified_at TEXT;
          ALTER TABLE events ADD COLUMN verified_by INTEGER;
        `);
      }

      // Migration for version 2 to 3: Convert users.code from INTEGER to TEXT
      if (currentVersion === 2) {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS users_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            role_id INTEGER NOT NULL,
            code TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            icon TEXT,
            FOREIGN KEY (role_id) REFERENCES roles(role_id)
          );

          INSERT INTO users_new (id, name, role_id, code, is_active, created_at, updated_at, icon)
          SELECT id, name, role_id, printf('%04d', code), is_active, created_at, updated_at, icon
          FROM users;

          DROP TABLE users;
          ALTER TABLE users_new RENAME TO users;
        `);
      }

      // Migration for version 3 to 4: Add email, phone, wallets, transactions
      if (currentVersion === 3) {
        // Add email and phone to users
        
        await db.execAsync(`
          ALTER TABLE users ADD COLUMN email TEXT NOT NULL DEFAULT '';
          ALTER TABLE users ADD COLUMN phone TEXT NOT NULL DEFAULT '';
        `);
        console.log(`Cur: ${currentVersion}, TAR: ${CURRENT_DB_VERSION}`);

        // Create wallets table
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS wallets (
            owner INTEGER PRIMARY KEY,
            assets INTEGER NOT NULL DEFAULT 5,
            credit INTEGER NOT NULL DEFAULT 100,
            FOREIGN KEY (owner) REFERENCES users(id)
          );
        `);

        // Create transactions template table
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS transactions_tmpl (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reason TEXT,
            amount INTEGER,
            counterparty INTEGER,
            timestamp TEXT,
            balance INTEGER,
            FOREIGN KEY (counterparty) REFERENCES users(id)
          );
        `);

        // Create wallets and transactions tables for existing non-Guest users
        const users = await db.getAllAsync<{ id: number; name: string }>(
          "SELECT id, name FROM users WHERE name != 'Guest';"
        );
        for (const user of users) {
          // Create wallet
          await db.runAsync(
            "INSERT OR IGNORE INTO wallets (owner, assets, credit) VALUES (?, ?, ?);",
            [user.id, 5, 100]
          );

          // Create transactions table
          await db.execAsync(`
            CREATE TABLE IF NOT EXISTS transactions_${user.id} (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              reason TEXT,
              amount INTEGER,
              counterparty INTEGER,
              timestamp TEXT,
              balance INTEGER,
              FOREIGN KEY (counterparty) REFERENCES users(id)
            );
          `);
        }
      }

      // Update version number
      const versionExists = await db.getFirstAsync<{ version: number }>(
        "SELECT version FROM db_version;"
      );
      if (versionExists) {
        await db.runAsync("UPDATE db_version SET version = ?;", [
          CURRENT_DB_VERSION,
        ]);
      } else {
        await db.runAsync("INSERT INTO db_version (version) VALUES (?);", [
          CURRENT_DB_VERSION,
        ]);
      }
    });
    console.log("Database initialized successfully");
  } catch (error) {
    throw new Error(`Failed to initialize database: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

// Update createUser to create wallet and transactions table for non-Guest users
export const createUser = async (name: string, roleId: number, code: string): Promise<number> => {
  if (!/^\d{4}$/.test(code)) {
    throw new Error("Code must be a 4-digit number");
  }
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
  try {
    await db.withTransactionAsync(async () => {
      // Insert user
      const result = await db.runAsync(
        `INSERT INTO users (name, role_id, code, is_active, created_at, updated_at, icon, email, phone)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [name, roleId, code, 1, new Date().toISOString(), new Date().toISOString(), null, '', '']
      );
      const userId = result.lastInsertRowId || 0;

      // Create wallet and transactions table for non-Guest users
      if (name !== "Guest") {
        // Insert wallet
        await db.runAsync(
          "INSERT INTO wallets (owner, assets, credit) VALUES (?, ?, ?);",
          [userId, 5, 100]
        );

        // Create transactions table
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS transactions_${userId} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reason TEXT,
            amount INTEGER,
            counterparty INTEGER,
            timestamp TEXT,
            balance INTEGER,
            FOREIGN KEY (counterparty) REFERENCES users(id)
          );
        `);
      }

      return userId;
    });
    return result.lastInsertRowId || 0;
  } catch (error) {
    throw new Error(`Failed to create user: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

// Update getUsers to include new fields
export const getUsers = async () => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
  try {
    const users = await db.getAllAsync<{
      id: number;
      name: string;
      role_id: number;
      code: string;
      is_active: number;
      created_at: string;
      updated_at: string;
      icon?: string;
      email?: string;
      phone?: string;
    }>(
      "SELECT id, name, role_id, code, is_active, created_at, updated_at, icon, email, phone FROM users;"
    );
    return users;
  } catch (error) {
    throw new Error(`Failed to get users: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

// Update getUserByName to include new fields
export const getUserByName = async (name: string): Promise<User | null> => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
  try {
    const user = await db.getFirstAsync<{
      id: number;
      name: string;
      role_id: number;
      code: string;
      is_active: number;
      created_at: string;
      updated_at: string;
      icon?: string;
      email: string;
      phone: string;
    }>(
      "SELECT id, name, role_id, code, is_active, created_at, updated_at, icon, email, phone FROM users WHERE name = ?;",
      [name]
    );
    return user || null;
  } catch (error) {
    throw new Error(`Failed to get user by name: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

// New function to update user email and phone
export const updateUserContact = async (userId: number, email: string, phone: string) => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
  try {
    await db.runAsync(
      "UPDATE users SET email = ?, phone = ?, updated_at = ? WHERE id = ?;",
      [email, phone, new Date().toISOString(), userId]
    );
  } catch (error) {
    throw new Error(`Failed to update user contact info: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

// New function to get wallet by user ID
export const getWallet = async (userId: number) => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
  try {
    const wallet = await db.getFirstAsync<{
      owner: number;
      assets: number;
      credit: number;
    }>(
      "SELECT owner, assets, credit FROM wallets WHERE owner = ?;",
      [userId]
    );
    return wallet || null;
  } catch (error) {
    throw new Error(`Failed to get wallet: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

// New function to update wallet
export const updateWallet = async (userId: number, assets: number, credit: number) => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
  try {
    await db.runAsync(
      "UPDATE wallets SET assets = ?, credit = ? WHERE owner = ?;",
      [assets, credit, userId]
    );
  } catch (error) {
    throw new Error(`Failed to update wallet: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

// New function to insert transaction (into user's transactions table)
export const insertTransaction = async (
  userId: number,
  reason: string | null,
  amount: number | null,
  counterparty: number | null,
  timestamp: string | null,
  balance: number | null
) => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
  try {
    const result = await db.runAsync(
      `INSERT INTO transactions_${userId} (reason, amount, counterparty, timestamp, balance)
       VALUES (?, ?, ?, ?, ?);`,
      [reason, amount, counterparty, timestamp, balance]
    );
    return result.lastInsertRowId || 0;
  } catch (error) {
    throw new Error(`Failed to insert transaction: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

// New function to fetch transactions for a user
export const fetchTransactions = async (userId: number) => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
  try {
    const transactions = await db.getAllAsync<{
      id: number;
      reason: string | null;
      amount: number | null;
      counterparty: number | null;
      timestamp: string | null;
      balance: number | null;
    }>(
      `SELECT id, reason, amount, counterparty, timestamp, balance
       FROM transactions_${userId};`
    );
    return transactions;
  } catch (error) {
    throw new Error(`Failed to fetch transactions: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

// New functions for BackupData
export const getRoles = async (): Promise<Role[]> => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
  try {
    const roles = await db.getAllAsync<Role>(
      "SELECT role_id, role_name FROM roles;"
    );
    return roles;
  } finally {
    await db.closeAsync();
  }
};

export const getDbVersion = async (): Promise<DbVersion> => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
  try {
    const version = await db.getFirstAsync<DbVersion>(
      "SELECT version FROM db_version;"
    );
    return version || { version: 0 };
  } finally {
    await db.closeAsync();
  }
};

export const getAllWallets = async (): Promise<Wallet[]> => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
  try {
    const wallets = await db.getAllAsync<Wallet>(
      "SELECT owner, assets, credit FROM wallets;"
    );
    return wallets;
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
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
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
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
  try {
    const result = await db.runAsync(
      `INSERT INTO events (date, markedAt, eventType, created_by, note, photoPath, is_verified, verified_at, verified_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        date,
        markedAt,
        eventType,
        createdBy,
        note || null,
        photoPath || null,
        isVerified ? 1 : 0,
        null,
        null,
      ]
    );
    return result.lastInsertRowId || 0;
  } catch (error) {
    throw new Error(`Failed to insert event: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

export const fetchEvents = async (eventType: string) => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
  try {
    const events = await db.getAllAsync<Event>(
      `SELECT id, date, markedAt, eventType, note, photoPath, created_by, is_verified, verified_at, verified_by
       FROM events WHERE eventType = ?;`,
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
              e.created_by, e.is_verified, e.verified_at, e.verified_by, 
              u.name as creatorName, v.name as verifierName
       FROM events e
       LEFT JOIN users u ON e.created_by = u.id
       LEFT JOIN users v ON e.verified_by = v.id
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
              e.created_by, e.is_verified, e.verified_at, e.verified_by, 
              u.name as creatorName, v.name as verifierName
       FROM events e
       LEFT JOIN users u ON e.created_by = u.id
       LEFT JOIN users v ON e.verified_by = v.id;`
    );
    return events;
  } catch (error) {
    throw new Error(`Failed to fetch all events with creator: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

export const fetchAllEvents = async () => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
  try {
    const events = await db.getAllAsync<Event>(
      `SELECT id, date, markedAt, eventType, note, photoPath, created_by, is_verified, verified_at, verified_by
       FROM events;`
    );
    return events;
  } catch (error) {
    throw new Error(`Failed to fetch all events: ${error}`);
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

export const verifyEvent = async (eventId: number, verifierId: number): Promise<void> => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
  console.log("Verifying event:", eventId, "by verifier:", verifierId);
  try {
    await db.runAsync(
      `UPDATE events SET is_verified = 1, verified_at = ?, verified_by = ? WHERE id = ?;`,
      [new Date().toISOString(), verifierId, eventId]
    );
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
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
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

export const forceAdminPasswordSetup = async (): Promise<boolean> => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
  try {
    const admin = await db.getFirstAsync<{ code: string }>(
      "SELECT code FROM users WHERE name = 'Admin';"
    );
    if (!admin) {
      throw new Error("Admin user not found");
    }
    return admin.code === "0000";
  } catch (error) {
    throw new Error(`Failed to check admin password: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

export const updateUserCode = async (userId: number, newCode: string) => {
  if (!/^\d{4}$/.test(newCode)) {
    throw new Error("Code must be a 4-digit number");
  }
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
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

export const verifyUserCode = async (userId: number, code: string): Promise<boolean> => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
  try {
    const user = await db.getFirstAsync<{ code: string }>(
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

export const updateUserIcon = async (userId: number, icon: string) => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
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

export const resetUserCode = async (userId: number, newCode: string) => {
  if (!/^\d{4}$/.test(newCode)) {
    throw new Error("Code must be a 4-digit number");
  }
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
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

export const deleteUser = async (userId: number) => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
  try {
    await db.withTransactionAsync(async () => {
      // Delete wallet
      await db.runAsync("DELETE FROM wallets WHERE owner = ?;", [userId]);

      // Drop transactions table if it exists
      await db.execAsync(`DROP TABLE IF EXISTS transactions_${userId};`);

      // Delete user
      await db.runAsync("DELETE FROM users WHERE id = ?;", [userId]);
    });
  } catch (error) {
    throw new Error(`Failed to delete user: ${error}`);
  } finally {
    await db.closeAsync();
  }
};

export const hasEventTypeOwner = async (userId: number): Promise<boolean> => {
  const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
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