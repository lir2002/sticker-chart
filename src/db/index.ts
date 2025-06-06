// Re-export from databaseManager
export { DatabaseManager, initDatabase } from "./databaseManager";

// Re-export from userOperations
export {
  createUser,
  getUsers,
  getUserByName,
  getUserById,
  updateUserContact,
  getRoles,
  getDbVersion,
  forceAdminPasswordSetup,
  updateUserCode,
  verifyUserCode,
  updateUserIcon,
  resetUserCode,
  deleteUser,
  hasEventTypeOwner,
} from "./userOperations";

// Re-export from walletOperations
export {
  getWallet,
  updateWallet,
  insertTransaction,
  fetchTransactions,
  getAllWallets,
} from "./walletOperations";

// Re-export from eventOperations
export {
  insertEventType,
  insertEvent,
  fetchEvents,
  fetchEventsWithCreator,
  fetchAllEventsWithDetails,
  fetchAllEvents,
  deleteEvent,
  verifyEvent,
  verifyEventWithTransaction,
  getEventTypes,
  getEventTypesWithOwner,
  updateEventType,
  hasAssociatedAchievements,
  hasEventsForEventType,
  deleteEventType,
} from "./eventOperations";

// Re-export from productOperations
export {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  hasPurchasesForProduct,
} from "./productOperations";

// Re-export from purchaseOperations
export {
  createPurchase,
  getPurchases,
  getAllPurchases,
  getPurchaseByOrderNumber,
  getPurchasesByUser,
  updatePurchase,
  fulfillPurchase,
  cancelPurchase,
  deletePurchase,
  processPurchase,
} from "./purchaseOperations";

// Re-export from productImageOperations
export {
  createProductImage,
  getProductImages,
  getProductImageById,
  updateProductImage,
  deleteProductImage,
} from "./productImageOperations";