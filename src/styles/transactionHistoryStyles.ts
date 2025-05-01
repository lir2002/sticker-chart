import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: "#fff",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      marginLeft: 10,
    },
    transactionItem: {
      padding: 15,
      backgroundColor: "#f9f9f9",
      borderRadius: 10,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: "#ccc",
    },
    transactionDetails: {
      flex: 1,
    },
    transactionText: {
      fontSize: 16,
      color: "#333",
      marginBottom: 5,
    },
    emptyText: {
      fontSize: 16,
      color: "#666",
      textAlign: "center",
      marginTop: 20,
    },
  });
  