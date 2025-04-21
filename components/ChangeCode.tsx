import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ChangeCodeProps {
  currentCode: string;
  onCodeChanged: () => void;
  onCancel: () => void;
}

const ChangeCode: React.FC<ChangeCodeProps> = ({ currentCode, onCodeChanged, onCancel }) => {
  const [oldCode, setOldCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [confirmNewCode, setConfirmNewCode] = useState("");

  const handleChangeCode = async () => {
    if (oldCode !== currentCode) {
      Alert.alert("Error", "Incorrect old code.");
      return;
    }
    if (!newCode.match(/^\d{4}$/)) {
      Alert.alert("Error", "New code must be 4 digits.");
      return;
    }
    if (newCode !== confirmNewCode) {
      Alert.alert("Error", "New codes do not match.");
      return;
    }

    try {
      await AsyncStorage.setItem("verificationCode", newCode);
      Alert.alert("Success", "Verification code updated.");
      onCodeChanged();
    } catch (error) {
      console.error("Error updating code:", error);
      Alert.alert("Error", "Failed to update code.");
    }
  };

  return (
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Change Verification Code</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter old 4-digit code"
        keyboardType="numeric"
        maxLength={4}
        value={oldCode}
        onChangeText={setOldCode}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="Enter new 4-digit code"
        keyboardType="numeric"
        maxLength={4}
        value={newCode}
        onChangeText={setNewCode}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm new 4-digit code"
        keyboardType="numeric"
        maxLength={4}
        value={confirmNewCode}
        onChangeText={setConfirmNewCode}
        secureTextEntry
      />
      <View style={styles.buttonContainer}>
        <Button title="Cancel" onPress={onCancel} />
        <Button title="Change Code" onPress={handleChangeCode} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
});

export default ChangeCode;