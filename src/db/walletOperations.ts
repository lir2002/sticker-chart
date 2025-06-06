import { DatabaseManager } from "./databaseManager";
import { Wallet } from "../types";

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

// Get all wallets
export const getAllWallets = async (): Promise<Wallet[]> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const wallets = await db.getAllAsync<Wallet>(
    "SELECT owner, assets, credit FROM wallets;"
  );
  return wallets;
};
