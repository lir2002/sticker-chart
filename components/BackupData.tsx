// BackupData.tsx
import React, { useState } from "react";
import { View, Text, Button, Alert, StyleSheet } from "react-native";
import * as FileSystem from "expo-file-system";
import JSZip from "jszip";
import { useLanguage } from "../LanguageContext";
import { getUsers, getEventTypes, fetchAllEvents } from "../db/database";
import * as SQLite from "expo-sqlite";

interface BackupDataProps {
  onClose: () => void;
}

const BackupData: React.FC<BackupDataProps> = ({ onClose }) => {
  const { t } = useLanguage();
  const [isBackingUp, setIsBackingUp] = useState(false);

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      // Define directories and paths
      const backupDir = `${FileSystem.documentDirectory}Sticker-Chart/`;
      const zipPath = `${backupDir}stickerchart.back.zip`;
      const tempDir = `${FileSystem.cacheDirectory}backup_temp/`;
      const photosDir = `${FileSystem.documentDirectory}photos/`;

      // Clean up any existing temp directory
      await FileSystem.deleteAsync(tempDir, { idempotent: true });

      // Create backup directory if it doesn't exist
      await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });
      await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });

      // Handle existing backup file
      const zipInfo = await FileSystem.getInfoAsync(zipPath);
      if (zipInfo.exists) {
        const date = new Date().toISOString().slice(0, 10).replace(/-/, '');
        const newZipPath = `${backupDir}stickerchart.back.${date}.zip`;
        await FileSystem.moveAsync({ from: zipPath, to: newZipPath });
      }

      // Export database to JSON
      const users = await getUsers();
      const eventTypes = await getEventTypes();
      const events = await fetchAllEvents();
      const roles = await (async () => {
        const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
        try {
          const roles = await db.getAllAsync<{ role_id: number; role_name: string }>(
            "SELECT role_id, role_name FROM roles;"
          );
          return roles;
        } finally {
          await db.closeAsync();
        }
      })();
      const dbData = { users, eventTypes, events, roles };
      const dbJsonPath = `${tempDir}database.json`;
      await FileSystem.writeAsStringAsync(dbJsonPath, JSON.stringify(dbData));

      // Initialize JSZip
      const zip = new JSZip();

      // Add database.json
      const dbJsonContent = await FileSystem.readAsStringAsync(dbJsonPath);
      zip.file("database.json", dbJsonContent);

      // Add photos
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

      // Add user icons
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

      // Generate ZIP and write to file
      const zipContent = await zip.generateAsync({ type: "base64" });
      await FileSystem.writeAsStringAsync(zipPath, zipContent, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Clean up temp directory
      await FileSystem.deleteAsync(tempDir, { idempotent: true });

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("backupData")}</Text>
      <Button
        title={t("backup")}
        onPress={handleBackup}
        disabled={isBackingUp}
      />
      <Button title={t("cancel")} onPress={onClose} disabled={isBackingUp} />
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
});

export default BackupData;