import { DatabaseManager } from "./databaseManager";
import { ProductImage } from "../types";

// Create a product image
export const createProductImage = async (
  id: number,
  referred: number = 1
): Promise<void> => {
  if (referred <= 0) {
    throw new Error("Referred must be a positive integer");
  }
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  await db.runAsync(`INSERT INTO productImages (id, referred) VALUES (?, ?);`, [
    id,
    referred,
  ]);
};

// Get all product images
export const getProductImages = async (): Promise<ProductImage[]> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const images = await db.getAllAsync<ProductImage>(
    `SELECT id, referred FROM productImages;`
  );
  return images;
};

// Get product image by ID
export const getProductImageById = async (
  id: number
): Promise<ProductImage | null> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const image = await db.getFirstAsync<ProductImage>(
    `SELECT id, referred FROM productImages WHERE id = ?;`,
    [id]
  );
  return image || null;
};

// Update a product image
export const updateProductImage = async (
  id: number,
  referred?: number
): Promise<void> => {
  if (referred !== undefined && referred <= 0) {
    throw new Error("Referred must be a positive integer");
  }
  const setClauses: string[] = [];
  const values: (number | undefined)[] = [];

  if (referred !== undefined) {
    setClauses.push("referred = ?");
    values.push(referred);
  }

  if (setClauses.length === 0) {
    return; // No updates to perform
  }

  const query = `UPDATE productImages SET ${setClauses.join(
    ", "
  )} WHERE id = ?;`;
  values.push(id);

  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  await db.runAsync(query, values);
};

// Delete a product image
export const deleteProductImage = async (id: number): Promise<void> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  await db.runAsync("DELETE FROM productImages WHERE id = ?;", [id]);
  console.log("Removing Reference of ", id);
};
