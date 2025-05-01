import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginVertical: 10,
    borderRadius: 5,
    fontSize: 16,
    width: "100%",
  },
  typeItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  icon: {
    marginRight: 10,
  },
  typeText: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "80%",
    alignItems: "center",
    position: "relative",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  iconLabel: {
    fontSize: 16,
    marginVertical: 10,
    alignSelf: "flex-start",
  },
  iconPicker: {
    flexGrow: 0,
    marginBottom: 10,
  },
  iconOption: {
    padding: 10,
  },
  selectedIconOption: {
    backgroundColor: "#e0f0ff",
    borderRadius: 5,
  },
  colorPicker: {
    flexGrow: 0,
    marginBottom: 10,
  },
  colorOption: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginHorizontal: 5,
  },
  selectedColorOption: {
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  buttonContainer: {
    width: "100%",
    marginTop: 10,
  },
  buttonContainerOk: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
  },
  picker: {
    width: "100%",
    marginBottom: 10,
  },
  faceValueLabel: {
    fontSize: 16,
    marginBottom: 5,
    alignSelf: "flex-start",
  },
  userIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  largeUserIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  eventTypeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  leftContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  weightText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007AFF",
    marginRight: 10,
  },
  eventTypeText: {
    fontSize: 16,
    color: "#333",
  },
  ownerText: {
    fontSize: 14,
    color: "#666",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 20,
  },
  userItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
  },
  userNameText: {
    fontSize: 16,
    marginLeft: 10,
  },
  walletInfo: {
    fontSize: 16,
    color: "#333",
    marginBottom: 10,
  },
});