import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";

export const resolvePhotoUri = (path: string | null): string | null => {
  if (!path) return null;
  if (path.startsWith("file://") || (FileSystem.documentDirectory && path.startsWith(FileSystem.documentDirectory))) {
    return path;
  }
  if (!FileSystem.documentDirectory) {
    console.warn("FileSystem.documentDirectory is null, cannot resolve relative path");
    return null;
  }
  return `${FileSystem.documentDirectory}${path}`;
};

export const processUserIcon = async (
  uri: string,
  userId: number,
  existingIcon?: string
): Promise<string> => {
  if (!FileSystem.documentDirectory) {
    throw new Error("Document directory not available");
  }

  // Define icon directory and relative path
  const iconDir = `${FileSystem.documentDirectory}icons/`;
  const fileName = `icon_${userId}.jpg`;
  const relativePath = `icons/${fileName}`;
  const newIconPath = `${iconDir}${fileName}`;

  // Create icons directory if it doesn't exist
  await FileSystem.makeDirectoryAsync(iconDir, { intermediates: true });

  // Compress image to ~200KB
  let quality = 0.7;
  let fileSize = Infinity;
  let compressedUri = uri;

  // Resize to 256x256 and compress
  const manipResult = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 256, height: 256 } }],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
  );
  compressedUri = manipResult.uri;

  // Check file size and reduce quality if needed
  let fileInfo = await FileSystem.getInfoAsync(compressedUri);
  fileSize = fileInfo.size || Infinity;

  while (fileSize > 200000 && quality > 0.1) {
    quality -= 0.1;
    const newManipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 256, height: 256 } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
    );
    compressedUri = newManipResult.uri;
    fileInfo = await FileSystem.getInfoAsync(compressedUri);
    fileSize = fileInfo.size || Infinity;
  }

  if (fileSize > 200000) {
    throw new Error("Could not compress image to 200KB or less");
  }

  // Delete old icon if it exists
  if (existingIcon) {
    const oldIconPath = resolvePhotoUri(existingIcon);
    if (oldIconPath) {
      const oldIconInfo = await FileSystem.getInfoAsync(oldIconPath);
      if (oldIconInfo.exists) {
        await FileSystem.deleteAsync(oldIconPath, { idempotent: true });
      }
    }
  }

  // Move compressed image to permanent location
  await FileSystem.moveAsync({
    from: compressedUri,
    to: newIconPath,
  });

  return relativePath;
};