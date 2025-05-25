import * as SQLite from "expo-sqlite";
import {
  Event,
  EventType,
  User,
  Role,
  DbVersion,
  Wallet,
  Product,
  Purchase,
} from "../types"; // Updated import to include Product and Purchase

// Current database version
const CURRENT_DB_VERSION = 9; // Incremented from 8 to 9 for Product and Purchase tables

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
            name TEXT NOT NULL,
            owner INTEGER,
            icon TEXT NOT NULL,
            iconColor TEXT NOT NULL,
            availability INTEGER NOT NULL DEFAULT 0,
            weight INTEGER NOT NULL DEFAULT 1 CHECK (weight >= 1),
            expiration_date TEXT,
            created_at TEXT,
            PRIMARY KEY (name, owner),
            FOREIGN KEY (owner) REFERENCES users(id)
          );

          CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            markedAt TEXT NOT NULL,
            eventType TEXT NOT NULL,
            owner INTEGER,
            note TEXT,
            photoPath TEXT,
            created_by INTEGER,
            is_verified INTEGER NOT NULL DEFAULT 0,
            verified_at TEXT,
            verified_by INTEGER,
            FOREIGN KEY (eventType, owner) REFERENCES event_types(name, owner),
            FOREIGN KEY (created_by) REFERENCES users(id),
            FOREIGN KEY (verified_by) REFERENCES users(id)
          );

          -- New Product table
          CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL CHECK (length(name) <= 20),
            description TEXT CHECK (length(description) <= 200),
            images TEXT,
            price REAL NOT NULL,
            creator INTEGER NOT NULL,
            online INTEGER NOT NULL DEFAULT 0,
            quantity INTEGER NOT NULL DEFAULT 0,
            createdAt TEXT NOT NULL,
            updatedAt TEXT,
            FOREIGN KEY (creator) REFERENCES users(id)
          );

          -- New Purchase table
          CREATE TABLE IF NOT EXISTS purchases (
            order_number INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            owner INTEGER NOT NULL,
            price REAL NOT NULL,
            quantity INTEGER NOT NULL,
            fullfilled INTEGER NOT NULL DEFAULT 0,
            createdAt TEXT NOT NULL,
            fullfilledAt TEXT,
            FOREIGN KEY (product_id) REFERENCES products(id),
            FOREIGN KEY (owner) REFERENCES users(id)
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
              INSERT INTO event_types (name, owner, icon, iconColor, availability, weight, expiration_date, created_at)
              SELECT name, ${adminId}, icon, iconColor, availability, 1, NULL, NULL
              FROM event_types_old;
              DROP TABLE IF EXISTS event_types_old;
            `);
          }

          if (tableNames.includes("events_old")) {
            await db.execAsync(`
              INSERT INTO events (id, date, markedAt, eventType, owner, note, photoPath, created_by, is_verified, verified_at, verified_by)
              SELECT id, date, markedAt, eventType, ${adminId}, note, photoPath, ${adminId}, 0, NULL, NULL
              FROM events_old;
              DROP TABLE IF EXISTS events_old;
            `);
          }
        }

        // After version 0 initialization, set version to CURRENT_DB_VERSION and exit
        await db.runAsync("INSERT INTO db_version (version) VALUES (?);", [
          CURRENT_DB_VERSION,
        ]);
        return; // Exit to skip subsequent migrations
      }

      if (currentVersion < 2) {
        await db.execAsync(`
          ALTER TABLE events ADD COLUMN verified_at TEXT;
          ALTER TABLE events ADD COLUMN verified_by INTEGER;
        `);
      }

      if (currentVersion < 3) {
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

      if (currentVersion < 4) {
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

      if (currentVersion < 5) {
        const events = await db.getAllAsync<{
          id: number;
          photoPath: string | null;
        }>("SELECT id, photoPath FROM events WHERE photoPath IS NOT NULL;");

        for (const event of events) {
          if (event.photoPath && event.photoPath.startsWith("file://")) {
            const relativePath = event.photoPath.includes("photos/")
              ? event.photoPath.substring(event.photoPath.indexOf("photos/"))
              : null;
            await db.runAsync("UPDATE events SET photoPath = ? WHERE id = ?;", [
              relativePath,
              event.id,
            ]);
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
              : null;
            await db.runAsync("UPDATE users SET icon = ? WHERE id = ?;", [
              relativePath,
              user.id,
            ]);
          }
        }
      }

      if (currentVersion < 6) {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS event_types_new (
            name TEXT NOT NULL,
            owner INTEGER,
            icon TEXT NOT NULL,
            iconColor TEXT NOT NULL,
            availability INTEGER NOT NULL DEFAULT 0,
            weight INTEGER NOT NULL DEFAULT 1 CHECK (weight >= 1),
            PRIMARY KEY (name, owner),
            FOREIGN KEY (owner) REFERENCES users(id)
          );

          INSERT INTO event_types_new (name, owner, icon, iconColor, availability, weight)
          SELECT name, owner, icon, iconColor, availability, weight
          FROM event_types;

          CREATE TABLE IF NOT EXISTS events_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            markedAt TEXT NOT NULL,
            eventType TEXT NOT NULL,
            owner INTEGER,
            note TEXT,
            photoPath TEXT,
            created_by INTEGER,
            is_verified INTEGER NOT NULL DEFAULT 0,
            verified_at TEXT,
            verified_by INTEGER,
            FOREIGN KEY (eventType, owner) REFERENCES event_types_new(name, owner),
            FOREIGN KEY (created_by) REFERENCES users(id),
            FOREIGN KEY (verified_by) REFERENCES users(id)
          );

          INSERT INTO events_new (id, date, markedAt, eventType, owner, note, photoPath, created_by, is_verified, verified_at, verified_by)
          SELECT e.id, e.date, e.markedAt, e.eventType, et.owner, e.note, e.photoPath, e.created_by, e.is_verified, e.verified_at, e.verified_by
          FROM events e
          LEFT JOIN event_types et ON e.eventType = et.name;

          DROP TABLE IF EXISTS events;
          DROP TABLE IF EXISTS event_types;

          ALTER TABLE events_new RENAME TO events;
          ALTER TABLE event_types_new RENAME TO event_types;
        `);
      }

      if (currentVersion < 7) {
        await db.execAsync(`
          ALTER TABLE event_types ADD COLUMN expiration_date TEXT;
        `);
      }

      if (currentVersion < 8) {
        await db.execAsync(`
          ALTER TABLE event_types ADD COLUMN created_at TEXT;
        `);
      }

      if (currentVersion < 9) {
        // Migration to add Product and Purchase tables
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL CHECK (length(name) <= 20),
            description TEXT CHECK (length(description) <= 200),
            images TEXT,
            price REAL NOT NULL,
            creator INTEGER NOT NULL,
            online INTEGER NOT NULL DEFAULT 0,
            quantity INTEGER NOT NULL DEFAULT 0,
            createdAt TEXT NOT NULL,
            updatedAt TEXT,
            FOREIGN KEY (creator) REFERENCES users(id)
          );

          CREATE TABLE IF NOT EXISTS purchases (
            order_number INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            owner INTEGER NOT NULL,
            price REAL NOT NULL,
            quantity INTEGER NOT NULL,
            fullfilled INTEGER NOT NULL DEFAULT 0,
            createdAt TEXT NOT NULL,
            fullfilledAt TEXT,
            FOREIGN KEY (product_id) REFERENCES products(id),
            FOREIGN KEY (owner) REFERENCES users(id)
          );
        `);
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
export const getUsers = async (): Promise<User[]> => {
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

// Get user by id
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
  weight: number = 1,
  expirationDate?: string,
  createdAt: string = new Date().toISOString()
) => {
  if (weight < 1) {
    throw new Error("Weight must be at least 1");
  }
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  await db.runAsync(
    "INSERT INTO event_types (name, owner, icon, iconColor, availability, weight, expiration_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?);",
    [
      name,
      owner || null,
      icon,
      iconColor,
      availability,
      weight,
      expirationDate || null,
      createdAt,
    ]
  );
};

// Insert event
export const insertEvent = async (
  date: string,
  markedAt: string,
  eventType: string,
  owner: number | null,
  createdBy: number,
  note?: string,
  photoPath?: string,
  isVerified: boolean = false
) => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const result = await db.runAsync(
    `INSERT INTO events (date, markedAt, eventType, owner, note, photoPath, created_by, is_verified, verified_at, verified_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      date,
      markedAt,
      eventType,
      owner || null,
      note || null,
      photoPath || null,
      createdBy,
      isVerified ? 1 : 0,
      null,
      null,
    ]
  );
  return result.lastInsertRowId || 0;
};

