import { Dimensions, StyleSheet } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: "#fff",
    },
    filterHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    filterSummary: {
      fontSize: 14,
      color: "#333",
      flex: 1,
    },
    achievementCountText: {
      fontSize: 14,
      fontWeight: "bold",
      color: "#666",
      flex: 1,
      textAlign: "center",
    },
    filterButton: {
      flexDirection: "row",
      alignItems: "center",
      padding: 8,
      backgroundColor: "#e0f0ff",
      borderRadius: 5,
    },
    filterButtonText: {
      fontSize: 14,
      color: "#007AFF",
      marginLeft: 5,
    },
    filterList: {
      maxHeight: 150,
    },
    filterItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: "#ccc",
    },
    filterText: {
      fontSize: 14,
      flex: 1,
    },
    filterSectionTitle: {
      fontSize: 16,
      fontWeight: "bold",
      marginTop: 10,
      marginBottom: 5,
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
      maxHeight: "80%",
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 10,
    },
    modalButtonContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 10,
    },
    eventDisplay: {
      marginTop: 20,
      padding: 15,
      backgroundColor: "#f9f9f9",
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "#ccc",
      flex: 1,
    },
    eventScrollView: {
      flexGrow: 1,
    },
    eventTitle: {
      fontSize: 16,
      fontWeight: "bold",
      marginBottom: 10,
    },
    eventItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    eventIcon: {
      marginRight: 10,
    },
    eventText: {
      fontSize: 14,
    },
    verifiedContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    verifiedIcon: {
      marginLeft: 5,
    },
    eventPhoto: {
      width: 100,
      height: 100,
      borderRadius: 5,
      marginTop: 10,
    },
    noEventText: {
      fontSize: 14,
      color: "#666",
      textAlign: "center",
    },
    photoModalContainer: {
      flex: 1,
      backgroundColor: "black",
      justifyContent: "center",
      alignItems: "center",
    },
    fullScreenPhoto: {
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
    },
    closeButton: {
      position: "absolute",
      top: 40,
      right: 20,
      backgroundColor: "rgba(0,0,0,0.5)",
      borderRadius: 20,
      padding: 5,
    },
  });