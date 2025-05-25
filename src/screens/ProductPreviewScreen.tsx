import React from "react";
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
  const { productName, description, price, images, quantity, online } = route.params;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
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
      {/* Status Bar with Buy Button */}
      <XStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        bg={theme.background.val}
        p="$4"
        jc="flex-end"
        borderTopWidth={1}
        borderTopColor={theme.border.val}
      >
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