// Fetch events
export const fetchEvents = async (eventType: string, owner: number | null) => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const events = await db.getAllAsync<Event>(
    `SELECT id, date, markedAt, eventType, owner, note, photoPath, created_by, is_verified, verified_at, verified_by
     FROM events WHERE eventType = ? AND owner = ?;`,
    [eventType, owner || null]
  );
  return events;
};

// Fetch events with creator
export const fetchEventsWithCreator = async (
  eventType: string,
  owner: number | null
) => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const events = await db.getAllAsync<Event>(
    `SELECT e.id, e.date, e.markedAt, e.eventType, e.owner, e.note, e.photoPath, 
            e.created_by, e.is_verified, e.verified_at, e.verified_by, 
            u.name as creatorName, v.name as verifierName
     FROM events e
     LEFT JOIN users u ON e.created_by = u.id
     LEFT JOIN users v ON e.verified_by = v.id
     WHERE e.eventType = ? AND e.owner = ?;`,
    [eventType, owner || null]
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
      e.id, e.date, e.markedAt, e.eventType, e.owner, e.note, e.photoPath, 
      e.created_by, e.is_verified, e.verified_at, e.verified_by,
      uc.name AS creatorName,
      uv.name AS verifierName,
      et.owner AS eventTypeOwner,
      uo.name AS ownerName
    FROM events e
    LEFT JOIN users uc ON e.created_by = uc.id
    LEFT JOIN users uv ON e.verified_by = uv.id
    LEFT JOIN event_types et ON e.eventType = et.name AND e.owner = et.owner
    LEFT JOIN users uo ON et.owner = uo.id
    ORDER BY e.date DESC;
    `
  );
  return events;
}

// Fetch all events
export const fetchAllEvents = async () => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const events = await db.getAllAsync<Event>(
    `SELECT id, date, markedAt, eventType, owner, note, photoPath, created_by, is_verified, verified_at, verified_by
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
      "SELECT weight FROM event_types WHERE name = ? AND owner = ?;",
      [eventType, ownerId || null]
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
    "SELECT name, owner, icon, iconColor, availability, weight, expiration_date, created_at FROM event_types;"
  );
  return types;
};

