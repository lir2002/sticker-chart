import * as SQLite from "expo-sqlite";
import { Event, EventType, User, Role, DbVersion, Wallet } from "../types";

// Current database version
const CURRENT_DB_VERSION = 5;

// Singleton Database Manager
export class DatabaseManager {
  private static instance: DatabaseManager | null = null;
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitializing: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.db) {
      return;
    }
    if (this.isInitializing) {
      while (this.isInitializing) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return;
    }

    this.isInitializing = true;
    try {
      this.db = await SQLite.openDatabaseAsync("eventmarker.db");
      await this.initDatabase();
    } catch (error) {
      throw new Error(`Failed to initialize database: ${error}`);
    } finally {
      this.isInitializing = false;
    }
  }

  public getDatabase(): SQLite.SQLiteDatabase {
    if (!this.db) {
      throw new Error("Database not initialized. Call initialize() first.");
    }
    return this.db;
  }

  public async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }

  private async initDatabase() {
    const db = this.getDatabase();
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
        return;
      }

      if (currentVersion === 0) {
        await db.execAsync(`
          PRAGMA journal_mode = WAL;

          CREATE TABLE IF NOT EXISTS roles (
            role_id INTEGER PRIMARY KEY AUTOINCREMENT,
            role_name TEXT NOT NULL UNIQUE
          );

          INSERT OR IGNORE INTO roles (role_name) VALUES ('Admin');
          INSERT OR IGNORE INTO roles (role_name) VALUES ('Guest');
          INSERT OR IGNORE INTO roles (role_name) VALUES ('User');

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

          INSERT OR IGNORE INTO users (name, role_id, code, is_active, created_at, updated_at, icon, email, phone)
          VALUES ('Admin', 1, '0000', 1, '${new Date().toISOString()}', '${new Date().toISOString()}', NULL, '', '');

          INSERT OR IGNORE INTO users (name, role_id, code, is_active, created_at, updated_at, icon, email, phone)
          VALUES ('Guest', 2, '0000', 1, '${new Date().toISOString()}', '${new Date().toISOString()}', NULL, '', '');

          CREATE TABLE IF NOT EXISTS wallets (
            owner INTEGER PRIMARY KEY,
            assets INTEGER NOT NULL DEFAULT 5,
            credit INTEGER NOT NULL DEFAULT 100,
            FOREIGN KEY (owner) REFERENCES users(id)
          );

          CREATE TABLE IF NOT EXISTS transactions_tmpl (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reason TEXT,
            amount INTEGER,
            counterparty INTEGER,
            timestamp TEXT,
            balance INTEGER,
            FOREIGN KEY (counterparty) REFERENCES users(id)
          );

          CREATE TABLE IF NOT EXISTS event_types (
            name TEXT PRIMARY KEY,
            icon TEXT NOT NULL,
            iconColor TEXT NOT NULL,
            availability INTEGER NOT NULL DEFAULT 0,
            owner INTEGER,
            weight INTEGER NOT NULL DEFAULT 1 CHECK (weight >= 1),
            FOREIGN KEY (owner) REFERENCES users(id)
          );

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

        const adminUser = await db.getFirstAsync<{ id: number }>(
          "SELECT id FROM users WHERE name = 'Admin';"
        );
        if (adminUser?.id) {
          await db.runAsync(
            "INSERT OR IGNORE INTO wallets (owner, assets, credit) VALUES (?, ?, ?);",
            [adminUser.id, 5, 100]
          );
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

        const tables = await db.getAllAsync<{ name: string }>(
          "SELECT name FROM sqlite_master WHERE type='table';"
        );
        const tableNames = tables.map((t) => t.name);

        if (
          tableNames.includes("event_types_old") ||
          tableNames.includes("events_old")
        ) {
          const adminId = adminUser?.id;
          if (!adminId) {
            throw new Error("Failed to retrieve admin user ID");
          }

          if (tableNames.includes("event_types_old")) {
            await db.execAsync(`
              INSERT INTO event_types (name, icon, iconColor, availability, owner, weight)
              SELECT name, icon, iconColor, availability, ${adminId}, 1
              FROM event_types_old;
              DROP TABLE IF EXISTS event_types_old;
            `);
          }

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

      if (currentVersion === 1) {
        await db.execAsync(`
          ALTER TABLE events ADD COLUMN verified_at TEXT;
          ALTER TABLE events ADD COLUMN verified_by INTEGER;
        `);
      }

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

      if (currentVersion === 3) {
        await db.execAsync(`
          ALTER TABLE users ADD COLUMN email TEXT NOT NULL DEFAULT '';
          ALTER TABLE users ADD COLUMN phone TEXT NOT NULL DEFAULT '';
          CREATE TABLE IF NOT EXISTS wallets (
            owner INTEGER PRIMARY KEY,
            assets INTEGER NOT NULL DEFAULT 5,
            credit INTEGER NOT NULL DEFAULT 100,
            FOREIGN KEY (owner) REFERENCES users(id)
          );
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

        const users = await db.getAllAsync<{ id: number; name: string }>(
          "SELECT id, name FROM users WHERE name != 'Guest';"
        );
        for (const user of users) {
          await db.runAsync(
            "INSERT OR IGNORE INTO wallets (owner, assets, credit) VALUES (?, ?, ?);",
            [user.id, 5, 100]
          );
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

      if (currentVersion === 4) {
        // Version 4 to 5: Convert absolute paths to relative (no nested transaction)
        const events = await db.getAllAsync<{
          id: number;
          photoPath: string | null;
        }>("SELECT id, photoPath FROM events WHERE photoPath IS NOT NULL;");

        for (const event of events) {
          if (event.photoPath && event.photoPath.startsWith("file://")) {
            const relativePath = event.photoPath.includes("photos/")
              ? event.photoPath.substring(event.photoPath.indexOf("photos/"))
              : null; // Preserve original if invalid
            await db.runAsync(
              "UPDATE events SET photoPath = ? WHERE id = ?;",
              [relativePath, event.id]
            );
          }
        }

        const users = await db.getAllAsync<{
          id: number;
          icon: string | null;
        }>("SELECT id, icon FROM users WHERE icon IS NOT NULL;");

        for (const user of users) {
          if (user.icon && user.icon.startsWith("file://")) {
            const relativePath = user.icon.includes("icons/")
              ? user.icon.substring(user.icon.indexOf("icons/"))
              : null; // Preserve original if invalid
            await db.runAsync("UPDATE users SET icon = ? WHERE id = ?;", [
              relativePath,
              user.id,
            ]);
          }
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
  }
}

// Initialize the database
export const initDatabase = async () => {
  const dbManager = DatabaseManager.getInstance();
  await dbManager.initialize();
};

// Create user
export const createUser = async (
  name: string,
  roleId: number,
  code: string
): Promise<number> => {
  if (!/^\d{4}$/.test(code)) {
    throw new Error("Code must be a 4-digit number");
  }
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  let userId = 0;

  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO users (name, role_id, code, is_active, created_at, updated_at, icon, email, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        name,
        roleId,
        code,
        1,
        new Date().toISOString(),
        new Date().toISOString(),
        null,
        "",
        "",
      ]
    );
    userId = result.lastInsertRowId || 0;

    if (name !== "Guest") {
      await db.runAsync(
        "INSERT INTO wallets (owner, assets, credit) VALUES (?, ?, ?);",
        [userId, 5, 100]
      );
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
  });

  return userId;
};

// Get users
export const getUsers = async () => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
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
};

