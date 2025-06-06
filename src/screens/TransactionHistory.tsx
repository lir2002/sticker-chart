import React, { useState, useEffect, useContext } from "react";
import {
  Alert,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList, Transaction } from "../types";
import {
  fetchTransactions,
  getWallet,
  updateWallet,
  insertTransaction,
} from "../db";
import { useLanguage } from "../contexts/LanguageContext";
import { YStack, XStack, Text, useTheme } from "tamagui";
import { UserContext } from "../contexts/UserContext";

type TransactionHistoryProps = NativeStackScreenProps<
  RootStackParamList,
  "TransactionHistory"
>;

const commonTextProps = {
  fontSize: "$4",
  mb: "$1",
  color: "$text",
};

// Reusable TransactionItem component
const TransactionItem: React.FC<{
  item: Transaction;
  t: (key: string) => string;
}> = ({ item, t }) => {
  const formatNumber = (num: number): string =>
    num.toLocaleString(undefined, { signDisplay: "always" });

  return (
    <YStack bg="$background" p="$4" my="$1" mx="$4" br="$2" elevation={2}>
      <Text {...commonTextProps}>
        {t("reason")}: {item.reason || t("unknown")}
      </Text>
      <Text {...commonTextProps}>
        {t("amount")}:{" "}
        {item.amount !== null ? formatNumber(item.amount) : t("unknown")}
      </Text>
      <Text {...commonTextProps}>
        {t("counterparty")}:{" "}
        {item.counterpartyName || item.counterparty || t("unknown")}
      </Text>
      <Text {...commonTextProps}>
        {t("timestamp")}: {item.timestamp || t("unknown")}
      </Text>
      <Text {...commonTextProps}>
        {t("balance")}: {item.balance !== null ? item.balance : t("unknown")}
      </Text>
    </YStack>
  );
};

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  navigation,
}) => {
  const { currentUser } = useContext(UserContext);
  const { t } = useLanguage();
  const theme = useTheme();
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
        const isAdminUser = currentUser?.role_id === 1;
        setIsAdmin(isAdminUser);

        const userTransactions = await fetchTransactions(currentUser?.id || 0);
        setTransactions(userTransactions);

        if (isAdminUser) {
          const hasClaimed = await checkDailyAllowanceClaimed(userTransactions);
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
  }, []);

  const checkDailyAllowanceClaimed = async (
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

    if (currentUser)
      return transactions.some(
        (tx) =>
          tx.counterparty === currentUser.id &&
          tx.amount === 5 &&
          tx.timestamp &&
          tx.timestamp >= startOfDay &&
          tx.timestamp <= endOfDay
      );
    return false;
  };

  const handleClaimDailyAllowance = async () => {
    if (!currentUser) {
      Alert.alert(t("error"), t("notLoggedIn"));
      return;
    }
    setIsClaiming(true);
    try {
      const wallet = await getWallet(currentUser.id);
      if (!wallet) {
        throw new Error("Wallet not found");
      }

      const newAssets = wallet.assets + 5;
      await updateWallet(currentUser.id, newAssets, wallet.credit);

      const timestamp = new Date().toISOString();
      await insertTransaction(
        currentUser.id,
        t("dailyAllowance"),
        5,
        currentUser.id,
        timestamp,
        newAssets
      );

      const updatedTransactions = await fetchTransactions(currentUser.id);
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

  return (
    <YStack f={1} bg="$lightGray">
      <XStack
        ai="center"
        p="$4"
        bg="$background"
        borderBottomWidth={1}
        borderBottomColor="$border"
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityLabel={t("goBack")}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.text.val} />
        </TouchableOpacity>
        <Text fontSize="$5" fontWeight="bold" ml="$4" color="$text">
          {t("transactionHistory")}
        </Text>
      </XStack>
      {isLoading ? (
        <ActivityIndicator
          size="large"
          color={theme.primary.val}
          style={{ marginTop: 32 }}
        />
      ) : (
        <>
          {isAdmin && (
            <TouchableOpacity
              onPress={handleClaimDailyAllowance}
              disabled={hasClaimedDaily || isClaiming}
              accessibilityLabel={t("claimDailyAllowance")}
              accessibilityState={{ disabled: hasClaimedDaily || isClaiming }}
            >
              <YStack
                bg={hasClaimedDaily || isClaiming ? "$disabled" : "$primary"}
                p="$3"
                m="$4"
                br="$2"
                ai="center"
                opacity={hasClaimedDaily || isClaiming ? 0.7 : 1}
              >
                {isClaiming ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.modalBackground.val}
                  />
                ) : (
                  <Text
                    color={
                      hasClaimedDaily || isClaiming
                        ? "$gray"
                        : "$modalBackground"
                    }
                    fontSize="$4"
                    fontWeight="bold"
                  >
                    {t("claimDailyAllowance")}
                  </Text>
                )}
              </YStack>
            </TouchableOpacity>
          )}
          {transactions.length === 0 ? (
            <Text fontSize="$4" ta="center" mt="$8" color="$gray">
              {t("noTransactions")}
            </Text>
          ) : (
            <FlatList
              data={transactions}
              renderItem={({ item }) => <TransactionItem item={item} t={t} />}
              keyExtractor={(item) => item.id.toString()}
            />
          )}
        </>
      )}
    </YStack>
  );
};

export default TransactionHistory;
