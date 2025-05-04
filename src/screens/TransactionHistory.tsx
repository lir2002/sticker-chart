import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList, Transaction } from "../types";
import {
  fetchTransactions,
  getWallet,
  updateWallet,
  insertTransaction,
  getUserById, // New helper function
} from "../db/database";
import { useLanguage } from "../contexts/LanguageContext";
import { styles } from "../styles/transactionHistoryStyles";

type TransactionHistoryProps = NativeStackScreenProps<
  RootStackParamList,
  "TransactionHistory"
>;

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  navigation,
  route,
}) => {
  const { userId } = route.params;
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasClaimedDaily, setHasClaimedDaily] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: t("transactionHistory"),
    });
  }, [navigation, t]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Check if user is admin
        const user = await getUserById(userId);
        const isAdminUser = user?.role_id === 1; // Assuming role_id 1 is Admin
        setIsAdmin(isAdminUser);

        // Load transactions
        const userTransactions = await fetchTransactions(userId);
        setTransactions(userTransactions);

        // Check if daily allowance was claimed today
        if (isAdminUser) {
          const hasClaimed = await checkDailyAllowanceClaimed(
            userId,
            userTransactions
          );
          setHasClaimedDaily(hasClaimed);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        Alert.alert(t("error"), `${t("errorLoadData")}: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [userId, t]);

  function formatNumber(num: number) :string {
    return num.toLocaleString(undefined, { signDisplay: "always" });
  }

  // Helper to check if daily allowance was claimed today
  const checkDailyAllowanceClaimed = async (
    userId: number,
    transactions: Transaction[]
  ): Promise<boolean> => {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    ).toISOString();
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999
    ).toISOString();

    return transactions.some(
      (tx) =>
        tx.counterparty === userId &&
        tx.amount === 5 &&
        tx.reason === t("dailyAllowance") &&
        tx.timestamp &&
        tx.timestamp >= startOfDay &&
        tx.timestamp <= endOfDay
    );
  };

  // Handle claiming daily allowance
  const handleClaimDailyAllowance = async () => {
    setIsClaiming(true);
    try {
      // Get current wallet
      const wallet = await getWallet(userId);
      if (!wallet) {
        throw new Error("Wallet not found");
      }

      // Update assets
      const newAssets = wallet.assets + 5;
      await updateWallet(userId, newAssets, wallet.credit);

      // Insert transaction
      const timestamp = new Date().toISOString();
      await insertTransaction(
        userId,
        t("dailyAllowance"), // "每日用例" or "Daily Allowance"
        5,
        userId, // Counterparty is self
        timestamp,
        newAssets
      );

      // Refresh transactions
      const updatedTransactions = await fetchTransactions(userId);
      setTransactions(updatedTransactions);
      setHasClaimedDaily(true);

      Alert.alert(t("success"), t("dailyAllowanceClaimed"));
    } catch (error) {
      console.error("Error claiming daily allowance:", error);
      Alert.alert(t("error"), `${t("errorClaimDaily")}: ${error.message}`);
    } finally {
      setIsClaiming(false);
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionText}>
          {t("reason")}: {item.reason || t("unknown")}
        </Text>
        <Text style={styles.transactionText}>
          {t("amount")}: {item.amount !== null ? formatNumber(item.amount) : t("unknown")}
        </Text>
        <Text style={styles.transactionText}>
          {t("counterparty")}:{" "}
          {item.counterpartyName || item.counterparty || t("unknown")}
        </Text>
        <Text style={styles.transactionText}>
          {t("timestamp")}: {item.timestamp || t("unknown")}
        </Text>
        <Text style={styles.transactionText}>
          {t("balance")}: {item.balance !== null ? item.balance : t("unknown")}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>{t("transactionHistory")}</Text>
      </View>
      {isLoading ? (
        <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
      ) : (
        <>
          {isAdmin && (
            <TouchableOpacity
              style={[
                styles.claimButton,
                hasClaimedDaily && styles.claimButtonDisabled,
              ]}
              onPress={handleClaimDailyAllowance}
              disabled={hasClaimedDaily || isClaiming}
            >
              {isClaiming ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.claimButtonText}>
                  {t("claimDailyAllowance")}
                </Text>
              )}
            </TouchableOpacity>
          )}
          {transactions.length === 0 ? (
            <Text style={styles.emptyText}>{t("noTransactions")}</Text>
          ) : (
            <FlatList
              data={transactions}
              renderItem={renderTransaction}
              keyExtractor={(item) => item.id.toString()}
            />
          )}
        </>
      )}
    </View>
  );
};

export default TransactionHistory;