// Get user by name
export const getUserByName = async (name: string): Promise<User | null> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
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
};

// In database.ts
export const getUserById = async (userId: number): Promise<User | null> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
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
    "SELECT id, name, role_id, code, is_active, created_at, updated_at, icon, email, phone FROM users WHERE id = ?;",
    [userId]
  );
  return user || null;
};

// Update user contact
export const updateUserContact = async (
  userId: number,
  email: string,
  phone: string
) => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  await db.runAsync(
    "UPDATE users SET email = ?, phone = ?, updated_at = ? WHERE id = ?;",
    [email, phone, new Date().toISOString(), userId]
  );
};

// Get wallet
export const getWallet = async (userId: number) => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const wallet = await db.getFirstAsync<{
    owner: number;
    assets: number;
    credit: number;
  }>("SELECT owner, assets, credit FROM wallets WHERE owner = ?;", [userId]);
  return wallet || null;
};

// Update wallet
export const updateWallet = async (
  userId: number,
  assets: number,
  credit: number
) => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  await db.runAsync(
    "UPDATE wallets SET assets = ?, credit = ? WHERE owner = ?;",
    [assets, credit, userId]
  );
};

// Insert transaction
export const insertTransaction = async (
  userId: number,
  reason: string | null,
  amount: number | null,
  counterparty: number | null,
  timestamp: string | null,
  balance: number | null
) => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const result = await db.runAsync(
    `INSERT INTO transactions_${userId} (reason, amount, counterparty, timestamp, balance)
     VALUES (?, ?, ?, ?, ?);`,
    [reason, amount, counterparty, timestamp, balance]
  );
  return result.lastInsertRowId || 0;
};

// Fetch transactions
export const fetchTransactions = async (userId: number) => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const transactions = await db.getAllAsync<{
    id: number;
    reason: string | null;
    amount: number | null;
    counterparty: number | null;
    counterpartyName: string | null;
    timestamp: string | null;
    balance: number | null;
  }>(
    `SELECT t.id, t.reason, t.amount, t.counterparty, u.name AS counterpartyName, t.timestamp, t.balance
     FROM transactions_${userId} t
     LEFT JOIN users u ON t.counterparty = u.id
     ORDER BY t.timestamp DESC;`
  );
  return transactions;
};

