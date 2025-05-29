import React, { useState, useEffect, useContext } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView,
  View,
} from "react-native";
import * as FileSystem from "expo-file-system";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import DraggableFlatList, {
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { FlatList } from "react-native-gesture-handler";
import PagerView from "react-native-pager-view";
import { createProduct, updateProduct, getProductById } from "../db/database";
import { UserContext } from "../contexts/UserContext";
import { useLanguage } from "../contexts/LanguageContext";
import { YStack, XStack, Text, useTheme, Button } from "tamagui";
import { StyledInput } from "../components/SharedComponents";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../types";
import {
  captureImage,
  pickImage,
  processProductImage,
} from "../utils/imageUtils";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const ITEM_WIDTH = 100; // Image width
const MARGIN = 8; // Margin between items
const ITEMS_PER_ROW = Math.floor(
  (screenWidth - 2 * 16) / (ITEM_WIDTH + MARGIN)
);

type ImageItem = { type: "image"; path: string } | { type: "add" };

type EditItemScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "EditItem"
>;

const EditItemScreen: React.FC<EditItemScreenProps> = ({
  navigation,
  route,
}) => {
  const { t } = useLanguage();
  const theme = useTheme();
  const { currentUser } = useContext(UserContext);
  const productId = route.params?.productId;
  const insets = useSafeAreaInsets();

  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("1");
  const [quantity, setQuantity] = useState("0");
  const [images, setImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [initialName, setInitialName] = useState("");
  const [initialDescription, setInitialDescription] = useState("");
  const [initialPrice, setInitialPrice] = useState("1");
  const [initialQuantity, setInitialQuantity] = useState("0");
  const [initialImages, setInitialImages] = useState<string[]>([]);
  const [isPublished, setIsPublished] = useState(false);

  const getData = () =>
    [
      ...images.map((path) => ({ type: "image" as const, path })),
      ...(images.length < 4 ? [{ type: "add" as const }] : []),
    ] as ImageItem[];

  // Detect unsaved changes
  const hasUnsavedChanges = () => {
    return (
      productName !== initialName ||
      description !== initialDescription ||
      price !== initialPrice ||
      quantity !== initialQuantity ||
      JSON.stringify(images) !== JSON.stringify(initialImages)
    );
  };

  useEffect(() => {
    const fetchProduct = async () => {
      if (productId) {
        try {
          setIsLoading(true);
          const product = await getProductById(productId);
          if (product) {
            setProductName(product.name);
            setDescription(product.description || "");
            setPrice(product.price.toString());
            setQuantity(product.quantity.toString());
            const loadedImages = product.images
              ? product.images.split(",")
              : [];
            setImages(loadedImages);
            setInitialName(product.name);
            setInitialDescription(product.description || "");
            setInitialPrice(product.price.toString());
            setInitialQuantity(product.quantity.toString());
            setInitialImages(loadedImages);
            setIsPublished(product.online === 1); // Set published status
          }
        } catch (error) {
          Alert.alert(t("error"), `${t("errorFetchProduct")}: ${error}`);
        } finally {
          setIsLoading(false);
        }
      } else {
        setInitialName("");
        setInitialDescription("");
        setInitialPrice("1");
        setInitialQuantity("0");
        setInitialImages([]);
        setIsPublished(false); // New product is not published
      }
    };
    fetchProduct();
  }, [productId, t]);

  // Cleanup unsaved images
  const cleanupUnsavedImages = async () => {
    try {
      // Delete images not in initialImages
      const imagesToDelete = images.filter(
        (img) => !initialImages.includes(img)
      );
      for (const image of imagesToDelete) {
        const filePath = `${FileSystem.documentDirectory}${image}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(filePath);
          console.log(`Cleaned up unsaved image: ${filePath}`);
        } else {
          console.warn(`Unsaved image not found: ${filePath}`);
        }
      }
      // Reset state
      setImages(initialImages);
      setProductName(initialName);
      setDescription(initialDescription);
      setPrice(initialPrice);
      setQuantity(initialQuantity);
      setCurrentImageIndex(null);
    } catch (error) {
      console.error("Error cleaning up unsaved images:", error);
      Alert.alert(t("error"), t("errorCleanupImages"));
    }
  };

  // Handle save or publish
  const handleSaveOrPublish = async (online: boolean) => {
    if (!currentUser) {
      Alert.alert(t("error"), t("notLoggedIn"));
      return;
    }
    if (!validateInputs()) return;
    if (online && parseInt(quantity) === 0) {
      Alert.alert(t("error"), t("errorZeroQuantityForPublish"));
      return;
    }

    setIsLoading(true);
    try {
      const priceNum = parseInt(price);
      const quantityNum = parseInt(quantity);
      const imagesString = images.join(",");

      if (productId) {
        await updateProduct(
          productId,
          productName,
          description,
          imagesString || undefined,
          priceNum,
          online,
          quantityNum
        );
        Alert.alert(
          t("success"),
          `${t("successUpdateProduct")}: ${productName}`
        );
      } else {
        await createProduct(
          productName,
          priceNum,
          currentUser.id,
          description,
          imagesString || undefined,
          online,
          quantityNum
        );
        Alert.alert(t("success"), t("successCreateProduct"));
      }

      setInitialName(productName);
      setInitialDescription(description || "");
      setInitialPrice(price.toString());
      setInitialQuantity(quantity.toString());
      setInitialImages(images);
      setIsPublished(online); // Update published status
      online && navigation.goBack();
    } catch (error) {
      Alert.alert(t("error"), `${t("errorSaveProduct")}: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (!hasUnsavedChanges() || isLoading) {
        console.log("No unsaved changes or loading, allowing navigation");
        return;
      }
      console.log("Preventing navigation due to unsaved changes");
      e.preventDefault();
      Alert.alert(
        t("unsavedChanges"),
        t("saveBeforeExit"),
        [
          {
            text: t("save"),
            onPress: async () => {
              console.log("Save option selected");
              await handleSaveOrPublish(false);
              navigation.dispatch(e.data.action);
            },
          },
          {
            text: t("discard"),
            onPress: async () => {
              console.log("Discard option selected");
              await cleanupUnsavedImages();
              navigation.dispatch(e.data.action);
            },
          },
          {
            text: t("cancel"),
            style: "cancel",
            onPress: () => {
              console.log("Cancel option selected");
            },
          },
        ],
        { cancelable: false }
      );
    });

    return unsubscribe;
  }, [
    navigation,
    hasUnsavedChanges,
    isLoading,
    t,
    handleSaveOrPublish,
    cleanupUnsavedImages,
  ]);

  // Add image (replaces pickImage)
  const addImage = async () => {
    if (images.length >= 4) {
      Alert.alert(t("error"), t("maxImagesReached"));
      return;
    }

    Alert.alert(
      t("addImage"),
      t("selectImageSource"),
      [
        {
          text: t("takePhoto"),
          onPress: async () => {
            try {
              const result = await captureImage(1_048_576); // 1MB
              if (result) {
                const relativePath = await processProductImage(result.uri);
                setImages([...images, relativePath]);
              }
            } catch (error) {
              console.error("Error capturing product image:", error);
              const message =
                error instanceof Error ? error.message : String(error);
              if (message.includes("Camera permission denied")) {
                Alert.alert(t("error"), t("cameraPermission"));
              } else {
                Alert.alert(
                  t("error"),
                  `${t("errorProcessImage")}: ${message}`
                );
              }
            }
          },
        },
        {
          text: t("chooseFromGallery"),
          onPress: async () => {
            try {
              const result = await pickImage(1_048_576); // 1MB
              if (result) {
                const relativePath = await processProductImage(result.uri);
                setImages([...images, relativePath]);
              }
            } catch (error) {
              console.error("Error picking product image:", error);
              const message =
                error instanceof Error ? error.message : String(error);
              if (message.includes("Gallery permission denied")) {
                Alert.alert(t("error"), t("selectImagePermission"));
              } else {
                Alert.alert(
                  t("error"),
                  `${t("errorProcessImage")}: ${message}`
                );
              }
            }
          },
        },
        { text: t("cancel"), style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  const removeImage = async (image: string) => {
    try {
      const filePath = `${FileSystem.documentDirectory}${image}`;
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filePath);
        console.log(`Deleted image file: ${filePath}`);
      } else {
        console.warn(`Image file not found: ${filePath}`);
      }

      const index = images.indexOf(image);
      setImages(images.filter((img) => img !== image));
      if (
        currentImageIndex !== null &&
        index <= currentImageIndex &&
        images.length > 1
      ) {
        setCurrentImageIndex(Math.max(0, currentImageIndex - 1));
      }
    } catch (error) {
      console.error(`Error deleting image ${image}:`, error);
      Alert.alert(t("error"), t("errorDeleteImage"));
      setImages(images.filter((img) => img !== image));
      if (
        currentImageIndex !== null &&
        index <= currentImageIndex &&
        images.length > 1
      ) {
        setCurrentImageIndex(Math.max(0, currentImageIndex - 1));
      }
    }
  };

  const validateInputs = () => {
    if (!productName.trim()) {
      Alert.alert(t("error"), t("errorEmptyName"));
      return false;
    }
    if (productName.length > 20) {
      Alert.alert(t("error"), t("errorNameTooLong"));
      return false;
    }
    if (description.length > 200) {
      Alert.alert(t("error"), t("errorDescriptionTooLong"));
      return false;
    }
    const priceNum = parseInt(price);
    if (isNaN(priceNum) || priceNum < 1 || priceNum > 100) {
      Alert.alert(t("error"), t("errorInvalidPrice"));
      return false;
    }
    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum < 0) {
      Alert.alert(t("error"), t("errorInvalidQuantity"));
      return false;
    }
    return true;
  };

  const adjustPrice = (increment: boolean) => {
    const currentPrice = parseInt(price) || 1;
    const newPrice = increment
      ? Math.min(currentPrice + 1, 100)
      : Math.max(currentPrice - 1, 1);
    setPrice(newPrice.toString());
  };

  const adjustQuantity = (increment: boolean) => {
    const currentQuantity = parseInt(quantity) || 0;
    const newQuantity = increment
      ? currentQuantity + 1
      : Math.max(currentQuantity - 1, 0);
    setQuantity(newQuantity.toString());
  };

  useEffect(() => {
    navigation.setOptions({
      title: productId ? t("updateItem") : t("createItem"),
    });
  }, [navigation, productId, t]);

  const renderImageItem = ({
    item,
    drag,
    isActive,
  }: {
    item: ImageItem;
    drag: () => void;
    isActive: boolean;
  }) => {
    if (item.type === "add") {
      return (
        <TouchableOpacity
          onPress={addImage}
          style={{
            width: ITEM_WIDTH,
            height: ITEM_WIDTH,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.border.val,
            alignItems: "center",
            justifyContent: "center",
            margin: MARGIN / 2,
          }}
        >
          <MaterialIcons name="add" size={30} color={theme.icon.val} />
          <Text fontSize="$3" color="$gray" textAlign="center">
            {t("addImage")}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <ScaleDecorator>
        <TouchableOpacity
          onPress={() => {
            const index = images.indexOf(item.path);
            setCurrentImageIndex(index);
          }}
          onLongPress={drag}
          disabled={isActive}
          style={{
            width: ITEM_WIDTH,
            height: ITEM_WIDTH,
            margin: MARGIN / 2,
            opacity: isActive ? 0.7 : 1,
          }}
        >
          <YStack width={ITEM_WIDTH} height={ITEM_WIDTH} position="relative">
            <Image
              source={{ uri: `${FileSystem.documentDirectory}${item.path}` }}
              style={{
                width: ITEM_WIDTH,
                height: ITEM_WIDTH,
                borderRadius: 10,
              }}
            />
            <TouchableOpacity
              onPress={() => removeImage(item.path)}
              style={{
                position: "absolute",
                top: 5,
                right: 5,
                backgroundColor: "rgba(0,0,0,0.5)",
                borderRadius: 12,
              }}
            >
              <MaterialIcons name="close" size={20} color="$white" />
            </TouchableOpacity>
          </YStack>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  const renderForm = () => (
    <YStack p="$4" gap="$4">
      <DraggableFlatList
        data={getData()}
        onDragEnd={({ data }) => {
          const newImages = data
            .filter((item) => item.type === "image")
            .map((item) => (item as { type: "image"; path: string }).path);
          setImages(newImages);
          if (currentImageIndex !== null) {
            setCurrentImageIndex((prev) =>
              Math.min(prev, newImages.length - 1)
            );
          }
        }}
        keyExtractor={(item, index) =>
          item.type === "add" ? "add" : `image-${index}`
        }
        renderItem={renderImageItem}
        numColumns={ITEMS_PER_ROW}
        contentContainerStyle={{
          paddingHorizontal: 8,
          flexDirection: "row",
          flexWrap: "wrap",
        }}
      />
      <StyledInput
        placeholder={t("productNamePlaceholder")}
        value={productName}
        onChangeText={setProductName}
        maxLength={20}
        autoCapitalize="none"
      />
      <StyledInput
        placeholder={t("productDescriptionPlaceholder")}
        value={description}
        onChangeText={setDescription}
        maxLength={200}
        multiline
        numberOfLines={4}
        style={{ height: 100, textAlignVertical: "top" }}
      />
      <XStack ai="center" gap="$2">
        <Text fontSize="$4" color={theme.text.val} width={80}>
          {t("price")}:
        </Text>
        <TouchableOpacity
          onPress={() => adjustPrice(false)}
          style={{
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.lightGray.val,
            borderRadius: 20,
          }}
        >
          <MaterialIcons name="remove" size={24} color={theme.icon.val} />
        </TouchableOpacity>
        <StyledInput
          value={price}
          onChangeText={(text) => {
            if (/^\d*$/.test(text)) setPrice(text);
          }}
          keyboardType="numeric"
          maxLength={3}
          style={{ flex: 1, textAlign: "center" }}
        />
        <TouchableOpacity
          onPress={() => adjustPrice(true)}
          style={{
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.lightGray.val,
            borderRadius: 20,
          }}
        >
          <MaterialIcons name="add" size={24} color={theme.icon.val} />
        </TouchableOpacity>
      </XStack>
      <XStack ai="center" gap="$2">
        <Text fontSize="$4" color={theme.text.val} width={80}>
          {t("quantity")}:
        </Text>
        <TouchableOpacity
          onPress={() => adjustQuantity(false)}
          style={{
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.lightGray.val,
            borderRadius: 20,
          }}
        >
          <MaterialIcons name="remove" size={24} color={theme.icon.val} />
        </TouchableOpacity>
        <StyledInput
          value={quantity}
          onChangeText={(text) => {
            if (/^\d*$/.test(text)) setQuantity(text);
          }}
          keyboardType="numeric"
          maxLength={3}
          style={{ flex: 1, textAlign: "center" }}
        />
        <TouchableOpacity
          onPress={() => adjustQuantity(true)}
          style={{
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.lightGray.val,
            borderRadius: 20,
          }}
        >
          <MaterialIcons name="add" size={24} color={theme.icon.val} />
        </TouchableOpacity>
      </XStack>
    </YStack>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <FlatList
          data={[1]}
          renderItem={() => renderForm()}
          keyExtractor={() => "form"}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: insets.bottom + 60,
          }}
        />
      </KeyboardAvoidingView>

      <XStack
        position="absolute"
        bottom={insets.bottom}
        left={0}
        right={0}
        zIndex={1000}
        backgroundColor={theme.background.val}
        padding="$3"
        gap="$2"
        justifyContent="flex-end"
        borderTopWidth={1}
        borderTopColor={theme.border.val}
      >
        <Button
          size="$3"
          height={40}
          onPress={() => {
            if (!validateInputs()) return;
            navigation.navigate("ProductPreview", {
              productName,
              description,
              price: parseInt(price),
              quantity: parseInt(quantity),
              images,
              online: 0,
            });
          }}
          disabled={isLoading}
          backgroundColor={isLoading ? theme.disabled.val : theme.primary.val}
          color="$background"
        >
          {t("preview")}
        </Button>
        <Button
          size="$3"
          height={40}
          paddingVertical="$2"
          onPress={() => handleSaveOrPublish(false)}
          disabled={isLoading || !hasUnsavedChanges()}
          backgroundColor={
            isLoading || !hasUnsavedChanges()
              ? theme.disabled.val
              : theme.primary.val
          }
          color="$background"
        >
          {t("save")}
        </Button>
        <Button
          size="$3"
          height={40}
          paddingVertical="$2"
          onPress={() => handleSaveOrPublish(true)}
          disabled={
            isLoading || ((isPublished || !productId) && !hasUnsavedChanges())
          }
          backgroundColor={
            isLoading || ((isPublished || !productId) && !hasUnsavedChanges())
              ? theme.disabled.val
              : theme.primary.val
          }
          color="$background"
        >
          {t("publish")}
        </Button>
      </XStack>

      <Modal
        visible={currentImageIndex !== null && images.length > 0}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setCurrentImageIndex(null)}
        style={{ flex: 1, margin: 0 }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "black",
            position: "absolute",
            top: 0,
            left: 0,
            width: screenWidth,
            height: screenHeight,
            pointerEvents: "box-none",
          }}
        >
          <TouchableOpacity
            onPress={() => {
              setCurrentImageIndex(null);
            }}
            style={{
              position: "absolute",
              top: insets.top + 20,
              right: insets.right + 20,
              zIndex: 1000,
              padding: 15,
              backgroundColor: "rgba(0,0,0,0.5)",
              borderRadius: 20,
            }}
            accessibilityLabel={t("closeImage")}
          >
            <MaterialIcons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          {images.length === 0 ? (
            <Text
              style={{
                color: "#fff",
                textAlign: "center",
                marginTop: screenHeight / 2,
              }}
            >
              {t("noImages")}
            </Text>
          ) : (
            <PagerView
              style={{ flex: 1, zIndex: 1 }}
              initialPage={currentImageIndex ?? 0}
              onPageSelected={(e) => {
                const index = e.nativeEvent.position;
                setCurrentImageIndex(index);
              }}
              scrollEnabled={images.length > 1}
            >
              {images.map((item, index) => (
                <View
                  key={index}
                  style={{
                    width: screenWidth,
                    height: screenHeight,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Image
                    source={{ uri: `${FileSystem.documentDirectory}${item}` }}
                    style={{
                      width: screenWidth,
                      height: screenHeight,
                      resizeMode: "contain",
                    }}
                    onError={(e) =>
                      console.error(
                        "PagerView image load error:",
                        e.nativeEvent.error,
                        "Path:",
                        item
                      )
                    }
                    accessibilityLabel={t("fullScreenProductImage", {
                      index: index + 1,
                    })}
                  />
                </View>
              ))}
            </PagerView>
          )}
          {images.length > 1 && (
            <View
              style={{
                position: "absolute",
                bottom: insets.bottom + 20,
                left: 0,
                right: 0,
                alignItems: "center",
                zIndex: 10,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 16 }}>
                {currentImageIndex !== null ? currentImageIndex + 1 : 1} /{" "}
                {images.length}
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default EditItemScreen;
