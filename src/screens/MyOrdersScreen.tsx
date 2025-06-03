// screens/MyOrdersScreen.tsx
import React, { useState, useEffect, useCallback, useContext } from "react";
import { FlatList, Image, TouchableOpacity } from "react-native";
import * as FileSystem from "expo-file-system";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { YStack, XStack, Text, useTheme } from "tamagui";
import { StyledInput } from "../components/SharedComponents";
import { getPurchasesByUser, getUsers } from "../db/database";
import { filterAndSortData } from "../utils/filterAndSort";
import { Purchase, RootStackParamList, User } from "../types";
import { useLanguage } from "../contexts/LanguageContext";
import { UserContext } from "../contexts/UserContext";
import { Dropdown } from "../components/Dropdown";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

type MyOrdersScreenProp = NativeStackScreenProps<
  RootStackParamList,
  "MyOrders"
>;

const MyOrdersScreen: React.FC<MyOrdersScreenProp> = ({ navigation }) => {
  const { currentUser } = useContext(UserContext);
  const { t } = useLanguage();
  const theme = useTheme();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("created_desc");
  const [fulfillmentFilter, setFulfillmentFilter] = useState<
    "all" | "fulfilled" | "unfulfilled" | "canceled"
  >("all");
  const [fulfillerFilter, setFulfillerFilter] = useState("0");
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sort options
  const sortOptions = [
    { label: t("productNameAsc"), value: "productName_asc" },
    { label: t("productNameDesc"), value: "productName_desc" },
    { label: t("priceAsc"), value: "price_asc" },
    { label: t("priceDesc"), value: "price_desc" },
    { label: t("createdAsc"), value: "created_asc" },
    { label: t("createdDesc"), value: "created_desc" },
    { label: t("fulfilledAtAsc"), value: "fulfilledAt_asc" },
    { label: t("fulfilledAtDesc"), value: "fulfilledAt_desc" },
  ];

  // Fulfillment options
  const fulfillmentOptions = [
    { label: t("allOrders"), value: "all" },
    { label: t("fulfilled"), value: "fulfilled" },
    { label: t("unfulfilled"), value: "unfulfilled" },
    { label: t("canceled"), value: "canceled" },
  ];

  // Fulfiller options
  const fulfillerOptions = [
    { label: t("allFulfillers"), value: "0" },
    ...users.map((user) => ({
      label: user.name,
      value: user.id.toString(),
    })),
  ];

  // Fetch purchases and users
  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    try {
      setIsLoading(true);
      const userPurchases = await getPurchasesByUser(currentUser.id);
      setPurchases(userPurchases);
      const fetchedUsers = await getUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData();
    const unsubscribe = navigation.addListener("focus", () => fetchData());
  }, [fetchData]);

  // Filter and sort purchases
  useEffect(() => {
    const filtered = filterAndSortData<Purchase>({
      data: purchases,
      searchQuery,
      sortBy,
      fulfillmentFilter,
      fulfillerFilter,
    });
    setFilteredPurchases(filtered);
  }, [purchases, searchQuery, sortBy, fulfillmentFilter, fulfillerFilter]);

  // Render purchase card
  const renderPurchase = ({ item }: { item: Purchase }) => {
    const firstImage = item.images ? item.images.split(",")[0] : null;
    const isCanceled = item.quantity === 0;
    const isFulfilled = !!item.fulfilledAt && item.quantity !== 0;
    return (
      <TouchableOpacity
        onPress={() =>
          navigation.navigate("OrderDetails", {
            orderNumber: item.order_number,
          })
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
              {item.productName || t("unknownProduct")}
            </Text>
            <Text fontSize="$4" color={theme.text.val}>
              {t("price")}: ¥{item.price.toFixed(2)}
            </Text>
            <Text fontSize="$4" color={theme.text.val}>
              {t("quantity")}: {item.quantity}
            </Text>
            {item.quantity === 0 ? (
              <Text fontSize="$4" color={theme.text.val}>
                {t("canceled")}: {item.fulfilledByName}
                <MaterialIcons
                  name="cancel"
                  size={18}
                  color={theme.faded.val}
                />
              </Text>
            ) : item.fulfilledAt ? (
              <Text fontSize="$4" color={theme.text.val}>
                {t("fulfilledBy")}: {item.fulfilledByName}
                <MaterialIcons
                  name="check-circle"
                  size={18}
                  color={theme.verified.val}
                />
              </Text>
            ) : (
              <Text fontSize="$4" color={theme.text.val}>
                {t("fulfilled")}: {t("no")}
                <MaterialIcons
                  name="pending"
                  size={18}
                  color={theme.gray.val}
                />
              </Text>
            )}
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
          placeholder={t("searchOrders")}
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
          value={fulfillmentFilter}
          onValueChange={setFulfillmentFilter}
          items={fulfillmentOptions}
          placeholder={t("fulfillmentStatus")}
        />
      </XStack>
      <XStack mb="$1">
        <Dropdown
          value={fulfillerFilter}
          onValueChange={setFulfillerFilter}
          items={fulfillerOptions}
          placeholder={t("allFulfillers")}
        />
      </XStack>
      {isLoading ? (
        <YStack flex={1} jc="center" ai="center">
          <Text fontSize="$5" color={theme.text.val}>
            {t("loading")}
          </Text>
        </YStack>
      ) : filteredPurchases.length === 0 ? (
        <YStack flex={1} jc="center" ai="center">
          <Text fontSize="$5" color={theme.text.val}>
            {t("noOrders")}
          </Text>
        </YStack>
      ) : (
        <FlatList
          data={filteredPurchases}
          renderItem={renderPurchase}
          keyExtractor={(item) => item.order_number.toString()}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      )}
    </YStack>
  );
};

export default MyOrdersScreen;
