import React, { useState } from "react";
import { Alert, Modal, Platform, TouchableOpacity } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { Stack, Text, YStack, useTheme } from "tamagui";
import { useLanguage } from "../contexts/LanguageContext";
import { CustomButton } from "./SharedComponents";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

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
  const theme = useTheme();
  const [isDownloading, setIsDownloading] = useState(false);

  const handlePickFile = async () => {
    try {
      setIsDownloading(true);
      console.log(`Starting file pick (Platform: ${Platform.OS})`);

      const result = await DocumentPicker.getDocumentAsync({
        type: "application/zip",
        copyToCacheDirectory: true,
      });
      console.log("DocumentPicker result:", JSON.stringify(result, null, 2));

      if ("canceled" in result && result.canceled) {
        console.log("Picker canceled");
        Alert.alert(t("info"), t("filePickCanceled"));
        return;
      }

      if ("assets" in result && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        const backupDir = `${FileSystem.documentDirectory}Sticker-Chart/`;
        const dirInfo = await FileSystem.getInfoAsync(backupDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(backupDir, {
            intermediates: true,
          });
        }

        const fileName = asset.name.endsWith(".zip")
          ? asset.name
          : `${asset.name}.zip`;
        const destPath = `${backupDir}${fileName}`;

        const sourceInfo = await FileSystem.getInfoAsync(asset.uri);
        if (!sourceInfo.exists) {
          throw new Error(`Source file inaccessible: ${asset.uri}`);
        }

        try {
          await FileSystem.copyAsync({
            from: asset.uri,
            to: destPath,
          });
        } catch (copyError) {
          console.error(
            `Copy failed: from: ${asset.uri} to: ${destPath}`,
            copyError
          );
          const content = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          await FileSystem.writeAsStringAsync(destPath, content, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }

        const destInfo = await FileSystem.getInfoAsync(destPath);
        if (!destInfo.exists) {
          throw new Error(`Failed to create file at: ${destPath}`);
        }

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
      <Stack f={1} jc="center" ai="center" bg="$overlay">
        <YStack
          bg="$modalBackground"
          p="$4"
          br="$2"
          w="80%"
          ai="center"
          position="relative"
        >
          <TouchableOpacity
            onPress={onClose}
            disabled={isDownloading}
            style={{ position: "absolute", top: 10, right: 10 }}
          >
            <MaterialIcons name="close" size={24} color={theme.icon.val} />
          </TouchableOpacity>
          <Text fontSize="$5" fontWeight="bold" mb="$2" color="$text">
            {t("downloadBackup")}
          </Text>
          <Text fontSize="$3" color="$gray" mb="$4" ta="center">
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
        </YStack>
      </Stack>
    </Modal>
  );
};

export default DownloadData;
