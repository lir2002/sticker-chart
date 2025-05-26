import React, { useState } from "react";
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
import { StyledInput } from "../components/SharedComponents"; // Import StyledInput

type ProductPreviewScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "ProductPreview"
>;

const { width: screenWidth } = Dimensions.get("window");

const ProductPreviewScreen: React.FC<ProductPreviewScreenProps> = ({
  route,
}) => {
  const { t } = useLanguage();
  const theme = useTheme();
  const { productName, description, price, images, quantity, online } =
    route.params;

  // State for purchase quantity
  const [purchaseQuantity, setPurchaseQuantity] = useState("1");

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
        <XStack ai="center" gap="$1" jc="center" >
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
          onPress={() => Alert.alert(t("info"), t("buyNotImplemented"))}
          style={{
            backgroundColor: theme.primary.val,
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
    </SafeAreaView>
  );
};

export default ProductPreviewScreen;