// Get event types with owner
export const getEventTypesWithOwner = async () => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const types = await db.getAllAsync<EventType>(
    `SELECT et.name, et.owner, et.icon, et.iconColor, et.availability, et.weight, et.expiration_date, et.created_at, u.name as ownerName, COUNT(e.id) as eventCount
     FROM event_types et
     LEFT JOIN users u ON et.owner = u.id
     LEFT JOIN events e ON et.name = e.eventType AND et.owner = e.owner
     GROUP BY et.name, et.owner
     ORDER BY et.created_at;`
  );
  return types;
};

// Update event type
export const updateEventType = async (
  oldName: string,
  oldOwner: number,
  icon: string,
  iconColor: string,
  availability?: number,
  newName?: string,
  owner?: number,
  weight?: number,
  expirationDate?: string
): Promise<void> => {
  try {
    const setClauses: string[] = [];
    const values: (string | number | null)[] = [];

    setClauses.push("icon = ?", "iconColor = ?");
    values.push(icon, iconColor);

    if (newName !== undefined) {
      setClauses.push("name = ?");
      values.push(newName);
    }
    if (owner !== undefined) {
      setClauses.push("owner = ?");
      values.push(owner ?? null);
    }
    if (availability !== undefined) {
      setClauses.push("availability = ?");
      values.push(availability);
    }
    if (weight !== undefined) {
      setClauses.push("weight = ?");
      values.push(weight);
    }
    if (expirationDate !== undefined) {
      setClauses.push("expiration_date = ?");
      values.push(expirationDate || null);
    }

    const query = `
      UPDATE event_types
      SET ${setClauses.join(", ")}
      WHERE name = ? AND owner = ?;
    `;
    values.push(oldName, oldOwner);

    const dbManager = DatabaseManager.getInstance();
    const db = dbManager.getDatabase();
    await db.runAsync(query, values);
  } catch (error) {
    console.error("Error updating event type:", error);
    throw error;
  }
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
  await db.runAsync("UPDATE users SET code = ?, updated_at = ? WHERE id = ?;", [
    newCode,
    new Date().toISOString(),
    userId,
  ]);
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
  await db.runAsync("UPDATE users SET icon = ?, updated_at = ? WHERE id = ?;", [
    icon,
    new Date().toISOString(),
    userId,
  ]);
};

