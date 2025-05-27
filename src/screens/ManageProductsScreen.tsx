import React, { useState, useEffect, useContext, useCallback } from "react";
import { FlatList, TouchableOpacity, Image, Alert, Modal } from "react-native";
import * as FileSystem from "expo-file-system";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { RootStackParamList, Product, User } from "../types";
import { getProducts, getUsers } from "../db/database";
import { useLanguage } from "../contexts/LanguageContext";
import { YStack, XStack, Text, useTheme, Select, Input, Button } from "tamagui";
import { StyledInput } from "../components/SharedComponents";

// Dropdown Component
const Dropdown = ({
  value,
  onValueChange,
  items,
  placeholder,
}: {
  value: string;
  onValueChange: (value: string) => void;
  items: { label: string; value: string }[];
  placeholder: string;
}) => {
  const theme = useTheme();
  const [isModalVisible, setModalVisible] = useState(false);

  const selectedItem = items.find((item) => item.value === value);

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: theme.background.val,
          borderWidth: 1,
          borderColor: theme.border?.val,
          borderRadius: 5,
          padding: 10,
          height: 40,
        }}
      >
        <Text
          flex={1}
          color={selectedItem ? theme.text.val : theme.text.val + "80"}
        >
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
        <MaterialIcons
          name="arrow-drop-down"
          size={24}
          color={theme.icon.val}
        />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => setModalVisible(false)}
        >
          <YStack
            backgroundColor={theme.background.val}
            borderRadius={10}
            width="80%"
            maxHeight="50%"
            padding={10}
          >
            <FlatList
              data={items}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onValueChange(item.value);
                    setModalVisible(false);
                  }}
                  style={{
                    padding: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border?.val + "20",
                  }}
                >
                  <Text color={theme.text.val}>{item.label}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.value}
            />
          </YStack>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

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
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");
  const [creatorFilter, setCreatorFilter] = useState("all");
  const [creators, setCreators] = useState<{ id: string; name: string }[]>([]);
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
    value: creator.id,
  }));

  // Fetch products and users
  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      let fetchedProducts = await getProducts();

      // Filter for published products in shop mode
      if (shopMode) {
        fetchedProducts = fetchedProducts.filter((p) => p.online === 1);
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
          id: id.toString(),
          name: userMap.get(id) || `Creator ${id}`,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setCreators([{ id: "all", name: t("allCreators") }, ...uniqueCreators]);
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

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query))
      );
    }

    // Apply creator filter
    if (creatorFilter !== "all") {
      result = result.filter((p) => p.creator.toString() === creatorFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "price_asc":
          return a.price - b.price;
        case "price_desc":
          return b.price - a.price;
        case "created_asc":
          return a.createdAt?.localeCompare(b.createdAt!);
        case "created_desc":
          return b.createdAt?.localeCompare(a.createdAt!);
        default:
          return 0;
      }
    });

    setFilteredProducts(result);
  }, [products, searchQuery, creatorFilter, sortBy]);

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
          <YStack flex={1} gap="$2">
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
              {t("price")}: ${item.price.toFixed(2)}
            </Text>
            {!shopMode && (
              <Text fontSize="$4" color={theme.text.val}>
                {t("status")}: {item.online ? t("published") : t("unpublished")}
              </Text>
            )}
            <Text fontSize="$4" color={theme.text.val}>
              {t("creator")}: {item.creatorName}
            </Text>
          </YStack>
        </XStack>
      </TouchableOpacity>
    );
  };

  return (
    <YStack flex={1} bg={theme.background.val} p="$4">
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
