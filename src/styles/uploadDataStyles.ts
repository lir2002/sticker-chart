import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  loader: {
    marginVertical: 20,
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