// Get roles
export const getRoles = async (): Promise<Role[]> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const roles = await db.getAllAsync<Role>(
    "SELECT role_id, role_name FROM roles;"
  );
  return roles;
};

// Get database version
export const getDbVersion = async (): Promise<DbVersion> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const version = await db.getFirstAsync<DbVersion>(
    "SELECT version FROM db_version;"
  );
  return version || { version: 0 };
};

// Get all wallets
export const getAllWallets = async (): Promise<Wallet[]> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const wallets = await db.getAllAsync<Wallet>(
    "SELECT owner, assets, credit FROM wallets;"
  );
  return wallets;
};

// Insert event type
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
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const result = await db.runAsync(
    "INSERT INTO event_types (name, icon, iconColor, availability, owner, weight) VALUES (?, ?, ?, ?, ?, ?);",
    [name, icon, iconColor, availability, owner || null, weight]
  );
  return result.lastInsertRowId || 0;
};

// Insert event
export const insertEvent = async (
  date: string,
  markedAt: string,
  eventType: string,
  createdBy: number,
  note?: string,
  photoPath?: string,
  isVerified: boolean = false
) => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
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
};

// Fetch events
export const fetchEvents = async (eventType: string) => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const events = await db.getAllAsync<Event>(
    `SELECT id, date, markedAt, eventType, note, photoPath, created_by, is_verified, verified_at, verified_by
     FROM events WHERE eventType = ?;`,
    [eventType]
  );
  return events;
};

// Fetch events with creator
export const fetchEventsWithCreator = async (eventType: string) => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
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
};

// Fetch all events with details
export async function fetchAllEventsWithDetails(): Promise<Event[]> {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const events = await db.getAllAsync<Event>(
    `
    SELECT 
      e.id, e.date, e.markedAt, e.eventType, e.note, e.photoPath, 
      e.created_by, e.is_verified, e.verified_at, e.verified_by,
      uc.name AS creatorName,
      uv.name AS verifierName,
      et.owner,
      uo.name AS ownerName
    FROM events e
    LEFT JOIN users uc ON e.created_by = uc.id
    LEFT JOIN users uv ON e.verified_by = uv.id
    LEFT JOIN event_types et ON e.eventType = et.name
    LEFT JOIN users uo ON et.owner = uo.id
    ORDER BY e.date DESC;
    `
  );
  return events;
};

// Fetch all events
export const fetchAllEvents = async () => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const events = await db.getAllAsync<Event>(
    `SELECT id, date, markedAt, eventType, note, photoPath, created_by, is_verified, verified_at, verified_by
     FROM events;`
  );
  return events;
};

// Delete event
export const deleteEvent = async (eventId: number): Promise<void> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  console.log("Deleting event:", eventId);
  await db.runAsync("DELETE FROM events WHERE id = ?;", [eventId]);
  console.log("Event deleted:", eventId);
};

// Verify event
export const verifyEvent = async (
  eventId: number,
  verifierId: number
): Promise<void> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  console.log("Verifying event:", eventId, "by verifier:", verifierId);
  await db.runAsync(
    `UPDATE events SET is_verified = 1, verified_at = ?, verified_by = ? WHERE id = ?;`,
    [new Date().toISOString(), verifierId, eventId]
  );
  console.log("Event verified:", eventId);
};

