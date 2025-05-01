import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList, Transaction } from "../types";
import { fetchTransactions } from "../db/database";
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

  useEffect(() => {
    navigation.setOptions({
      title: t("transactionHistory"),
    });
  }, [navigation, t]);

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const userTransactions = await fetchTransactions(userId);
        setTransactions(userTransactions);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      }
    };
    loadTransactions();
  }, [userId]);

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionText}>
          {t("reason")}: {item.reason || t("unknown")}
        </Text>
        <Text style={styles.transactionText}>
          {t("amount")}: {item.amount !== null ? item.amount : t("unknown")}
        </Text>
        <Text style={styles.transactionText}>
          {t("counterparty")}: {item.counterparty || t("unknown")}
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
      {transactions.length === 0 ? (
        <Text style={styles.emptyText}>{t("noTransactions")}</Text>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id.toString()}
        />
      )}
    </View>
  );
};

export default TransactionHistory;