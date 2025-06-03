import React, { useState, useEffect, useContext } from "react";
import { Image, Alert, ScrollView, TouchableOpacity } from "react-native";
import * as FileSystem from "expo-file-system";
import { YStack, XStack, Text, useTheme } from "tamagui";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import {
  getPurchaseByOrderNumber,
  fulfillPurchase,
  cancelPurchase,
} from "../db/database";
import { useLanguage } from "../contexts/LanguageContext";
import { UserContext } from "../contexts/UserContext";
import { Purchase } from "../types";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { getSystemLanguage } from "../utils/langUtils";

type OrderDetailsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "OrderDetails"
>;

const OrderDetailsScreen: React.FC<OrderDetailsScreenProps> = ({
  route,
  navigation,
}) => {
  const { orderNumber } = route.params;
  const { currentUser } = useContext(UserContext);
  const { t, language } = useLanguage();
  const theme = useTheme();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch order details
  useEffect(() => {
    const fetchPurchase = async () => {
      try {
        setIsLoading(true);
        const fetchedPurchase = await getPurchaseByOrderNumber(orderNumber);
        if (!fetchedPurchase) {
          Alert.alert(t("error"), t("orderNotFound"));
          navigation.goBack();
          return;
        }
        setPurchase(fetchedPurchase);
      } catch (error) {
        Alert.alert(t("error"), `${t("errorFetchOrder")}: ${error}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPurchase();
  }, [orderNumber, navigation, t]);

  // Handle fulfillment
  const handleFulfill = async () => {
    if (!currentUser || currentUser.role_id !== 1 || !purchase) return;
    try {
      await fulfillPurchase(purchase.order_number, currentUser.id);
      const updatedPurchase = await getPurchaseByOrderNumber(
        purchase.order_number
      );
      setPurchase(updatedPurchase);
      Alert.alert(t("success"), t("orderFulfilled"));
    } catch (error) {
      Alert.alert(t("error"), `${t("errorFulfillOrder")}: ${error}`);
    }
  };

  // Handle cancellation
  const handleCancel = async () => {
    if (!currentUser || !purchase || purchase.quantity === 0) return;

    // Check if currentUser is owner or admin
    if (currentUser.id !== purchase.owner && currentUser.role_id !== 1) {
      Alert.alert(t("error"), t("unauthorizedCancel"));
      return;
    }

    // Add confirmation Alert
    const refundAmount = purchase.price * purchase.quantity;
    Alert.alert(
      t("confirmCancelTitle"),
      t("confirmCancelMessage", { amount: `¥${refundAmount}` }),
      [
        {
          text: t("cancel"),
          style: "cancel",
        },
        {
          text: t("confirm"),
          style: "destructive",
          onPress: async () => {
            try {
              await cancelPurchase(
                purchase.order_number,
                currentUser.id,
                language === "en" ||
                  (language === "auto" && getSystemLanguage() === "en")
                  ? "en"
                  : "zh"
              );
              const updatedPurchase = await getPurchaseByOrderNumber(
                purchase.order_number
              );
              setPurchase(updatedPurchase);
              Alert.alert(t("success"), t("orderCanceled"));
            } catch (error) {
              Alert.alert(t("error"), `${t("errorCancelOrder")}: ${error}`);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (isLoading || !purchase) {
    return (
      <YStack flex={1} jc="center" ai="center" bg={theme.background.val}>
        <Text fontSize="$5" color={theme.text.val}>
          {t("loading")}
        </Text>
      </YStack>
    );
  }

  const firstImage = purchase.images?.split(",")[0];
  const isCanceled = purchase.quantity === 0;
  const isFulfilled = !!purchase.fulfilledAt && purchase.quantity !== 0;
  const isAdmin = currentUser?.role_id === 1;
  const isOwner = currentUser?.id === purchase.owner;
  const canFulfill = isAdmin && !isCanceled && !isFulfilled;
  const canCancel = (isAdmin || isOwner) && !isCanceled && !isFulfilled;

  return (
    <YStack flex={1} bg={theme.background.val}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Image */}
        <YStack ai="center" mb="$4">
          {firstImage ? (
            <Image
              source={{ uri: `${FileSystem.documentDirectory}${firstImage}` }}
              style={{
                width: 300,
                height: 300,
                borderRadius: 10,
              }}
              resizeMode="contain"
            />
          ) : (
            <MaterialIcons name="image" size={300} color={theme.icon.val} />
          )}
        </YStack>

        {/* Order Details */}
        <YStack gap="$5">
          <Text fontSize="$5" fontWeight="bold" color={theme.text.val}>
            {purchase.productName || t("unknownProduct")}
          </Text>
          <XStack jc="space-between">
            <Text fontSize="$4" color={theme.text.val}>
              {t("orderNumber")}: {purchase.order_number}
            </Text>
            <Text fontSize="$4" color={theme.text.val}>
              {t("status")}:{" "}
              {isCanceled
                ? t("canceled")
                : isFulfilled
                ? t("fulfilled")
                : t("unfulfilled")}
            </Text>
            {isFulfilled ? (
              <MaterialIcons
                name="check-circle"
                size={20}
                color={theme.verified.val}
              />
            ) : isCanceled ? (
              <MaterialIcons name="cancel" size={20} color={theme.faded.val} />
            ) : (
              <MaterialIcons name="pending" size={20} color={theme.gray.val} />
            )}
          </XStack>
          <Text fontSize="$4" color={theme.text.val}>
            {t("price")}: ¥{purchase.price.toFixed(2)}
          </Text>
          <Text fontSize="$4" color={theme.text.val}>
            {t("quantity")}: {purchase.quantity}
          </Text>
          <Text fontSize="$4" color={theme.text.val}>
            {t("total")}: ¥{(purchase.price * purchase.quantity).toFixed(2)}
          </Text>
          <Text fontSize="$4" color={theme.text.val}>
            {t("createdAt")}: {new Date(purchase.createdAt).toLocaleString()}
          </Text>
          <XStack ai="center" gap="$2">
            <Text fontSize="$4" color={theme.text.val}>
              {t("owner")}:
            </Text>
            {purchase.ownerIcon ? (
              <Image
                source={{
                  uri: `${FileSystem.documentDirectory}${purchase.ownerIcon}`,
                }}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                }}
                resizeMode="cover"
              />
            ) : (
              <MaterialIcons name="person" size={20} color={theme.icon.val} />
            )}
            <Text fontSize="$4" color={theme.text.val}>
              {purchase.ownerName || t("unknownUser")}
            </Text>
          </XStack>
          {purchase.fulfilledAt && (
            <Text fontSize="$4" color={theme.text.val}>
              {isFulfilled ? t("fulfilledAt") : t("canceledAt")}:{" "}
              {new Date(purchase.fulfilledAt!).toLocaleString()}
            </Text>
          )}
          {purchase.fulfilledAt && (
            <XStack ai="center" gap="$2">
              <Text fontSize="$4" color={theme.text.val}>
                {isFulfilled ? t("fulfilledBy") : t("canceledBy")}:
              </Text>
              {purchase.fulfilledByIcon ? (
                <Image
                  source={{
                    uri: `${FileSystem.documentDirectory}${purchase.fulfilledByIcon}`,
                  }}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                  }}
                  resizeMode="cover"
                />
              ) : (
                <MaterialIcons name="person" size={20} color={theme.icon.val} />
              )}
              <Text fontSize="$4" color={theme.text.val}>
                {purchase.fulfilledByName}
              </Text>
            </XStack>
          )}
          {purchase.description && (
            <YStack mt="$2">
              <Text fontSize="$4" fontWeight="600" color={theme.text.val}>
                {t("description")}
              </Text>
              <Text fontSize="$4" color={theme.text.val}>
                {purchase.description}
              </Text>
            </YStack>
          )}
        </YStack>
      </ScrollView>

      {/* Action Buttons */}
      <XStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        bg={theme.background.val}
        py="$3"
        px="$1"
        jc="space-between"
        borderTopWidth={1}
        borderTopColor={theme.border.val}
      >
        <TouchableOpacity
          onPress={handleFulfill}
          disabled={!canFulfill}
          style={{
            backgroundColor: canFulfill
              ? theme.primary.val
              : theme.disabled.val,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            marginRight: 8,
            display: isAdmin ? "flex" : "none",
          }}
        >
          <Text fontSize="$4" color="$background">
            {t("fulfill")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleCancel}
          disabled={isFulfilled || isCanceled}
          style={{
            backgroundColor: canCancel ? theme.primary.val : theme.disabled.val,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            marginLeft: 8,
            display: isAdmin || isOwner ? "flex" : "none",
          }}
        >
          <Text fontSize="$4" color="$background">
            {t("cancel")}
          </Text>
        </TouchableOpacity>
      </XStack>
    </YStack>
  );
};

export default OrderDetailsScreen;