// Reset user code
export const resetUserCode = async (userId: number, newCode: string) => {
  if (!/^\d{4}$/.test(newCode)) {
    throw new Error("Code must be a 4-digit number");
  }
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  await db.runAsync("UPDATE users SET code = ?, updated_at = ? WHERE id = ?;", [
    newCode,
    new Date().toISOString(),
    userId,
  ]);
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

// Check if event type has associated achievements
export const hasAssociatedAchievements = async (
  eventTypeName: string,
  owner: number | null
): Promise<boolean> => {
  try {
    const dbManager = DatabaseManager.getInstance();
    const db = dbManager.getDatabase();
    const count = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM events WHERE eventType = ? AND owner = ?;",
      [eventTypeName, owner || null]
    );
    return (count?.count || 0) > 0;
  } catch (error) {
    console.error("Error checking associated achievements:", error);
    throw error;
  }
};

// Check if an EventType has associated events
export const hasEventsForEventType = async (
  name: string,
  owner: number
): Promise<boolean> => {
  try {
    const dbManager = DatabaseManager.getInstance();
    const db = dbManager.getDatabase();
    const result = await db.getFirstAsync(
      `SELECT COUNT(*) as count FROM events WHERE eventType = ? AND owner = ?;`,
      [name, owner]
    );
    return (result as any).count > 0;
  } catch (error) {
    console.error("Error checking events for event type:", error);
    throw error;
  }
};

// Delete an EventType
export const deleteEventType = async (
  name: string,
  owner: number
): Promise<void> => {
  try {
    const dbManager = DatabaseManager.getInstance();
    const db = dbManager.getDatabase();
    await db.runAsync(`DELETE FROM event_types WHERE name = ? AND owner = ?;`, [
      name,
      owner,
    ]);
  } catch (error) {
    console.error("Error deleting event type:", error);
    throw error;
  }
};

