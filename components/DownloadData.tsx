import React, { useState } from "react";
import { View, Text, Alert, StyleSheet, Modal, Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useLanguage } from "../LanguageContext";
import { CustomButton } from "./SharedComponents";

interface DownloadDataProps {
  visible: boolean;
  onClose: () => void;
  onDownloadComplete: () => void;
}

const DownloadData: React.FC<DownloadDataProps> = ({
  visible,
  onClose,
  onDownloadComplete,
}) => {
  const { t } = useLanguage();
  const [isDownloading, setIsDownloading] = useState(false);

  const handlePickFile = async () => {
    try {
      setIsDownloading(true);
      console.log(`Starting file pick (Platform: ${Platform.OS})`);

      const result = await DocumentPicker.getDocumentAsync({
        type: "application/zip",
        copyToCacheDirectory: true, // Cache for reliability
      });
      console.log("DocumentPicker result:", JSON.stringify(result, null, 2));

      // Handle DocumentPickerResult
      if ("canceled" in result && result.canceled) {
        console.log("Picker canceled");
        Alert.alert(t("info"), t("filePickCanceled"));
        return;
      }

      // Type narrow to DocumentPickerSuccessResult
      if ("assets" in result && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        const backupDir = `${FileSystem.documentDirectory}Sticker-Chart/`;
        const dirInfo = await FileSystem.getInfoAsync(backupDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });
        }

        // Ensure filename has .zip extension
        const fileName = asset.name.endsWith(".zip")
          ? asset.name
          : `${asset.name}.zip`;
        const destPath = `${backupDir}${fileName}`;

        // Verify source file accessibility
        const sourceInfo = await FileSystem.getInfoAsync(asset.uri);
        if (!sourceInfo.exists) {
          throw new Error(`Source file inaccessible: ${asset.uri}`);
        }

        // Try copying the file
        try {
          await FileSystem.copyAsync({
            from: asset.uri,
            to: destPath,
          });
        } catch (copyError) {
          // Fallback: Read and write file content
          const content = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          await FileSystem.writeAsStringAsync(destPath, content, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }

        // Verify destination file
        const destInfo = await FileSystem.getInfoAsync(destPath);
        if (!destInfo.exists) {
          throw new Error(`Failed to create file at: ${destPath}`);
        }

        // Log success and trigger completion
        Alert.alert(t("success"), t("downloadComplete"), [
          {
            text: t("ok"),
            onPress: () => {
              onDownloadComplete();
              onClose();
            },
          },
        ]);
      } else {
        throw new Error(`Invalid picker result: ${JSON.stringify(result)}`);
      }
    } catch (error) {
      Alert.alert(
        t("error"),
        `${t("errorDownload")}: ${error.message || t("unknownError")}`
      );
    } finally {
      setIsDownloading(false);
    }
  };


  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t("downloadBackup")}</Text>
          <Text style={styles.instructionText}>
            {t("selectZipFile")}
          </Text>
          <CustomButton
            title={t("pickFile")}
            onPress={handlePickFile}
            disabled={isDownloading}
          />
          <CustomButton
            title={t("cancel")}
            onPress={onClose}
            disabled={isDownloading}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
});

export default DownloadData;