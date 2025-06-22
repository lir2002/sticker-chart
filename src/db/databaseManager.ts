import * as SQLite from "expo-sqlite";

// Current database version
const CURRENT_DB_VERSION = 10; // Incremented from 9 to 10 for productImages table and purchases table changes

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
          createdAt TEXT NOT NULL,
          fulfilledAt TEXT,
          productName TEXT,
          description TEXT,
          images TEXT,
          fulfilledBy INTEGER,
          FOREIGN KEY (product_id) REFERENCES products(id),
          FOREIGN KEY (owner) REFERENCES users(id),
          FOREIGN KEY (fulfilledBy) REFERENCES users(id)
        );

        -- New productImages table
        CREATE TABLE IF NOT EXISTS productImages (
          id INTEGER PRIMARY KEY,
          referred INTEGER NOT NULL CHECK (referred > 0)
        );

        CREATE INDEX IF NOT EXISTS idx_productImages_id ON productImages(id);
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
      `);
      }

      if (currentVersion < 10) {
        // Migration to add productImages table and update purchases table
        await db.execAsync(`
        CREATE TABLE IF NOT EXISTS productImages (
          id INTEGER PRIMARY KEY,
          referred INTEGER NOT NULL CHECK (referred > 0)
        );

        CREATE INDEX IF NOT EXISTS idx_productImages_id ON productImages(id);        

        DROP TABLE IF EXISTS purchases;

        -- Create a new purchases table with updated schema
        CREATE TABLE IF NOT EXISTS purchases (
          order_number INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          owner INTEGER NOT NULL,
          price REAL NOT NULL,
          quantity INTEGER NOT NULL,
          createdAt TEXT NOT NULL,
          fulfilledAt TEXT,
          productName TEXT,
          description TEXT,
          images TEXT,
          fulfilledBy INTEGER,
          FOREIGN KEY (product_id) REFERENCES products(id),
          FOREIGN KEY (owner) REFERENCES users(id),
          FOREIGN KEY (fulfilledBy) REFERENCES users(id)
        );
      `);

        // Populate productImages from products.images
        const products = await db.getAllAsync<{
          id: number;
          images: string;
        }>(`SELECT id, images FROM products WHERE images IS NOT NULL;`);

        for (const product of products) {
          const imagePaths = product.images.split(",");
          for (const imagePath of imagePaths) {
            if (imagePath.trim()) {
              // Extract numeric part from path (e.g., "products/product_1748085019240.jpg" -> "1748085019240")
              const match = imagePath.match(/product_(\d+)\.jpg/);
              if (match && match[1]) {
                const imageId = parseInt(match[1], 10);
                try {
                  await db.runAsync(
                    `INSERT OR IGNORE INTO productImages (id, referred) VALUES (?, ?);`,
                    [imageId, 1]
                  );
                } catch (error) {
                  console.warn(
                    `Failed to insert productImage for product ${product.id} with imageId ${imageId}: ${error}`
                  );
                }
              } else {
                console.warn(
                  `No valid timestamp found in image path for product ${product.id}: ${imagePath}`
                );
              }
            }
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