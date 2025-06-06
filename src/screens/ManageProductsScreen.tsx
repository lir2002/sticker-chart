import React, { useState, useEffect, useCallback } from "react";
import { FlatList, TouchableOpacity, Image, Alert } from "react-native";
import * as FileSystem from "expo-file-system";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { RootStackParamList, Product } from "../types";
import { getProducts, getUsers } from "../db";
import { useLanguage } from "../contexts/LanguageContext";
import { YStack, XStack, Text, useTheme } from "tamagui";
import { StyledInput } from "../components/SharedComponents";
import { filterAndSortData } from "../utils/filterAndSort";
import { Dropdown } from "../components/Dropdown";

type ManageProductsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "ManageProducts"
>;

const ManageProductsScreen: React.FC<ManageProductsScreenProps> = ({
  navigation,
  route,
}) => {
  const { t } = useLanguage();
  const theme = useTheme();
  const shopMode = route.params?.shopMode || false; // Check if in shop mode

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");
  const [creatorFilter, setCreatorFilter] = useState("0");
  const [creators, setCreators] = useState<{ id: number; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sort options
  const sortOptions = [
    { label: t("nameAsc"), value: "name_asc" },
    { label: t("nameDesc"), value: "name_desc" },
    { label: t("priceAsc"), value: "price_asc" },
    { label: t("priceDesc"), value: "price_desc" },
    { label: t("createdAsc"), value: "created_asc" },
    { label: t("createdDesc"), value: "created_desc" },
  ];

  // Creator options for Dropdown
  const creatorOptions = creators.map((creator) => ({
    label: creator.name,
    value: creator.id.toString(),
  }));

  // Fetch products and users
  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      let fetchedProducts = await getProducts();

      // Filter for published products in shop mode
      if (shopMode) {
        fetchedProducts = fetchedProducts.filter((p) => p.online === 1 && p.quantity !== 0);
      }

      const fetchedUsers = await getUsers();
      setProducts(fetchedProducts);

      // Create a map of user IDs to names
      const userMap = new Map<number, string>();
      fetchedUsers.forEach((user) => userMap.set(user.id, user.name));

      // Build creators array with IDs and names
      const uniqueCreators = Array.from(
        new Set(fetchedProducts.map((p) => p.creator))
      )
        .map((id) => ({
          id: id,
          name: userMap.get(id) || `Creator ${id}`,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setCreators([{ id: 0, name: t("allCreators") }, ...uniqueCreators]);
    } catch (error) {
      Alert.alert(t("error"), `${t("errorFetchProducts")}: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [t, shopMode]);

  // Fetch products and users on mount
  useEffect(() => {
    fetchProducts();
    const unsubscribe = navigation.addListener("focus", () => {
      fetchProducts();
    });
    return unsubscribe;
  }, [navigation, fetchProducts]);

  // Set navigation title
  useEffect(() => {
    navigation.setOptions({
      title: shopMode ? t("browseStore") : t("manageProducts"),
    });
  }, [navigation, shopMode, t]);

  // Filter and sort products
  useEffect(() => {
    let result = [...products];

    // Apply shop mode filter
    if (shopMode) {
      result = result.filter((p) => p.online === 1);
    }

    // Apply filtering and sorting
    const filtered = filterAndSortData<Product>({
      data: result,
      searchQuery,
      sortBy,
      creatorFilter,
    });
    setFilteredProducts(filtered);
  }, [products, searchQuery, creatorFilter, sortBy, shopMode]);

  // Render product card
  const renderProduct = ({ item }: { item: Product }) => {
    const firstImage = item.images ? item.images.split(",")[0] : null;
    return (
      <TouchableOpacity
        onPress={() =>
          shopMode
            ? navigation.navigate("ProductPreview", {
                productId: item.id,
                productName: item.name,
                description: item.description || "",
                price: item.price,
                images: item.images ? item.images.split(",") : [],
                quantity: item.quantity,
                online: item.online,
              })
            : navigation.navigate("EditItem", { productId: item.id })
        }
        style={{
          backgroundColor: theme.background.val,
          borderRadius: 5,
          marginVertical: 8,
          marginHorizontal: 16,
          padding: 6,
          elevation: 2,
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          height: 134,
        }}
      >
        <XStack gap="$3" ai="center">
          {/* Image Area */}
          <YStack width={120} height={120} jc="center" ai="center">
            {firstImage ? (
              <Image
                source={{ uri: `${FileSystem.documentDirectory}${firstImage}` }}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 10,
                }}
                resizeMode="cover"
              />
            ) : (
              <MaterialIcons name="image" size={120} color={theme.icon.val} />
            )}
          </YStack>
          {/* Text Area */}
          <YStack flex={1} gap="$1">
            <Text
              fontSize="$4"
              fontWeight="bold"
              color={theme.text.val}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {item.name}
            </Text>
            <Text fontSize="$4" color={theme.text.val}>
              {t("price")}: {item.price.toFixed(2)}
            </Text>
            <Text fontSize="$4" color={theme.text.val}>
              {t("quantity")}: {item.quantity}
            </Text>
            {!shopMode && (
              <Text fontSize="$4" color={theme.text.val}>
                {t("status")}: {item.online ? t("published") : t("unpublished")}
              </Text>
            )}
            <Text fontSize="$4" color={theme.text.val}>
              {t("creator")}:{" "}
              {creators.find((creator) => creator.id === item.creator)?.name}
            </Text>
          </YStack>
        </XStack>
      </TouchableOpacity>
    );
  };

  return (
    <YStack flex={1} bg={theme.background.val} p="$4">
      {shopMode && (
        <XStack mb="$2" jc="space-between" ai="center" mx="$2">
          <TouchableOpacity
            onPress={() => navigation.navigate("TransactionHistory")}
          >
            <MaterialIcons
              name="history"
              size={24}
              color={theme.icon.val}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("MyOrders")}>
            <MaterialIcons
              name="shopping-cart"
              size={24}
              color={theme.icon.val}
            />
          </TouchableOpacity>
        </XStack>
      )}
      <XStack mb="$1">
        <StyledInput
          my="$0"
          flex={1}
          placeholder={t("searchProducts")}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </XStack>
      <XStack mb="$1">
        <Dropdown
          value={sortBy}
          onValueChange={setSortBy}
          items={sortOptions}
          placeholder={t("sortBy")}
        />
      </XStack>
      <XStack mb="$1">
        <Dropdown
          value={creatorFilter}
          onValueChange={setCreatorFilter}
          items={creatorOptions}
          placeholder={t("allCreators")}
        />
      </XStack>
      {isLoading ? (
        <YStack flex={1} jc="center" ai="center">
          <Text fontSize="$5" color={theme.text.val}>
            {t("loading")}
          </Text>
        </YStack>
      ) : filteredProducts.length === 0 ? (
        <YStack flex={1} jc="center" ai="center">
          <Text fontSize="$5" color={theme.text.val}>
            {t("noProducts")}
          </Text>
        </YStack>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      )}
    </YStack>
  );
};

export default ManageProductsScreen;