// Create a product
export const createProduct = async (
  name: string,
  price: number,
  creator: number,
  description?: string,
  images?: string,
  online: boolean = false,
  quantity: number = 0,
  createdAt: string = new Date().toISOString() // Added createdAt parameter
): Promise<number> => {
  if (name.length > 20) {
    throw new Error("Product name must not exceed 20 characters");
  }
  if (description && description.length > 200) {
    throw new Error("Product description must not exceed 200 characters");
  }
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const result = await db.runAsync(
    `INSERT INTO products (name, description, images, price, creator, online, quantity, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      name,
      description || null,
      images || null,
      price,
      creator,
      online ? 1 : 0,
      quantity,
      createdAt,
      createdAt, // Set updatedAt to createdAt initially
    ]
  );
  return result.lastInsertRowId || 0;
};

// Get all products
export const getProducts = async (): Promise<Product[]> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const products = await db.getAllAsync<Product>(
    `SELECT p.id, p.name, p.description, p.images, p.price, p.creator, p.online, p.quantity, p.createdAt, p.updatedAt, u.name as creatorName
     FROM products p
     LEFT JOIN users u ON p.creator = u.id;`
  );
  return products;
};

// Get product by ID
export const getProductById = async (
  productId: number
): Promise<Product | null> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const product = await db.getFirstAsync<Product>(
    `SELECT p.id, p.name, p.description, p.images, p.price, p.creator, p.online, p.quantity, p.createdAt, p.updatedAt, u.name as creatorName
     FROM products p
     LEFT JOIN users u ON p.creator = u.id
     WHERE p.id = ?;`,
    [productId]
  );
  return product || null;
};

// Update a product
export const updateProduct = async (
  productId: number,
  name?: string,
  description?: string,
  images?: string,
  price?: number,
  online?: boolean,
  quantity?: number
): Promise<void> => {
  if (name && name.length > 20) {
    throw new Error("Product name must not exceed 20 characters");
  }
  if (description && description.length > 200) {
    throw new Error("Product description must not exceed 200 characters");
  }
  const setClauses: string[] = [];
  const values: (string | number | null | undefined)[] = [];

  if (name !== undefined) {
    setClauses.push("name = ?");
    values.push(name);
  }
  if (description !== undefined) {
    setClauses.push("description = ?");
    values.push(description || null);
  }
  if (images !== undefined) {
    setClauses.push("images = ?");
    values.push(images || null);
  }
  if (price !== undefined) {
    setClauses.push("price = ?");
    values.push(price);
  }
  if (online !== undefined) {
    setClauses.push("online = ?");
    values.push(online ? 1 : 0);
  }
  if (quantity !== undefined) {
    setClauses.push("quantity = ?");
    values.push(quantity);
  }
  // Always update updatedAt
  setClauses.push("updatedAt = ?");
  values.push(new Date().toISOString());

  if (setClauses.length === 1) {
    return; // Only updatedAt, no actual changes
  }

  const query = `UPDATE products SET ${setClauses.join(", ")} WHERE id = ?;`;
  values.push(productId);

  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  await db.runAsync(query, values);
};

// Delete a product
export const deleteProduct = async (productId: number): Promise<void> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  await db.runAsync("DELETE FROM products WHERE id = ?;", [productId]);
};

// Check if product has associated purchases
export const hasPurchasesForProduct = async (
  productId: number
): Promise<boolean> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const count = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM purchases WHERE product_id = ?;",
    [productId]
  );
  return (count?.count || 0) > 0;
};

// Create a purchase
export const createPurchase = async (
  productId: number,
  owner: number,
  price: number,
  quantity: number,
  fullfilled: boolean = false, // Keep fullfilled parameter
  createdAt: string = new Date().toISOString() // Added createdAt parameter
): Promise<number> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const result = await db.runAsync(
    `INSERT INTO purchases (product_id, owner, price, quantity, fullfilled, createdAt, fullfilledAt)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [
      productId,
      owner,
      price,
      quantity,
      fullfilled ? 1 : 0,
      createdAt,
      fullfilled ? createdAt : null, // Set fullfilledAt if fullfilled is true
    ]
  );
  return result.lastInsertRowId || 0;
};

