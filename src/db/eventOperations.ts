import { DatabaseManager } from "./databaseManager";
import { Event, EventType } from "../types";

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
