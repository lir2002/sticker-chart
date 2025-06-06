import { DatabaseManager } from "./databaseManager";
import { User, Role, DbVersion } from "../types";

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