// Get all purchases
export const getPurchases = async (): Promise<Purchase[]> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const purchases = await db.getAllAsync<Purchase>(
    `SELECT p.order_number, p.product_id, p.owner, p.price, p.quantity, p.fullfilled, p.createdAt, p.fullfilledAt, u.name as ownerName, pr.name as productName
     FROM purchases p
     LEFT JOIN users u ON p.owner = u.id
     LEFT JOIN products pr ON p.product_id = pr.id;`
  );
  return purchases;
};

// Get purchase by order number
export const getPurchaseByOrderNumber = async (
  orderNumber: number
): Promise<Purchase | null> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const purchase = await db.getFirstAsync<Purchase>(
    `SELECT p.order_number, p.product_id, p.owner, p.price, p.quantity, p.fullfilled, p.createdAt, p.fullfilledAt, u.name as ownerName, pr.name as productName
     FROM purchases p
     LEFT JOIN users u ON p.owner = u.id
     LEFT JOIN products pr ON p.product_id = pr.id
     WHERE p.order_number = ?;`,
    [orderNumber]
  );
  return purchase || null;
};

// Update a purchase
export const updatePurchase = async (
  orderNumber: number,
  productId?: number,
  owner?: number,
  price?: number,
  quantity?: number
): Promise<void> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();

  // Check if purchase exists and is not fulfilled
  const purchase = await db.getFirstAsync<{ fullfilled: number }>(
    `SELECT fullfilled FROM purchases WHERE order_number = ?;`,
    [orderNumber]
  );

  if (!purchase) {
    throw new Error(`Purchase with order_number ${orderNumber} not found`);
  }

  if (purchase.fullfilled === 1) {
    throw new Error(
      `Cannot update purchase with order_number ${orderNumber} because it is fullfilled`
    );
  }

  const setClauses: string[] = [];
  const values: (number | undefined)[] = [];

  if (productId !== undefined) {
    setClauses.push("product_id = ?");
    values.push(productId);
  }
  if (owner !== undefined) {
    setClauses.push("owner = ?");
    values.push(owner);
  }
  if (price !== undefined) {
    setClauses.push("price = ?");
    values.push(price);
  }
  if (quantity !== undefined) {
    setClauses.push("quantity = ?");
    values.push(quantity);
  }

  if (setClauses.length === 0) {
    return; // No updates to perform
  }

  const query = `UPDATE purchases SET ${setClauses.join(
    ", "
  )} WHERE order_number = ?;`;
  values.push(orderNumber);

  await db.runAsync(query, values);
};

// Fulfill a purchase
export const fulfillPurchase = async (
  orderNumber: number,
  fullfilledAt: string = new Date().toISOString()
): Promise<void> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();

  // Check if purchase exists
  const purchase = await db.getFirstAsync<{ fullfilled: number }>(
    `SELECT fullfilled FROM purchases WHERE order_number = ?;`,
    [orderNumber]
  );

  if (!purchase) {
    throw new Error(`Purchase with order_number ${orderNumber} not found`);
  }

  if (purchase.fullfilled === 1) {
    throw new Error(
      `Purchase with order_number ${orderNumber} is already fullfilled`
    );
  }

  await db.runAsync(
    `UPDATE purchases SET fullfilled = ?, fullfilledAt = ? WHERE order_number = ?;`,
    [1, fullfilledAt, orderNumber]
  );
};

// Delete a purchase
export const deletePurchase = async (orderNumber: number): Promise<void> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const purchase = await db.getFirstAsync<{ fullfilled: number }>(
    `SELECT fullfilled FROM purchases WHERE order_number = ?;`,
    [orderNumber]
  );

  if (!purchase) {
    throw new Error(`Purchase with order_number ${orderNumber} not found`);
  }

  if (purchase.fullfilled === 1) {
    throw new Error(
      `Cannot delete purchase with order_number ${orderNumber} because it is fullfilled`
    );
  }

  await db.runAsync("DELETE FROM purchases WHERE order_number = ?;", [
    orderNumber,
  ]);
};