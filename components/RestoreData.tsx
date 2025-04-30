import React, { useState } from "react";
import {
  View,
  Text,
  Alert,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import * as FileSystem from "expo-file-system";
import JSZip from "jszip";
import { useLanguage } from "../LanguageContext";
import * as SQLite from "expo-sqlite";
import { CustomButton } from "./SharedComponents";
import DownloadData from "./DownloadData";

interface RestoreDataProps {
  onClose: () => void;
}

const RestoreData: React.FC<RestoreDataProps> = ({ onClose }) => {
  const { t } = useLanguage();
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupFiles, setBackupFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);

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
      Alert.alert("Error", t("errorLoadBackups"));
    }
  };

  React.useEffect(() => {
    loadBackupFiles();
  }, []);

  const handleRestore = async () => {
    if (!selectedFile) {
      Alert.alert("Error", t("selectBackupFile"));
      return;
    }
    setIsRestoring(true);
    try {
      const backupDir = `${FileSystem.documentDirectory}Sticker-Chart/`;
      const zipPath = `${backupDir}${selectedFile}`;
      const tempDir = `${FileSystem.cacheDirectory}restore_temp/`;
      const photosDir = `${FileSystem.documentDirectory}photos/`;
      const iconsDir = `${FileSystem.documentDirectory}icons/`;

      // Read ZIP file
      const zipContent = await FileSystem.readAsStringAsync(zipPath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const zip = await JSZip.loadAsync(zipContent, { base64: true });

      // Create temp directory
      await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });

      // Extract database.json
      const dbJsonFile = zip.file("database.json");
      if (dbJsonFile) {
        const dbJsonContent = await dbJsonFile.async("string");
        const dbData = JSON.parse(dbJsonContent);
        const db = await SQLite.openDatabaseAsync("eventmarker.db", { useNewConnection: true });
        try {
          await db.withTransactionAsync(async () => {
            // Clear existing tables
            await db.execAsync(`
              DELETE FROM events;
              DELETE FROM event_types;
              DELETE FROM users;
              DELETE FROM roles;
              DELETE FROM db_version;
            `);

            // Insert roles
            for (const role of dbData.roles) {
              await db.runAsync(
                "INSERT INTO roles (role_id, role_name) VALUES (?, ?);",
                [role.role_id, role.role_name]
              );
            }

            // Insert users
            for (const user of dbData.users) {
              await db.runAsync(
                "INSERT INTO users (id, name, role_id, code, is_active, created_at, updated_at, icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?);",
                [
                  user.id,
                  user.name,
                  user.role_id,
                  user.code,
                  user.is_active,
                  user.created_at,
                  user.updated_at,
                  user.icon,
                ]
              );
            }

            // Insert event_types
            for (const type of dbData.eventTypes) {
              await db.runAsync(
                "INSERT INTO event_types (name, icon, iconColor, availability, owner, weight) VALUES (?, ?, ?, ?, ?, ?);",
                [
                  type.name,
                  type.icon,
                  type.iconColor,
                  type.availability,
                  type.owner || null,
                  type.weight,
                ]
              );
            }

            // Insert events
            for (const event of dbData.events) {
              await db.runAsync(
                `INSERT INTO events (id, date, markedAt, eventType, note, photoPath, created_by, is_verified, verified_at, verified_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                [
                  event.id,
                  event.date,
                  event.markedAt,
                  event.eventType,
                  event.note || null,
                  event.photoPath || null,
                  event.created_by,
                  event.is_verified ? 1 : 0,
                  event.verified_at || null,
                  event.verified_by || null,
                ]
              );
            }

            // Insert db_version
            if (dbData.dbVersion && typeof dbData.dbVersion.version === 'number') {
              await db.runAsync(
                "INSERT OR REPLACE INTO db_version (version) VALUES (?);",
                [dbData.dbVersion.version]
              );
            }
          });
        } finally {
          await db.closeAsync();
        }
      } else {
        throw new Error("Backup does not contain a valid database file");
      }

      // Restore photos
      await FileSystem.deleteAsync(photosDir, { idempotent: true });
      await FileSystem.makeDirectoryAsync(photosDir, { intermediates: true });
      const photoFiles = Object.keys(zip.files).filter((name) => name.startsWith("photos/") && !name.endsWith("/"));
      for (const fileName of photoFiles) {
        const fileContent = await zip.file(fileName)!.async("base64");
        const destPath = `${photosDir}${fileName.split('/').pop()}`;
        await FileSystem.writeAsStringAsync(destPath, fileContent, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      // Restore icons
      await FileSystem.deleteAsync(iconsDir, { idempotent: true });
      await FileSystem.makeDirectoryAsync(iconsDir, { intermediates: true });
      const iconFiles = Object.keys(zip.files).filter((name) => name.startsWith("icons/") && !name.endsWith("/"));
      for (const fileName of iconFiles) {
        const fileContent = await zip.file(fileName)!.async("base64");
        const destPath = `${iconsDir}${fileName.split('/').pop()}`;
        await FileSystem.writeAsStringAsync(destPath, fileContent, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      // Clean up temp directory
      await FileSystem.deleteAsync(tempDir, { idempotent: true });

      Alert.alert(
        t("success"),
        t("restoreComplete"),
        [{
          text: t("ok"),
          onPress: () => {
            onClose();
            Alert.alert(t("info"), t("restartApp"), [{ text: t("ok") }]);
          }
        }]
      );
    } catch (error) {
      console.error("Restore error:", error);
      Alert.alert("Error", `${t("errorRestore")}: ${error.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const renderBackupFile = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.fileItem,
        selectedFile === item && styles.selectedFileItem,
      ]}
      onPress={() => setSelectedFile(item)}
    >
      <Text>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("restoreData")}</Text>
      {backupFiles.length > 0 ? (
        <FlatList
          data={backupFiles}
          renderItem={renderBackupFile}
          keyExtractor={(item) => item}
          style={styles.fileList}
        />
      ) : (
        <Text style={styles.noFilesText}>{t("noBackupFiles")}</Text>
      )}
      <CustomButton
        title={t("download")}
        onPress={() => setDownloadModalVisible(true)}
        disabled={isRestoring}
      />
      <CustomButton
        title={t("restore")}
        onPress={handleRestore}
        disabled={isRestoring || !selectedFile}
      />
      <CustomButton
        title={t("cancel")}
        onPress={onClose}
        disabled={isRestoring}
      />
      <DownloadData
        visible={downloadModalVisible}
        onClose={() => setDownloadModalVisible(false)}
        onDownloadComplete={loadBackupFiles}
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

export default RestoreData;