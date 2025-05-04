import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 16,
  },
  transactionItem: {
    backgroundColor: "#fff",
    padding: 16,
    marginVertical: 4,
    marginHorizontal: 16,
    borderRadius: 8,
    elevation: 2,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionText: {
    fontSize: 16,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 32,
    color: "#666",
  },
  loader: {
    marginTop: 32,
  },
  claimButton: {
    backgroundColor: "#007AFF",
    padding: 12,
    margin: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  claimButtonDisabled: {
    backgroundColor: "#ccc",
  },
  claimButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});