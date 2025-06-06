import { DatabaseManager } from "./databaseManager";
import { Product } from "../types";

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

// Get all products (raw table data)
export const getProducts = async (): Promise<Product[]> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const products = await db.getAllAsync<Product>(
    `SELECT id, name, description, images, price, creator, online, quantity, createdAt, updatedAt
     FROM products;`
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
