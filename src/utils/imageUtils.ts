import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { Alert } from "react-native";
import {
  createProductImage,
  deleteProductImage,
  getProductImageById,
  updateProductImage,
} from "../db/database";
import { ProductImage } from "../types";

interface ImageResult {
  uri: string;
  relativePath: string;
}

/**
 * Requests camera permissions and captures an image using the camera.
 * @param maxPhotoSize Maximum allowed photo size in bytes (default: 1MB).
 * @returns The processed image result or null if canceled or error occurs.
 */
export async function captureImage(
  maxPhotoSize: number = 1_048_576
): Promise<ImageResult | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Camera Permission Denied", "相机权限被拒");
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: "images",
    allowsEditing: true,
    quality: 1,
  });

  if (result.canceled || !result.assets[0].uri) {
    return null;
  }

  return await processImage(result.assets[0].uri, "photos", maxPhotoSize);
}

/**
 * Requests media library permissions and selects an image from the gallery.
 * @param maxPhotoSize Maximum allowed photo size in bytes (default: 1MB).
 * @returns The processed image result or null if canceled or error occurs.
 */
export async function pickImage(
  maxPhotoSize: number = 1_048_576
): Promise<ImageResult | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Gallery Permission Denied", "相册权限被拒");
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: "images",
    allowsEditing: true,
    quality: 1,
  });

  if (result.canceled || !result.assets[0].uri) {
    return null;
  }

  return await processImage(result.assets[0].uri, "photos", maxPhotoSize);
}

/**
 * Processes an image by compressing and resizing it if necessary, then saves it to a specified directory.
 * @param uri The original image URI.
 * @param directory The directory to save the image (relative to FileSystem.documentDirectory).
 * @param maxPhotoSize Maximum allowed photo size in bytes.
 * @returns The processed image result with URI and relative path.
 */
export async function processImage(
  uri: string,
  directory: string,
  maxPhotoSize: number
): Promise<ImageResult> {
  try {
    let finalUri = uri;
    let quality = 0.7;
    let fileInfo = await FileSystem.getInfoAsync(uri, { size: true });

    // First attempt: resize to 1024px if size exceeds maxPhotoSize
    if (fileInfo.exists && fileInfo.size > maxPhotoSize) {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
      );
      finalUri = manipulatedImage.uri;
      fileInfo = await FileSystem.getInfoAsync(finalUri, { size: true });
    }

    // Iteratively compress until below maxPhotoSize or quality too low
    while (fileInfo.exists && fileInfo.size > maxPhotoSize && quality > 0.1) {
      quality -= 0.1;
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        finalUri,
        [],
        { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
      );
      finalUri = manipulatedImage.uri;
      fileInfo = await FileSystem.getInfoAsync(finalUri, { size: true });
    }

    // Final check: ensure size is below maxPhotoSize
    if (fileInfo.exists && fileInfo.size > maxPhotoSize) {
      throw new Error(
        `Image size (${fileInfo.size} bytes) exceeds maximum limit (${maxPhotoSize} bytes) after compression`
      );
    }

    const photoDir = `${FileSystem.documentDirectory}${directory}/`;
    const fileName = `${Date.now()}.jpg`;
    const relativePath = `${directory}/${fileName}`;
    const permanentPath = `${photoDir}${fileName}`;

    await FileSystem.makeDirectoryAsync(photoDir, { intermediates: true });
    await FileSystem.moveAsync({ from: finalUri, to: permanentPath });

    return { uri: permanentPath, relativePath };
  } catch (error) {
    console.error("Error processing image:", error);
    throw new Error(
      `Failed to process image: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Processes a user icon image, optionally deleting the old icon.
 * @param uri The original image URI.
 * @param userId The user ID for naming the icon file.
 * @param oldIconPath The path to the old icon to delete (optional).
 * @param maxPhotoSize Maximum allowed photo size in bytes (default: 512KB).
 * @returns The relative path of the processed icon.
 */
export async function processUserIcon(
  uri: string,
  userId: number,
  oldIconPath?: string
): Promise<string> {
  try {
    const iconDir = `${FileSystem.documentDirectory}icons/`;
    const fileName = `user_${userId}_${Date.now()}.jpg`;
    const relativePath = `icons/${fileName}`;
    const permanentPath = `${iconDir}${fileName}`;

    await FileSystem.makeDirectoryAsync(iconDir, { intermediates: true });
    if (oldIconPath) {
      const oldIconFullPath = `${FileSystem.documentDirectory}${oldIconPath}`;
      if ((await FileSystem.getInfoAsync(oldIconFullPath)).exists) {
        await FileSystem.deleteAsync(oldIconFullPath);
      }
    }
    await FileSystem.moveAsync({ from: uri, to: permanentPath });

    return relativePath;
  } catch (error) {
    Alert.alert("Failed to process image", "无法处理图像");
    return "";
  }
}

/**
 * Moves a compressed image to the products/ directory with a product-specific filename.
 * @param uri The compressed image URI (from pickImage or captureImage).
 * @returns The relative path of the saved image (e.g., "products/product_123456.jpg").
 * @throws Error if file operations fail.
 */
export async function processProductImage(uri: string): Promise<string> {
  try {
    const productDir = `${FileSystem.documentDirectory}products/`;
    const fileName = `product_${Date.now()}.jpg`;
    const relativePath = `products/${fileName}`;
    const permanentPath = `${productDir}${fileName}`;

    await FileSystem.makeDirectoryAsync(productDir, { intermediates: true });
    await FileSystem.moveAsync({ from: uri, to: permanentPath });

    return relativePath;
  } catch (error) {
    console.error("Error processing product image:", error);
    throw new Error(
      `Failed to process product image: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// Refer Images
export const getImageRefer = async (
  imagePath: string
): Promise<ProductImage | null> => {
  const imageId = generateImageId(imagePath);
  if (imageId) {
    const referImage = await getProductImageById(imageId);
    return referImage;
  }
  return null;
};

export const generateImageId = (imagePath: string): number | null => {
  const match = imagePath.match(/product_(\d+)\.jpg/);
  if (match && match[1]) {
    const imageId = parseInt(match[1], 10);
    return imageId || null;
  }
  return null;
};

export const removeImageFromRefer = async (
  imagePath: string
): Promise<void> => {
  const referImage = await getImageRefer(imagePath);
  if (!referImage || referImage.referred < 2) {
    // Delete removed images from filesystem
    const filePath = `${FileSystem.documentDirectory}${imagePath}`;
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (fileInfo.exists) {
      try {
        await FileSystem.deleteAsync(filePath, { idempotent: true });
        console.log(`Deleted image: ${filePath}`);
      } catch (fileError) {
        console.warn(`Failed to delete image ${filePath}:`, fileError);
      }
    } else {
      console.warn(`Unsaved image not found: ${filePath}`);
    }
    if (referImage) {
      deleteProductImage(referImage.id);
    }
  } else {
    await updateProductImage(referImage.id, referImage.referred - 1);
  }
};

export const addImageToRefer = async (imagePath: string): Promise<void> => {
  const referImage = await getImageRefer(imagePath);
  if (referImage) {
    updateProductImage(referImage.id, referImage.referred + 1);
  } else {
    const imageId = generateImageId(imagePath);
    if (imageId) {
      createProductImage(imageId);
    } else {
      console.warn(`Failed to add ${imagePath} to productImages`)
    }
  }
};
