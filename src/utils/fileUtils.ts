import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";

export const resolvePhotoUri = (path: string | null): string | null => {
  if (!path || path.length===0) return null;
  if (path.startsWith("file://") || (FileSystem.documentDirectory && path.startsWith(FileSystem.documentDirectory))) {
    return path;
  }
  if (!FileSystem.documentDirectory) {
    console.warn("FileSystem.documentDirectory is null, cannot resolve relative path");
    return null;
  }
  return `${FileSystem.documentDirectory}${path}`;
};