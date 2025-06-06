import { DatabaseManager } from "./databaseManager";
import { Purchase } from "../types";
import { addImageToRefer } from "../utils/imageUtils";
import { t } from "../utils/translation";
import { getProductById, updateProduct } from "./productOperations";
import { getWallet, updateWallet, insertTransaction } from "./walletOperations";
import { getUserById } from "./userOperations";

// Create a purchase
export const createPurchase = async (
  productId: number,
  owner: number,
  price: number,
  quantity: number,
  productName: string,
  description: string | null,
  images: string[],
  createdAt: string = new Date().toISOString()
): Promise<number> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();

  const imagesString = images.join(",");

  const result = await db.runAsync(
    `INSERT INTO purchases (product_id, owner, price, quantity, createdAt, fulfilledAt, productName, description, images, fulfilledBy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      productId,
      owner,
      price,
      quantity,
      createdAt,
      null, // fulfilledAt is null initially
      productName,
      description || null,
      imagesString || null,
      null, // fulfilledBy is null initially
    ]
  );
  for (const image of images) {
    addImageToRefer(image);
  }
  return result.lastInsertRowId || 0;
};

// Get all purchases (raw table data)
export const getPurchases = async (): Promise<Purchase[]> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const purchases = await db.getAllAsync<Purchase>(
    `SELECT order_number, product_id, owner, price, quantity, createdAt, fulfilledAt, productName, description, images, fulfilledBy
     FROM purchases;`
  );
  return purchases;
};

// Get all purchases with details
export const getAllPurchases = async (): Promise<Purchase[]> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const purchases = await db.getAllAsync<Purchase>(
    `SELECT p.order_number, p.product_id, p.owner, p.price, p.quantity, p.createdAt, 
            p.fulfilledAt, p.productName, p.description, p.images, p.fulfilledBy,
            u.name AS ownerName, uf.name AS fulfilledByName
     FROM purchases p
     LEFT JOIN users u ON p.owner = u.id
     LEFT JOIN users uf ON p.fulfilledBy = uf.id;`
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
    `SELECT p.order_number, p.product_id, p.owner, p.price, p.quantity, p.createdAt, p.fulfilledAt, 
            p.productName, p.description, p.images, p.fulfilledBy,
            u.name AS ownerName, u.icon AS ownerIcon,
            uf.name AS fulfilledByName, uf.icon AS fulfilledByIcon
     FROM purchases p
     LEFT JOIN users u ON p.owner = u.id
     LEFT JOIN users uf ON p.fulfilledBy = uf.id
     WHERE p.order_number = ?;`,
    [orderNumber]
  );
  return purchase || null;
};

// Get purchases by user
export const getPurchasesByUser = async (
  userId: number
): Promise<Purchase[]> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const purchases = await db.getAllAsync<Purchase>(
    `SELECT p.order_number, p.product_id, p.owner, p.price, p.quantity, p.createdAt, p.fulfilledAt, 
            p.productName, p.description, p.images, p.fulfilledBy,
            u.name AS ownerName, uf.name AS fulfilledByName
     FROM purchases p
     LEFT JOIN users u ON p.owner = u.id
     LEFT JOIN users uf ON p.fulfilledBy = uf.id
     WHERE p.owner = ?;`,
    [userId]
  );
  return purchases;
};

// Update a purchase
export const updatePurchase = async (
  orderNumber: number,
  productId?: number,
  owner?: number,
  price?: number,
  quantity?: number,
  fulfilledBy?: number,
  fulfilledAt?: string
): Promise<void> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();

  // Check if purchase exists and is not fulfilled
  const purchase = await db.getFirstAsync<{ fulfilledAt: string | null }>(
    `SELECT fulfilledAt FROM purchases WHERE order_number = ?;`,
    [orderNumber]
  );

  if (!purchase) {
    throw new Error(`Purchase with order_number ${orderNumber} not found`);
  }

  if (purchase.fulfilledAt) {
    throw new Error(
      `Cannot update purchase with order_number ${orderNumber} because it is fulfilled`
    );
  }

  const setClauses: string[] = [];
  const values: (number | string | null | undefined)[] = [];

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
  if (fulfilledBy !== undefined) {
    setClauses.push("fulfilledBy = ?");
    values.push(fulfilledBy);
  }
  if (fulfilledAt !== undefined) {
    setClauses.push("fulfilledAt = ?");
    values.push(fulfilledAt || null);
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
  fulfilledBy: number,
  fulfilledAt: string = new Date().toISOString()
): Promise<void> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();

  // Check if purchase exists
  const purchase = await db.getFirstAsync<{ fulfilledAt: string | null }>(
    `SELECT fulfilledAt FROM purchases WHERE order_number = ?;`,
    [orderNumber]
  );

  if (!purchase) {
    throw new Error(`Purchase with order_number ${orderNumber} not found`);
  }

  if (purchase.fulfilledAt) {
    throw new Error(
      `Purchase with order_number ${orderNumber} is already fulfilled`
    );
  }

  // Verify fulfilledBy user exists
  const user = await getUserById(fulfilledBy);
  if (!user) {
    throw new Error(`User with ID ${fulfilledBy} not found`);
  }

  await db.runAsync(
    `UPDATE purchases SET fulfilledAt = ?, fulfilledBy = ? WHERE order_number = ?;`,
    [fulfilledAt, fulfilledBy, orderNumber]
  );
};

// Cancel a purchase
export const cancelPurchase = async (
  orderNumber: number,
  userId: number // For transaction records and authorization check
): Promise<void> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();

  // Fetch purchase
  const purchase = await getPurchaseByOrderNumber(orderNumber);
  if (!purchase) {
    throw new Error(`Purchase with order_number ${orderNumber} not found`);
  }

  // Check if already canceled
  if (purchase.quantity === 0) {
    throw new Error(
      `Purchase with order_number ${orderNumber} is already canceled`
    );
  }

  // Fetch product
  const product = await getProductById(purchase.product_id);
  if (!product) {
    throw new Error(`Product with ID ${purchase.product_id} not found`);
  }

  const totalCost = purchase.price * purchase.quantity;
  const creatorId = product.creator;
  const buyerId = purchase.owner;

  await db.withTransactionAsync(async () => {
    // Refund buyer
    const buyerWallet = await getWallet(buyerId);
    if (!buyerWallet) {
      throw new Error(`Buyer wallet for user ${buyerId} not found`);
    }
    const newBuyerAssets = buyerWallet.assets + totalCost;
    await updateWallet(buyerId, newBuyerAssets, buyerWallet.credit);

    // Deduct from creator
    const creatorWallet = await getWallet(creatorId);
    if (!creatorWallet) {
      throw new Error(`Creator wallet for user ${creatorId} not found`);
    }
    const newCreatorAssets = creatorWallet.assets - totalCost;
    await updateWallet(creatorId, newCreatorAssets, creatorWallet.credit);

    // Update product quantity
    const newProductQuantity = product.quantity + purchase.quantity;
    await updateProduct(
      product.id,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      newProductQuantity
    );

    // Update purchase quantity to 0
    const timestamp = new Date().toISOString();
    await updatePurchase(
      purchase.order_number,
      undefined,
      undefined,
      undefined,
      0,
      userId,
      timestamp
    );

    // Insert transaction records
    await insertTransaction(
      buyerId,
      t("refundFor", {
        quantity: purchase.quantity,
        productName: purchase.productName,
        productId: purchase.product_id,
        oid: purchase.order_number,
        unitPrice: purchase.price,
      }),
      totalCost,
      creatorId,
      timestamp,
      newBuyerAssets
    );
    await insertTransaction(
      creatorId,
      t("deductionForRefund", {
        quantity: purchase.quantity,
        productName: purchase.productName,
        productId: purchase.product_id,
        oid: purchase.order_number,
        unitPrice: purchase.price,
      }),
      -totalCost,
      buyerId,
      timestamp,
      newCreatorAssets
    );
  });
};

// Delete a purchase
export const deletePurchase = async (orderNumber: number): Promise<void> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  const purchase = await db.getFirstAsync<{ fulfilledAt: string | null }>(
    `SELECT fulfilledAt FROM purchases WHERE order_number = ?;`,
    [orderNumber]
  );

  if (!purchase) {
    throw new Error(`Purchase with order_number ${orderNumber} not found`);
  }

  if (purchase.fulfilledAt) {
    throw new Error(
      `Cannot delete purchase with order_number ${orderNumber} because it is fulfilled`
    );
  }

  await db.runAsync("DELETE FROM purchases WHERE order_number = ?;", [
    orderNumber,
  ]);
};

// Process a purchase
export const processPurchase = async (
  userId: number,
  productId: number,
  purchaseQuantity: number,
  unitPrice: number,
  productName: string,
  description: string | null,
  images: string[]
): Promise<number> => {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();

  // Fetch product early to validate and set initial newQuantity
  const product = await getProductById(productId);
  if (!product) {
    throw new Error("Product not found");
  }

  // Check if user is not the creator
  if (product.creator === userId) {
    throw new Error("Cannot purchase own product");
  }

  // Check product quantity
  if (product.quantity < purchaseQuantity) {
    throw new Error("Insufficient product quantity");
  }

  // Fetch buyer and creator wallets
  const buyerWallet = await getWallet(userId);
  if (!buyerWallet) {
    throw new Error("Buyer wallet not found");
  }

  const totalCost = unitPrice * purchaseQuantity;
  if (buyerWallet.assets < totalCost) {
    throw new Error("Insufficient credit");
  }

  const creatorWallet = await getWallet(product.creator);
  if (!creatorWallet) {
    throw new Error("Creator wallet not found");
  }

  // Initialize newQuantity
  let newQuantity: number = product.quantity - purchaseQuantity;

  await db.withTransactionAsync(async () => {
    // Update wallets
    const newBuyerAssets = buyerWallet.assets - totalCost;
    await updateWallet(userId, newBuyerAssets, buyerWallet.credit);

    const newCreatorAssets = creatorWallet.credit + totalCost;
    await updateWallet(product.creator, newCreatorAssets, creatorWallet.credit);

    // Update product quantity
    await updateProduct(
      productId,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      newQuantity
    );

    const timestamp = new Date().toISOString();
    // Create purchase record
    const oid = await createPurchase(
      productId,
      userId,
      unitPrice,
      purchaseQuantity,
      productName,
      description,
      images,
      timestamp
    );

    // Add transaction records
    await insertTransaction(
      userId,
      t("purchased", {
        quantity: purchaseQuantity,
        productName,
        oid,
        productId,
        unitPrice,
      }),
      -totalCost,
      product.creator,
      timestamp,
      newBuyerAssets
    );
    await insertTransaction(
      product.creator,
      t("sold", {
        quantity: purchaseQuantity,
        productName,
        oid,
        productId,
        unitPrice,
      }),
      totalCost,
      userId,
      timestamp,
      newCreatorAssets
    );
  });

  return newQuantity;
};