// Verify event with transaction
export const verifyEventWithTransaction = async (
  eventId: number,
  verifierId: number,
  eventType: string,
  ownerId: number | null,
  verifierReason: string,
  ownerReason: string
): Promise<void> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  await db.withTransactionAsync(async () => {
    const eventTypeRecord = await db.getFirstAsync<{ weight: number }>(
      "SELECT weight FROM event_types WHERE name = ?;",
      [eventType]
    );
    if (!eventTypeRecord) {
      throw new Error("Event type not found");
    }
    const weight = eventTypeRecord.weight;

    await db.runAsync(
      `UPDATE events SET is_verified = 1, verified_at = ?, verified_by = ? WHERE id = ?;`,
      [new Date().toISOString(), verifierId, eventId]
    );

    const verifierWallet = await db.getFirstAsync<{
      assets: number;
      credit: number;
    }>("SELECT assets, credit FROM wallets WHERE owner = ?;", [verifierId]);
    if (!verifierWallet) {
      throw new Error("Verifier wallet not found");
    }
    if (verifierWallet.assets < weight) {
      throw new Error("Insufficient assets for verification");
    }
    const newVerifierAssets = verifierWallet.assets - weight;
    await db.runAsync("UPDATE wallets SET assets = ? WHERE owner = ?;", [
      newVerifierAssets,
      verifierId,
    ]);

    await db.runAsync(
      `INSERT INTO transactions_${verifierId} (reason, amount, counterparty, timestamp, balance)
       VALUES (?, ?, ?, ?, ?);`,
      [
        verifierReason,
        -weight,
        ownerId || null,
        new Date().toISOString(),
        newVerifierAssets,
      ]
    );

    if (ownerId) {
      const ownerWallet = await db.getFirstAsync<{
        assets: number;
        credit: number;
      }>("SELECT assets, credit FROM wallets WHERE owner = ?;", [ownerId]);
      if (!ownerWallet) {
        throw new Error("Owner wallet not found");
      }
      const newOwnerAssets = ownerWallet.assets + weight;
      await db.runAsync("UPDATE wallets SET assets = ? WHERE owner = ?;", [
        newOwnerAssets,
        ownerId,
      ]);

      await db.runAsync(
        `INSERT INTO transactions_${ownerId} (reason, amount, counterparty, timestamp, balance)
         VALUES (?, ?, ?, ?, ?);`,
        [
          ownerReason,
          weight,
          verifierId,
          new Date().toISOString(),
          newOwnerAssets,
        ]
      );
    }
  });
  console.log("Event verified with transactions:", eventId);
};

// Get event types
export const getEventTypes = async () => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const types = await db.getAllAsync<EventType>(
    "SELECT name, icon, iconColor, availability, owner, weight FROM event_types;"
  );
  return types;
};

// Get event types with owner
export const getEventTypesWithOwner = async () => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const types = await db.getAllAsync<EventType>(
    `SELECT et.name, et.icon, et.iconColor, et.availability, et.owner, et.weight, u.name as ownerName
     FROM event_types et
     LEFT JOIN users u ON et.owner = u.id;`
  );
  return types;
};

// Update event type
export const updateEventType = async (
  name: string,
  icon: string,
  iconColor: string,
  owner?: number,
  weight?: number
) => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  if (weight !== undefined && weight < 1) {
    throw new Error("Weight must be at least 1");
  }
  const query =
    weight !== undefined
      ? "UPDATE event_types SET icon = ?, iconColor = ?, owner = ?, weight = ? WHERE name = ?;"
      : "UPDATE event_types SET icon = ?, iconColor = ?, owner = ? WHERE name = ?;";
  const params =
    weight !== undefined
      ? [icon, iconColor, owner || null, weight, name]
      : [icon, iconColor, owner || null, name];
  await db.runAsync(query, params);
};

// Force admin password setup
export const forceAdminPasswordSetup = async (): Promise<boolean> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const admin = await db.getFirstAsync<{ code: string }>(
    "SELECT code FROM users WHERE name = 'Admin';"
  );
  if (!admin) {
    throw new Error("Admin user not found");
  }
  return admin.code === "0000";
};

// Update user code
export const updateUserCode = async (userId: number, newCode: string) => {
  if (!/^\d{4}$/.test(newCode)) {
    throw new Error("Code must be a 4-digit number");
  }
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  await db.runAsync(
    "UPDATE users SET code = ?, updated_at = ? WHERE id = ?;",
    [newCode, new Date().toISOString(), userId]
  );
};

// Verify user code
export const verifyUserCode = async (
  userId: number,
  code: string
): Promise<boolean> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const user = await db.getFirstAsync<{ code: string }>(
    "SELECT code FROM users WHERE id = ?;",
    [userId]
  );
  return user ? user.code === code : false;
};

// Update user icon
export const updateUserIcon = async (userId: number, icon: string) => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  await db.runAsync(
    "UPDATE users SET icon = ?, updated_at = ? WHERE id = ?;",
    [icon, new Date().toISOString(), userId]
  );
};

// Reset user code
export const resetUserCode = async (userId: number, newCode: string) => {
  if (!/^\d{4}$/.test(newCode)) {
    throw new Error("Code must be a 4-digit number");
  }
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  await db.runAsync(
    "UPDATE users SET code = ?, updated_at = ? WHERE id = ?;",
    [newCode, new Date().toISOString(), userId]
  );
};

// Delete user
export const deleteUser = async (userId: number) => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM wallets WHERE owner = ?;", [userId]);
    await db.execAsync(`DROP TABLE IF EXISTS transactions_${userId};`);
    await db.runAsync("DELETE FROM users WHERE id = ?;", [userId]);
  });
};

// Check if user is an event type owner
export const hasEventTypeOwner = async (userId: number): Promise<boolean> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const count = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM event_types WHERE owner = ?;",
    [userId]
  );
  return (count?.count || 0) > 0;
};