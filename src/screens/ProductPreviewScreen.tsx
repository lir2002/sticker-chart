import React, { useState, useEffect, useContext } from "react";
import {
  ScrollView,
  SafeAreaView,
  Dimensions,
  Image,
  Alert,
  TouchableOpacity,
} from "react-native";
import * as FileSystem from "expo-file-system";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { RootStackParamList } from "../types";
import { useLanguage } from "../contexts/LanguageContext";
import { YStack, XStack, Text, useTheme } from "tamagui";
import { StyledInput } from "../components/SharedComponents";
import { UserContext } from "../contexts/UserContext";
import { processPurchase } from "../db";
import VerifyCodeModal from "../components/VerifyCodeModal";

type ProductPreviewScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "ProductPreview"
>;

const { width: screenWidth } = Dimensions.get("window");

const ProductPreviewScreen: React.FC<ProductPreviewScreenProps> = ({
  route,
  navigation,
}) => {
  const { t } = useLanguage();
  const theme = useTheme();
  const {
    productId,
    productName,
    description,
    price,
    images,
    quantity,
    online,
  } = route.params;
  const { currentUser } = useContext(UserContext);

  const [purchaseQuantity, setPurchaseQuantity] = useState("1");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [pendingPurchase, setPendingPurchase] = useState<{
    quantity: number;
    total: number;
  } | null>(null);

  // Set navigation title to "Product Details"
  useEffect(() => {
    navigation.setOptions({
      title: online ? t("productDetails") : t("previewProduct"),
    });
  }, [navigation, t]);

  // Adjust purchase quantity with increment/decrement
  const adjustPurchaseQuantity = (increment: boolean) => {
    const currentQuantity = parseInt(purchaseQuantity) || 1;
    const maxQuantity = quantity || 0; // Handle case where quantity is 0
    let newQuantity: number;
    if (increment) {
      newQuantity = Math.min(currentQuantity + 1, maxQuantity);
    } else {
      newQuantity = Math.max(currentQuantity - 1, 0); // Minimum 1
    }
    setPurchaseQuantity(newQuantity.toString());
  };

  // Validate and handle purchase quantity input
  const handlePurchaseQuantityChange = (text: string) => {
    if (/^\d*$/.test(text)) {
      const num = parseInt(text) || 0;
      const maxQuantity = quantity || 0;
      if (text === "" || (num >= 0 && num <= maxQuantity)) {
        setPurchaseQuantity(text);
      } else if (num > maxQuantity) {
        setPurchaseQuantity(maxQuantity.toString());
        Alert.alert(t("error"), t("quantityExceedsAvailable"));
      }
    }
  };

  // Handle purchase initiation
  const handlePurchase = () => {
    if (!currentUser) {
      Alert.alert(t("error"), t("notLoggedIn"));
      return;
    }

    const qty = parseInt(purchaseQuantity) || 1;
    const totalCost = price * qty;

    // Step 1: Confirm purchase
    Alert.alert(
      t("confirmPurchase"),
      t("confirmPurchaseMessage", {
        quantity: qty,
        total: totalCost.toFixed(2),
        productName,
      }),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("confirm"),
          onPress: () => {
            setPendingPurchase({ quantity: qty, total: totalCost });
            setShowCodeModal(true); // Show VerifyCodeModal
          },
        },
      ]
    );
  };

  // Step 2: Handle code verification and purchase
  const handleVerifyPurchase = async () => {
    if (!pendingPurchase) {
      return; // Safety check
    }

    const { quantity: qty } = pendingPurchase;

    if (!productId) {
      Alert.alert(t("error"), t("invalidProduct"));
      setShowCodeModal(false);
      setPendingPurchase(null);
      return;
    }

    setIsProcessing(true);

    try {
      const newQuantity = await processPurchase(
        currentUser!.id,
        productId,
        qty,
        price,
        productName,
        description || null,
        images
      );

      // Update local quantity
      navigation.setParams({ quantity: newQuantity });

      Alert.alert(t("success"), t("purchaseSuccessful", { productName }), [
        { text: t("confirm"), onPress: navigation.goBack },
      ]);
      setShowCodeModal(false);
      setPendingPurchase(null);
    } catch (error: any) {
      let errorMessage = t("purchaseFailed");
      if (error.message.includes("Product not found")) {
        errorMessage = t("productNotFound");
      } else if (error.message.includes("Cannot purchase own product")) {
        errorMessage = t("cannotPurchaseOwnProduct");
      } else if (error.message.includes("Insufficient credit")) {
        errorMessage = t("insufficientCredit");
      } else if (error.message.includes("Creator wallet not found")) {
        errorMessage = t("creatorWalletNotFound");
      } else if (error.message.includes("Insufficient product quantity")) {
        errorMessage = t("quantityExceedsAvailable");
      }
      console.log("error debug:", error);
      Alert.alert(t("error"), errorMessage);
      setShowCodeModal(false);
      setPendingPurchase(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle cancel verification
  const handleCancelVerification = () => {
    setShowCodeModal(false);
    setPendingPurchase(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        <YStack gap="$5">
          {/* Price */}
          <Text
            fontSize="$5"
            fontWeight="bold"
            color={theme.success?.val || "#28a745"} // Green color, fallback to hardcoded
          >
            ${price.toFixed(2)}
          </Text>
          {/* Title */}
          <Text fontSize="$5" fontWeight="bold" color={theme.text.val}>
            {productName}
          </Text>
          {/* Description */}
          <Text fontSize="$4" color={theme.text.val}>
            {description || t("noDescription")}
          </Text>
          {/* Images */}
          {images.length > 0 ? (
            images.map((image, index) => (
              <Image
                key={index}
                source={{ uri: `${FileSystem.documentDirectory}${image}` }}
                style={{
                  width: screenWidth - 32, // Full width minus padding (16 left + 16 right)
                  height: screenWidth - 32, // Square aspect ratio
                  borderRadius: 10,
                  marginVertical: 8,
                }}
                resizeMode="cover"
              />
            ))
          ) : (
            <YStack jc="center" ai="center" height={200}>
              <MaterialIcons name="image" size={100} color={theme.icon.val} />
              <Text fontSize="$4" color={theme.text.val}>
                {t("noImages")}
              </Text>
            </YStack>
          )}
          <XStack>
            <Text>
              {t("productNumber")}: {productId}
            </Text>
          </XStack>
        </YStack>
      </ScrollView>
      {/* Status Bar with Quantity Input, Total Quantity, and Buy Button */}
      <XStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        bg={theme.background.val}
        py="$3"
        px="$1"
        // gap="$1"
        jc="space-between"
        borderTopWidth={1}
        borderTopColor={theme.border.val}
      >
        {/* Quantity Input with Increment/Decrement */}
        <XStack ai="center" gap="$1" jc="center">
          <Text fontSize="$4" color={theme.text.val} width={70}>
            {t("quantity")}:
          </Text>
          <TouchableOpacity
            onPress={() => adjustPurchaseQuantity(false)}
            disabled={quantity === 0}
            style={{
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor:
                quantity === 0 ? theme.disabled.val : theme.lightGray.val,
              borderRadius: 20,
            }}
          >
            <MaterialIcons name="remove" size={24} color={theme.icon.val} />
          </TouchableOpacity>
          <StyledInput
            value={purchaseQuantity}
            my={0}
            height={40}
            maxWidth={40}
            p={0}
            onChangeText={handlePurchaseQuantityChange}
            keyboardType="numeric"
            maxLength={3}
            style={{ width: 60, textAlign: "center" }}
            placeholder="1"
            disabled={quantity === 0}
          />
          <TouchableOpacity
            onPress={() => adjustPurchaseQuantity(true)}
            disabled={quantity === 0}
            style={{
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor:
                quantity === 0 ? theme.disabled.val : theme.lightGray.val,
              borderRadius: 20,
            }}
          >
            <MaterialIcons name="add" size={24} color={theme.icon.val} />
          </TouchableOpacity>
          {/* Total Quantity */}
          <Text fontSize="$4" color={theme.text.val}>
            {quantity}
          </Text>
        </XStack>
        {/* Buy Button */}
        <TouchableOpacity
          onPress={handlePurchase}
          disabled={
            parseInt(purchaseQuantity) === 0 ||
            !currentUser ||
            currentUser.id === 2 || // Guest user
            isProcessing ||
            online === 0
          }
          style={{
            backgroundColor:
              parseInt(purchaseQuantity) === 0 ||
              !currentUser ||
              currentUser.id === 2 ||
              isProcessing ||
              online === 0
                ? theme.disabled.val
                : theme.primary.val,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text fontSize="$4" color="$background">
            {t("buy")}
          </Text>
        </TouchableOpacity>
      </XStack>
      {/* Verify Code Modal */}
      <VerifyCodeModal
        visible={showCodeModal}
        title={t("verifyCode")}
        userId={currentUser?.id || null}
        onVerify={handleVerifyPurchase}
        onCancel={handleCancelVerification}
      />
    </SafeAreaView>
  );
};

export default ProductPreviewScreen;
