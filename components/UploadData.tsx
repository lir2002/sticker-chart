// Upload.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Alert,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useLanguage } from "../LanguageContext";
import { CustomButton } from "./SharedComponents";

interface UploadDataProps {
  onClose: () => void;
}

const UploadData: React.FC<UploadDataProps> = ({ onClose }) => {
  const { t } = useLanguage();
  const [backupFiles, setBackupFiles] = useState<string[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadBackupFiles = async () => {
    try {
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBackupFiles();
  }, []);

  const handleUpload = async () => {
    if (!selectedBackup) {
      Alert.alert("Error", t("selectBackup"));
      return;
    }
    setIsUploading(true);
    try {
      const backupDir = `${FileSystem.documentDirectory}Sticker-Chart/`;
      const filePath = `${backupDir}${selectedBackup}`;
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        throw new Error(`Backup file ${selectedBackup} does not exist`);
      }
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        throw new Error("Sharing is not available on this device");
      }
      await Sharing.shareAsync(filePath, {
        mimeType: "application/zip",
        dialogTitle: t("uploadBackup"),
      });
      Alert.alert(t("success"), t("uploadSuccess"), [
        { text: t("ok"), onPress: onClose },
      ]);
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", `${t("uploadError")}: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const renderBackupFile = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.fileItem,
        selectedBackup === item && styles.selectedFileItem,
      ]}
      onPress={() => setSelectedBackup(item)}
      disabled={isUploading}
    >
      <Text>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("uploadBackup")}</Text>
      {isLoading ? (
        <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
      ) : isUploading ? (
        <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
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
        title={t("upload")}
        onPress={handleUpload}
        disabled={isUploading || !selectedBackup}
      />
      <CustomButton
        title={t("cancel")}
        onPress={onClose}
        disabled={isUploading}
      />
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

export default UploadData;