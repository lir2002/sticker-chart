import React, { useState } from "react";
import { FlatList, TouchableOpacity, Alert } from "react-native";
import { YStack, Text } from "tamagui";
import * as FileSystem from "expo-file-system";
import JSZip from "jszip";
import { useLanguage } from "../contexts/LanguageContext";
import { CustomButton } from "./SharedComponents";
import DownloadData from "./DownloadData";
import { DatabaseManager } from "../db/database";

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
      const productsDir = `${FileSystem.documentDirectory}products/`;

      // Read ZIP file
      const zipContent = await FileSystem.readAsStringAsync(zipPath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const zip = await JSZip.loadAsync(zipContent, { base64: true });

      // Create temp directory
      await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });

      // Extract database.json
      const dbJsonFile = zip.file("database.json");
      if (!dbJsonFile) {
        throw new Error("Backup does not contain a valid database file");
      }

      const dbJsonContent = await dbJsonFile.async("string");
      const dbData = JSON.parse(dbJsonContent);

      // Get backup version
      const backupVersion = dbData.dbVersion?.version || 0;

      // Migrate absolute paths to relative paths if version < 5
      if (backupVersion < 5) {
        if (dbData.events) {
          dbData.events = dbData.events.map((event: any) => {
            if (event.photoPath && event.photoPath.startsWith("file://")) {
              const relativePath = event.photoPath.includes("photos/")
                ? event.photoPath.substring(event.photoPath.indexOf("photos/"))
                : null;
              return { ...event, photoPath: relativePath };
            }
            return event;
          });
        }
        if (dbData.users) {
          dbData.users = dbData.users.map((user: any) => {
            if (user.icon && user.icon.startsWith("file://")) {
              const relativePath = user.icon.includes("icons/")
                ? user.icon.substring(user.icon.indexOf("icons/"))
                : null;
              return { ...user, icon: relativePath };
            }
            return user;
          });
        }
      }

      // Migrate events to include owner if version < 6
      if (backupVersion < 6) {
        if (dbData.events && dbData.eventTypes) {
          dbData.events = dbData.events.map((event: any) => {
            // Find matching eventType to get owner
            const matchingType = dbData.eventTypes.find(
              (type: any) => type.name === event.eventType
            );
            return {
              ...event,
              owner: matchingType?.owner || null,
            };
          });
        }
      }

      // Migrate event_types to include expiration_date if version < 7
      if (backupVersion < 7) {
        if (dbData.eventTypes) {
          dbData.eventTypes = dbData.eventTypes.map((type: any) => ({
            ...type,
            expiration_date: null,
          }));
        }
      }

      // Migrate event_types to include created_at if version < 8
      if (backupVersion < 8) {
        if (dbData.eventTypes) {
          dbData.eventTypes = dbData.eventTypes.map((type: any) => ({
            ...type,
            created_at: null,
          }));
        }
      }

      // Migrate for products, purchases, productImages if version < 10
      if (backupVersion < 10) {
        // Ensure data structures exist, even if empty
        dbData.products = dbData.products || [];
        dbData.purchases = dbData.purchases || [];
        dbData.productImages = dbData.productImages || [];
        // No field migrations needed since these tables were introduced in version 10
      }

      // Set dbVersion to current version (10)
      dbData.dbVersion = { version: 10 };

      const dbManager = DatabaseManager.getInstance();
      const db = dbManager.getDatabase();
      try {
        await db.withTransactionAsync(async () => {
          // Clear existing tables
          await db.execAsync(`
            DELETE FROM events;
            DELETE FROM event_types;
            DELETE FROM users;
            DELETE FROM roles;
            DELETE FROM wallets;
            DELETE FROM products;
            DELETE FROM purchases;
            DELETE FROM productImages;
            DELETE FROM db_version;
          `);

          // Drop existing transactions_<userId> tables
          const tables = await db.getAllAsync<{ name: string }>(
            "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'transactions_%';"
          );
          for (const table of tables) {
            await db.execAsync(`DROP TABLE IF EXISTS ${table.name};`);
          }

          // Insert roles
          for (const role of dbData.roles || []) {
            await db.runAsync(
              "INSERT INTO roles (role_id, role_name) VALUES (?, ?);",
              [role.role_id, role.role_name]
            );
          }

          // Insert users
          for (const user of dbData.users || []) {
            await db.runAsync(
              `INSERT INTO users (id, name, role_id, code, is_active, created_at, updated_at, icon, email, phone)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
              [
                user.id,
                user.name,
                user.role_id,
                user.code,
                user.is_active ?? 1,
                user.created_at || new Date().toISOString(),
                user.updated_at || new Date().toISOString(),
                user.icon || null,
                user.email || "",
                user.phone || "",
              ]
            );
          }

          // Insert event_types
          for (const type of dbData.eventTypes || []) {
            await db.runAsync(
              `INSERT INTO event_types (name, icon, iconColor, availability, owner, weight, expiration_date, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
              [
                type.name,
                type.icon || "event",
                type.iconColor || "#000000",
                type.availability || 0,
                type.owner || null,
                type.weight || 1,
                type.expiration_date || null,
                type.created_at || null,
              ]
            );
          }

          // Insert events
          for (const event of dbData.events || []) {
            await db.runAsync(
              `INSERT INTO events (id, date, markedAt, eventType, owner, note, photoPath, created_by, is_verified, verified_at, verified_by)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
              [
                event.id,
                event.date,
                event.markedAt,
                event.eventType || event.event_type,
                event.owner || null,
                event.note || null,
                event.photoPath || null,
                event.created_by,
                event.is_verified ? 1 : 0,
                event.verified_at || null,
                event.verified_by || null,
              ]
            );
          }

          // Insert wallets
          if (dbData.wallets) {
            for (const wallet of dbData.wallets) {
            await db.runAsync(
              `INSERT INTO wallets (owner, assets, credit) VALUES (?, ?, ?);`,
                [wallet.owner, wallet.assets || 5, wallet.credit || 100]
            );
          }
          }

          // Restore transactions_<userId> tables for non-Guest users
          const nonGuestUsers = (dbData.users || []).filter(
            (user: any) => user.name !== "Guest"
          );
          for (const user of nonGuestUsers) {
            const tableName = `transactions_${user.id}`;
            await db.execAsync(`
              CREATE TABLE IF NOT EXISTS ${tableName} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                reason TEXT,
                amount INTEGER,
                counterparty INTEGER,
                timestamp TEXT,
                balance INTEGER,
                FOREIGN KEY (counterparty) REFERENCES users(id)
              );
            `);
            if (dbData[tableName]) {
              for (const transaction of dbData[tableName]) {
                await db.runAsync(
                  `INSERT INTO ${tableName} (id, reason, amount, counterparty, timestamp, balance)
                   VALUES (?, ?, ?, ?, ?, ?);`,
                  [
                    transaction.id,
                    transaction.reason || null,
                    transaction.amount || null,
                    transaction.counterparty || null,
                    transaction.timestamp || null,
                    transaction.balance || null,
                  ]
                );
              }
            }
          }

          // Insert products (after users for creator foreign key)
          for (const product of dbData.products || []) {
            await db.runAsync(
              `INSERT INTO products (id, name, description, images, price, creator, online, quantity, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
               [
                product.id || null,
                product.name,
                product.description || null,
                product.images || null,
                product.price,
                product.creator,
                product.online || 0,
                product.quantity || 0,
                product.createdAt || new Date().toISOString(),
                product.updatedAt || null,
              ]
            );
          }

          // Insert purchases (after products and users for foreign keys)
          for (const purchase of dbData.purchases || []) {
            await db.runAsync(
              `INSERT INTO purchases (order_number, product_id, owner, price, quantity, createdAt, fulfilledAt, productName, description, images, fulfilledBy)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
               [
                purchase.order_number,
                purchase.product_id,
                purchase.owner,
                purchase.price,
                purchase.quantity,
                purchase.createdAt || new Date().toISOString(),
                purchase.fulfilledAt || null,
                purchase.productName || null,
                purchase.description || null,
                purchase.images || null,
                purchase.fulfilledBy || null,
              ]
            );
          }

          // Insert productImages
          for (const image of dbData.productImages || []) {
            await db.runAsync(
              `INSERT INTO productImages (id, referred) VALUES (?, ?);`,
              [image.id, image.referred]
            );
          }

          // Insert db_version
          await db.runAsync(
            `INSERT OR REPLACE INTO db_version (version) VALUES (?);`,
            [10]
          );
        });
      } catch (error: any) {
        console.error("Database restore error:", error);
        Alert.alert("Error", `${t("errorRestoreDB")}: ${error.message}`);
        throw error;
      }

      // Restore photos
      await FileSystem.deleteAsync(photosDir, { idempotent: true });
      await FileSystem.makeDirectoryAsync(photosDir, { intermediates: true });
      const photoFiles = Object.keys(zip.files).filter(
        (name) => name.startsWith("photos/") && !name.endsWith("/")
      );
      for (const fileName of photoFiles) {
        const fileContent = await zip.file(fileName)!.async("base64");
        const destPath = `${photosDir}${fileName.split("/").pop()}`;
        await FileSystem.writeAsStringAsync(destPath, fileContent, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      // Restore icons
      await FileSystem.deleteAsync(iconsDir, { idempotent: true });
      await FileSystem.makeDirectoryAsync(iconsDir, { intermediates: true });
      const iconFiles = Object.keys(zip.files).filter(
        (name) => name.startsWith("icons/") && !name.endsWith("/")
      );
      for (const fileName of iconFiles) {
        const fileContent = await zip.file(fileName)!.async("base64");
        const destPath = `${iconsDir}${fileName.split("/")[1]}`;
        await FileSystem.writeAsStringAsync(destPath, fileContent, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      // Restore products images
      await FileSystem.deleteAsync(productsDir, { idempotent: true });
      await FileSystem.makeDirectoryAsync(productsDir, { intermediates: true });
      const productFiles = Object.keys(zip.files).filter(
        (name) => name.startsWith("products/") && !name.endsWith("/")
      );
      for (const fileName of productFiles) {
        const fileContent = await zip.file(fileName)!.async("base64");
        const destPath = `${productsDir}${fileName.split("/")[1]}`;
        await FileSystem.writeAsStringAsync(destPath, fileContent, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      // Clean up temp directory
      await FileSystem.deleteAsync(tempDir, { idempotent: true });

      Alert.alert(t("success"), t("restoreComplete"), [
        {
          text: t("ok"),
          onPress: () => {
            onClose();
            Alert.alert(t("info"), t("restartApp"), [{ text: t("ok") }]);
          },
        },
      ]);
    } catch (error: any) {
      console.error("Restore error:", error);
      Alert.alert("Error", `${t("errorRestore")}: ${error.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const renderBackupFile = ({ item }: { item: string }) => (
    <TouchableOpacity onPress={() => setSelectedFile(item)}>
      <YStack
        p="$2"
        borderBottomWidth={1}
        borderBottomColor="$border"
        bg={selectedFile === item ? "$selectedBackground" : undefined}
      >
        <Text fontSize="$3" color="$text">
          {item}
        </Text>
      </YStack>
    </TouchableOpacity>
  );

  return (
    <YStack p="$4" ai="center" bg="$modalBackground" w="90%">
      <Text fontSize="$5" fontWeight="bold" mb="$4" color="$text">
        {t("restoreData")}
      </Text>
      {backupFiles.length > 0 ? (
        <FlatList
          data={backupFiles}
          renderItem={renderBackupFile}
          keyExtractor={(item) => item}
          style={{ width: "100%", maxHeight: 200, marginBottom: 20 }}
        />
      ) : (
        <Text fontSize="$3" color="$gray" mb="$4">
          {t("noBackupFiles")}
        </Text>
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
    </YStack>
  );
};

export default RestoreData;
