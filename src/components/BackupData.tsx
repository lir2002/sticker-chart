import React, { useState } from "react";
import {
  View,
  Text,
  Alert,
  StyleSheet,
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
} from "../db/database";
import UploadData from "./UploadData";
import { CustomButton } from "./SharedComponents";

interface BackupDataProps {
  onClose: () => void;
}

const BackupData: React.FC<BackupDataProps> = ({ onClose }) => {
  const { t } = useLanguage();
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
      const zipPath = `${backupDir}stickers.${dbVersion.version}.bak.zip`;
      const tempDir = `${FileSystem.cacheDirectory}backup_temp/`;
      const photosDir = `${FileSystem.documentDirectory}photos/`;
  
      await FileSystem.deleteAsync(tempDir, { idempotent: true });
      await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });
      await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
  
      const zipInfo = await FileSystem.getInfoAsync(zipPath);
      if (zipInfo.exists) {
        const date = new Date().toISOString().slice(2, 17).replace(/[-T:]/g, '');
        const newZipPath = `${backupDir}stickers.${dbVersion.version}.bak.${date}.zip`;
        await FileSystem.moveAsync({ from: zipPath, to: newZipPath });
      }
  
      // Fetch existing data
      const users = await getUsers();
      const eventTypes = await getEventTypes();
      const events = await fetchAllEvents();
      const roles = await getRoles();
      const wallets = await getAllWallets();
      // Fetch transactions_<userId> for non-Guest users
      const transactionsTables: { [key: string]: any[] } = {};
      const nonGuestUsers = users.filter((user) => user.name !== "Guest");
      for (const user of nonGuestUsers) {
        const transactions = await fetchTransactions(user.id);
        transactionsTables[`transactions_${user.id}`] = transactions;
      }
  
      // Combine all data
      const dbData = {
        users,
        eventTypes,
        events,
        roles,
        dbVersion,
        wallets,
        ...transactionsTables,
      };
      const dbJsonPath = `${tempDir}database.json`;
      await FileSystem.writeAsStringAsync(dbJsonPath, JSON.stringify(dbData));
  
      const zip = new JSZip();
      const dbJsonContent = await FileSystem.readAsStringAsync(dbJsonPath);
      zip.file("database.json", dbJsonContent);

      const photoDirInfo = await FileSystem.getInfoAsync(photosDir);
      if (photoDirInfo.exists) {
        const photoFiles = await FileSystem.readDirectoryAsync(photosDir);
        for (const file of photoFiles) {
          const fileContent = await FileSystem.readAsStringAsync(`${photosDir}${file}`, {
            encoding: FileSystem.EncodingType.Base64,
          });
          zip.file(`photos/${file}`, fileContent, { base64: true });
        }
      }

      const iconDir = `${tempDir}icons/`;
      await FileSystem.makeDirectoryAsync(iconDir, { intermediates: true });
      for (const user of users) {
        if (user.icon) {
          const iconFileName = user.icon.split('/').pop() || `icon_${user.id}.jpg`;
          await FileSystem.copyAsync({
            from: user.icon,
            to: `${iconDir}${iconFileName}`,
          });
          const fileContent = await FileSystem.readAsStringAsync(`${iconDir}${iconFileName}`, {
            encoding: FileSystem.EncodingType.Base64,
          });
          zip.file(`icons/${iconFileName}`, fileContent, { base64: true });
        }
      }
  
      const zipContent = await zip.generateAsync({ type: "base64" });
      await FileSystem.writeAsStringAsync(zipPath, zipContent, {
        encoding: FileSystem.EncodingType.Base64,
      });
  
      await FileSystem.deleteAsync(tempDir, { idempotent: true });
  
      // Reload backup files to update UI
      await loadBackupFiles();
  
      Alert.alert(
        t("success"),
        `${t("backupComplete")} ${zipPath}`,
        [{ text: t("ok"), onPress: onClose }]
      );
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
      prev.includes(file)
        ? prev.filter((f) => f !== file)
        : [...prev, file]
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
      setBackupFiles((prev) => prev.filter((f) => !selectedBackups.includes(f)));
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
      style={[
        styles.fileItem,
        selectedBackups.includes(item) && styles.selectedFileItem,
      ]}
      onPress={() => toggleBackupSelection(item)}
      disabled={isDeleting}
    >
      <Text>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("backupData")}</Text>
      {isBackingUp || isDeleting ? (
        <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
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
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setDeleteModalVisible(false)}
              disabled={isDeleting}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t("deleteBackups")}</Text>
            {isDeleting ? (
              <ActivityIndicator size="large" color="#0000ff" />
            ) : backupFiles.length > 0 ? (
              <FlatList
                data={backupFiles}
                renderItem={renderBackupFile}
                keyExtractor={(item) => item}
                style={styles.fileList}
              />
            ) : (
              <Text style={styles.noFilesText}>{t("noBackups")}</Text>
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
          </View>
        </View>
      </Modal>

      {/* Upload Backup Modal */}
      <Modal
        visible={uploadModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setUploadModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setUploadModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
            <UploadData onClose={() => setUploadModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  loader: {
    marginVertical: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "80%",
    maxHeight: "80%",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  closeButtonText: {
    fontSize: 24,
    color: "#000",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  fileList: {
    width: "100%",
    maxHeight: 200,
    marginBottom: 20,
  },
  fileItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  selectedFileItem: {
    backgroundColor: "#e0f0ff",
  },
  noFilesText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
});

export default BackupData;