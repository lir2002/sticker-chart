import React, { useState, useEffect } from "react";
import {
  Alert,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useLanguage } from "../contexts/LanguageContext";
import { CustomButton } from "./SharedComponents";
import { YStack, Text, useTheme } from "tamagui";

interface UploadDataProps {
  onClose: () => void;
}

const UploadData: React.FC<UploadDataProps> = ({ onClose }) => {
  const { t } = useLanguage();
  const theme = useTheme();
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
      onPress={() => setSelectedBackup(item)}
      disabled={isUploading}
    >
      <YStack
        p="$2"
        borderBottomWidth={1}
        borderBottomColor="$border"
        bg={selectedBackup === item ? "$selectedBackground" : undefined}
      >
        <Text color="$text">{item}</Text>
      </YStack>
    </TouchableOpacity>
  );

  return (
    <YStack p="$4" ai="center" bg="$modalBackground">
      <Text fontSize="$5" fontWeight="bold" mb="$4" color="$text">
        {t("uploadBackup")}
      </Text>
      {isLoading || isUploading ? (
        <ActivityIndicator
          size="large"
          color="$primary"
          style={{ marginVertical: 20 }}
        />
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
        title={t("upload")}
        onPress={handleUpload}
        disabled={isUploading || !selectedBackup}
      />
      <CustomButton
        title={t("cancel")}
        onPress={onClose}
        disabled={isUploading}
      />
    </YStack>
  );
};

export default UploadData;
