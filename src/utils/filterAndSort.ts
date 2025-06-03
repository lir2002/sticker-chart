import { Product, Purchase } from "../types";

interface FilterSortOptions<T> {
  data: T[];
  searchQuery: string;
  sortBy: string;
  creatorFilter?: string; // For Products
  fulfillmentFilter?: "all" | "fulfilled" | "unfulfilled" | "canceled"; // For Purchases
  fulfillerFilter?: string; // For Purchases
}

export const filterAndSortData = <T extends Product | Purchase>({
  data,
  searchQuery,
  sortBy,
  creatorFilter,
  fulfillmentFilter,
  fulfillerFilter,
}: FilterSortOptions<T>): T[] => {
  let result = [...data];

  // Apply search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    result = result.filter(
      (item) =>
        ("name" in item
          ? item.name.toLowerCase().includes(query)
          : item.productName?.toLowerCase().includes(query)) ||
        (item.description && item.description.toLowerCase().includes(query))
    );
  }

  // Apply creator filter (for Products)
  if (creatorFilter && creatorFilter !== "0") {
    result = result.filter(
      (item) => "creator" in item && item.creator.toString() === creatorFilter
    );
  }

  // Apply fulfillment filter (for Purchases)
  if (fulfillmentFilter && fulfillmentFilter !== "all") {
    result = result.filter((item) => {
      if ("fulfilledAt" in item && "quantity" in item) {
        if (fulfillmentFilter === "fulfilled") {
          return !!item.fulfilledAt && item.quantity !== 0; // Updated
        }
        if (fulfillmentFilter === "unfulfilled") {
          return !item.fulfilledAt && item.quantity !== 0; // Updated
        }
        if (fulfillmentFilter === "canceled") {
          return item.quantity === 0; // Added
        }
      }
      return true; // Skip for Product
    });
  }

  // Apply fulfiller filter (for Purchases)
  if (fulfillerFilter && fulfillerFilter !== "0") {
    result = result.filter(
      (item) =>
        "fulfilledBy" in item && item.fulfilledBy?.toString() === fulfillerFilter
    );
  }

  // Apply sorting
  result.sort((a, b) => {
    switch (sortBy) {
      case "name_asc":
      case "productName_asc":
        return (
          ("name" in a ? a.name : a.productName || "").localeCompare(
            "name" in b ? b.name : b.productName || ""
          ) || 0
        );
      case "name_desc":
      case "productName_desc":
        return (
          ("name" in b ? b.name : b.productName || "").localeCompare(
            "name" in a ? a.name : a.productName || ""
          ) || 0
        );
      case "price_asc":
        return a.price - b.price;
      case "price_desc":
        return b.price - a.price;
      case "created_asc":
        return (a.createdAt || "").localeCompare(b.createdAt || "");
      case "created_desc":
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      case "fulfilledAt_asc":
        return (a as Purchase).fulfilledAt?.localeCompare(
          (b as Purchase).fulfilledAt || ""
        ) || 0;
      case "fulfilledAt_desc":
        return (b as Purchase).fulfilledAt?.localeCompare(
          (a as Purchase).fulfilledAt || ""
        ) || 0;
      default:
        return 0;
    }
  });

  return result;
};