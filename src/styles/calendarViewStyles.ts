import { Dimensions, StyleSheet } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");


export const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: "#fff",
    },
    titleContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
    },
    icon: {
      marginRight: 10,
    },
    leftContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    weightText: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#666",
    },
    achievementCountText: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#666",
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
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 10,
    },
    input: {
      borderWidth: 1,
      borderColor: "#ccc",
      padding: 10,
      marginVertical: 10,
      borderRadius: 5,
      width: "100%",
      fontSize: 16,
    },
    charCount: {
      fontSize: 12,
      color: "#666",
      alignSelf: "flex-end",
      marginBottom: 10,
    },
    photoButtonContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
      marginBottom: 10,
    },
    photoButton: {
      backgroundColor: "#007AFF",
      padding: 10,
      borderRadius: 5,
      flex: 1,
      marginHorizontal: 5,
      alignItems: "center",
    },
    photoButtonText: {
      color: "#fff",
      fontSize: 14,
    },
    photoPreview: {
      width: 100,
      height: 100,
      borderRadius: 5,
      marginBottom: 10,
    },
    buttonContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
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
      marginBottom: 15,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: "#eee",
    },
    eventHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 5,
    },
    eventText: {
      fontSize: 14,
      marginBottom: 5,
    },
    noEventText: {
      fontSize: 14,
      color: "#666",
      textAlign: "center",
      marginBottom: 10,
    },
    maxAchievementsText: {
      fontSize: 14,
      color: "#666",
      textAlign: "center",
      marginTop: 10,
    },
    markButton: {
      backgroundColor: "#007AFF",
      padding: 10,
      borderRadius: 5,
      alignItems: "center",
    },
    markButtonText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "bold",
    },
    eventPhoto: {
      width: 100,
      height: 100,
      borderRadius: 5,
      marginTop: 10,
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
    actionButtons: {
      flexDirection: "row",
    },
    actionButton: {
      marginLeft: 10,
      backgroundColor: "#007AFF",
      padding: 5,
      borderRadius: 5,
    },
    actionButtonText: {
      color: "#fff",
      fontSize: 12,
    },
  });