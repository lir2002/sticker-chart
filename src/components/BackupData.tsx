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
import {
  getUsers,
  getEventTypes,
  fetchAllEvents,
  fetchTransactions,
  getRoles,
  getDbVersion,
  getAllWallets,
  getProducts,
  getPurchases,
  getProductImages,
} from "../db";
import UploadData from "./UploadData";
import { CustomButton } from "./SharedComponents";
import { Stack, YStack, Text, useTheme } from "tamagui";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

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
      const dbVersion = await getDbVersion();
      const backupDir = `${FileSystem.documentDirectory}Sticker-Chart/`;
      const date = new Date().toISOString().slice(2, 17).replace(/[-T:]/g, "");
      const zipPath = `${backupDir}stickers.${dbVersion.version}.bak.${date}.zip`;
      const tempDir = `${FileSystem.cacheDirectory}backup_temp/`;
      const photosDir = `${FileSystem.documentDirectory}photos/`;
      const productsDir = `${FileSystem.documentDirectory}products/`;
      const rootDir = `${FileSystem.documentDirectory}`;

      await FileSystem.deleteAsync(tempDir, { idempotent: true });
      await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });
      await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });

      const users = await getUsers();
      const eventTypes = await getEventTypes();
      const events = await fetchAllEvents();
      const roles = await getRoles();
      const wallets = await getAllWallets();
      const products = await getProducts(); // Added products
      const purchases = await getPurchases(); // Added purchases
      const productImages = await getProductImages(); // Added productImages
      const transactionsTables: { [key: string]: any[] } = {};
      const nonGuestUsers = users.filter((user) => user.name !== "Guest");
      for (const user of nonGuestUsers) {
        const transactions = await fetchTransactions(user.id);
        transactionsTables[`transactions_${user.id}`] = transactions;
      }

      const dbData = {
        users,
        eventTypes,
        events,
        roles,
        dbVersion,
        wallets,
        products, // Added to dbData
        purchases, // Added to dbData
        productImages, // Added to dbData
        ...transactionsTables,
      };
      const dbJsonPath = `${tempDir}database.json`;
      await FileSystem.writeAsStringAsync(dbJsonPath, JSON.stringify(dbData));

      const zip = new JSZip();
      const dbJsonContent = await FileSystem.readAsStringAsync(dbJsonPath);
      zip.file("database.json", dbJsonContent);

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

      const iconDir = `${tempDir}icons/`;
      await FileSystem.makeDirectoryAsync(iconDir, { intermediates: true });
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

    const zipContent = await zip.generateAsync({ type: "base64" });
    await FileSystem.writeAsStringAsync(zipPath, zipContent, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await FileSystem.deleteAsync(tempDir, { idempotent: true });

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
