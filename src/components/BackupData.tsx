import React, { useState } from "react";
import {
  Alert,
  FlatList,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from "react-native";
import * as FileSystem from "expo-file-system";
import JSZip from "jszip";
import { useLanguage } from "../contexts/LanguageContext";
import { getDbVersion, getUsers } from "../db";
import { CustomButton } from "./SharedComponents";
import { Stack, YStack, Text, useTheme } from "tamagui";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import UploadData from "./UploadData";
import * as Device from "expo-device";

interface BackupDataProps {
  onClose: () => void;
}

const BackupData: React.FC<BackupDataProps> = ({ onClose }) => {
  const { t } = useLanguage();
  const theme = useTheme();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [backupFiles, setBackupFiles] = useState<string[]>([]);
  const [selectedBackups, setSelectedBackups] = useState<string[]>([]);

  // Utility function to get and sanitize device name
  async function getSanitizedDeviceName(): Promise<string> {
    try {
      // Ensure device info is loaded
      if (!Device.isDevice) {
        console.log("Running on emulator, using default device name");
        return "Emulator";
      }

      const deviceName = Device.deviceName;
      if (!deviceName) {
        console.log("Device name not available, using default");
        return "UnknownDevice";
      }

      // Sanitize device name: remove invalid filename characters and trim
      const sanitizedName = deviceName
        .replace(/[^a-zA-Z0-9-_]/g, "") // Keep alphanumeric, hyphens, underscores
        .trim()
        .slice(0, 50); // Limit length to avoid overly long filenames

      return sanitizedName || "UnknownDevice";
    } catch (error) {
      console.error("Error getting device name:", error);
      return "UnknownDevice";
    }
  }
  const loadBackupFiles = async () => {
    try {
      const backupDir = `${FileSystem.documentDirectory}Sticker-Chart/`;
      const dirInfo = await FileSystem.getInfoAsync(backupDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });
      }
      const files = await FileSystem.readDirectoryAsync(backupDir);
      const zipFiles = files.filter((file) => file.endsWith(".zip"));
      setBackupFiles(zipFiles);
    } catch (error) {
      console.error("Error loading backup files:", error);
      Alert.alert("Error", `${t("errorLoadBackups")}: ${error.message}`);
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const deviceName = await getSanitizedDeviceName();
      const dbVersion = await getDbVersion();
      const version = dbVersion.version;
      const backupDir = `${FileSystem.documentDirectory}Sticker-Chart/`;
      const date = new Date().toISOString().slice(2, 17).replace(/[-T:]/g, "");
      const zipPath = `${backupDir}stickers.${version}.bak.${deviceName}.${date}.zip`;
      const tempDir = `${FileSystem.cacheDirectory}backup_temp/`;
      const photosDir = `${FileSystem.documentDirectory}photos/`;
      const productsDir = `${FileSystem.documentDirectory}products/`;
      const rootDir = `${FileSystem.documentDirectory}`;
      const dbFilePath = `${FileSystem.documentDirectory}SQLite/eventmarker.db`;

      // Prepare directories
      await FileSystem.deleteAsync(tempDir, { idempotent: true });
      await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });
      await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });

      // Verify database file exists
      const dbFileInfo = await FileSystem.getInfoAsync(dbFilePath);
      if (!dbFileInfo.exists) {
        throw new Error("Database file eventmarker.db not found");
      }

      // Create ZIP
      const zip = new JSZip();

      // Copy and add the database file to ZIP
      const dbContent = await FileSystem.readAsStringAsync(dbFilePath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      zip.file("eventmarker.db", dbContent, { base64: true });

      // Backup photos directory
      const photoDirInfo = await FileSystem.getInfoAsync(photosDir);
      if (photoDirInfo.exists) {
        const photoFiles = await FileSystem.readDirectoryAsync(photosDir);
        for (const file of photoFiles) {
          const fileContent = await FileSystem.readAsStringAsync(
            `${photosDir}${file}`,
            {
              encoding: FileSystem.EncodingType.Base64,
            }
          );
          zip.file(`photos/${file}`, fileContent, { base64: true });
        }
      }

      // Backup products directory
      const productsDirInfo = await FileSystem.getInfoAsync(productsDir);
      if (productsDirInfo.exists) {
        const productFiles = await FileSystem.readDirectoryAsync(productsDir);
        for (const file of productFiles) {
          const fileContent = await FileSystem.readAsStringAsync(
            `${productsDir}${file}`,
            {
              encoding: FileSystem.EncodingType.Base64,
            }
          );
          zip.file(`products/${file}`, fileContent, { base64: true });
        }
      }

      // Backup icons directory
      const iconDir = `${tempDir}icons/`;
      await FileSystem.makeDirectoryAsync(iconDir, { intermediates: true });
      const users = await getUsers();
      for (const user of users) {
        if (user.icon) {
          const relativeIconPath = user.icon;
          const absoluteIconPath = `${rootDir}${relativeIconPath}`;
          const iconFileName =
            relativeIconPath.split("/").pop() || `icon_${user.id}.jpg`;

          const iconFileInfo = await FileSystem.getInfoAsync(absoluteIconPath);
          if (iconFileInfo.exists) {
            await FileSystem.copyAsync({
              from: absoluteIconPath,
              to: `${iconDir}${iconFileName}`,
            });
            const fileContent = await FileSystem.readAsStringAsync(
              `${iconDir}${iconFileName}`,
              {
                encoding: FileSystem.EncodingType.Base64,
              }
            );
            zip.file(`icons/${iconFileName}`, fileContent, { base64: true });
          } else {
            console.warn(`Icon file not found: ${absoluteIconPath}`);
          }
        }
      }

      // Generate and save ZIP
      const zipContent = await zip.generateAsync({ type: "base64" });
      await FileSystem.writeAsStringAsync(zipPath, zipContent, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Clean up
      await FileSystem.deleteAsync(tempDir, { idempotent: true });

      // Reload backup files
      await loadBackupFiles();

      Alert.alert(t("success"), `${t("backupComplete")} ${zipPath}`, [
        { text: t("ok") },
      ]);
    } catch (error) {
      console.error("Backup error:", error);
      Alert.alert("Error", `${t("errorBackup")}: ${error.message}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDelete = async () => {
    await loadBackupFiles();
    setDeleteModalVisible(true);
  };

  const toggleBackupSelection = (file: string) => {
    setSelectedBackups((prev) =>
      prev.includes(file) ? prev.filter((f) => f !== file) : [...prev, file]
    );
  };

  const confirmDelete = async () => {
    if (selectedBackups.length === 0) {
      Alert.alert("Error", t("selectBackups"));
      return;
    }
    setIsDeleting(true);
    try {
      const backupDir = `${FileSystem.documentDirectory}Sticker-Chart/`;
      for (const file of selectedBackups) {
        const filePath = `${backupDir}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(filePath, { idempotent: true });
        }
      }
      setBackupFiles((prev) =>
        prev.filter((f) => !selectedBackups.includes(f))
      );
      setSelectedBackups([]);
      Alert.alert(t("success"), t("deleteSuccess"), [
        { text: t("ok"), onPress: () => setDeleteModalVisible(false) },
      ]);
    } catch (error) {
      console.error("Delete error:", error);
      Alert.alert("Error", `${t("deleteError")}: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const renderBackupFile = ({ item }: { item: string }) => (
    <TouchableOpacity
      onPress={() => toggleBackupSelection(item)}
      disabled={isDeleting}
    >
      <YStack
        p="$2"
        borderBottomWidth={1}
        borderBottomColor="$border"
        bg={selectedBackups.includes(item) ? "$selectedBackground" : undefined}
      >
        <Text color="$text">{item}</Text>
      </YStack>
    </TouchableOpacity>
  );

  return (
    <YStack p="$4" ai="center" bg="$modalBackground">
      <Text fontSize="$5" fontWeight="bold" mb="$4" color="$text">
        {t("backupData")}
      </Text>
      {isBackingUp || isDeleting ? (
        <ActivityIndicator
          size="large"
          color="$primary"
          style={{ marginVertical: 20 }}
        />
      ) : (
        <>
          <CustomButton
            title={t("backup")}
            onPress={handleBackup}
            disabled={isBackingUp || isDeleting}
          />
          <CustomButton
            title={t("delete")}
            onPress={handleDelete}
            disabled={isBackingUp || isDeleting}
          />
          <CustomButton
            title={t("upload")}
            onPress={() => setUploadModalVisible(true)}
            disabled={isBackingUp || isDeleting}
          />
          <CustomButton
            title={t("cancel")}
            onPress={onClose}
            disabled={isBackingUp || isDeleting}
          />
        </>
      )}

      {/* Delete Backups Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <Stack f={1} jc="center" ai="center" bg="$overlay">
          <YStack
            bg="$modalBackground"
            p="$4"
            br="$2"
            w="80%"
            maxHeight="80%"
            ai="center"
            position="relative"
          >
            <TouchableOpacity
              onPress={() => setDeleteModalVisible(false)}
              disabled={isDeleting}
              style={{ position: "absolute", top: 10, right: 10 }}
            >
              <MaterialIcons name="close" size={24} color={theme.icon.val} />
            </TouchableOpacity>
            <Text fontSize="$5" fontWeight="bold" mb="$4" color="$text">
              {t("deleteBackups")}
            </Text>
            {isDeleting ? (
              <ActivityIndicator size="large" color="$primary" />
            ) : backupFiles.length > 0 ? (
              <FlatList
                data={backupFiles}
                renderItem={renderBackupFile}
                keyExtractor={(item) => item}
                style={{ width: "100%", maxHeight: 200, marginBottom: 20 }}
              />
            ) : (
              <Text fontSize="$3" color="$gray" mb="$4">
                {t("noBackups")}
              </Text>
            )}
            <CustomButton
              title={t("confirmDelete")}
              onPress={confirmDelete}
              disabled={isDeleting || selectedBackups.length === 0}
            />
            <CustomButton
              title={t("cancel")}
              onPress={() => setDeleteModalVisible(false)}
              disabled={isDeleting}
            />
          </YStack>
        </Stack>
      </Modal>

      {/* Upload Backup Modal */}
      <Modal
        visible={uploadModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setUploadModalVisible(false)}
      >
        <Stack f={1} jc="center" ai="center" bg="$overlay">
          <YStack
            bg="$modalBackground"
            p="$4"
            br="$2"
            w="80%"
            maxHeight="80%"
            ai="center"
            position="relative"
            jc="center"
          >
            <TouchableOpacity
              onPress={() => setUploadModalVisible(false)}
              style={{ position: "absolute", top: 10, right: 10 }}
            >
              <MaterialIcons name="close" size={24} color={theme.icon.val} />
            </TouchableOpacity>
            <UploadData onClose={() => setUploadModalVisible(false)} />
          </YStack>
        </Stack>
      </Modal>
    </YStack>
  );
};

export default BackupData;
