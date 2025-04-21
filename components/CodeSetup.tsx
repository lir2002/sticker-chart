import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface CodeSetupProps {
  onCodeSet: () => void;
}

const CodeSetup: React.FC<CodeSetupProps> = ({ onCodeSet }) => {
  const [code, setCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");

  const handleSetCode = async () => {
    if (!code.match(/^\d{4}$/)) {
      Alert.alert("Error", "Please enter a 4-digit code.");
      return;
    }
    if (code !== confirmCode) {
      Alert.alert("Error", "Codes do not match.");
      return;
    }

    try {
      await AsyncStorage.setItem("verificationCode", code);
      await AsyncStorage.setItem("isCodeSet", "true");
      onCodeSet();
    } catch (error) {
      console.error("Error saving code:", error);
      Alert.alert("Error", "Failed to save code.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set Your 4-Digit Verification Code</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter 4-digit code"
        keyboardType="numeric"
        maxLength={4}
        value={code}
        onChangeText={setCode}
        secureTextEntry // Mask input
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm 4-digit code"
        keyboardType="numeric"
        maxLength={4}
        value={confirmCode}
        onChangeText={setConfirmCode}
        secureTextEntry // Mask input
      />
      <Button title="Set Code" onPress={handleSetCode} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginVertical: 10,
    borderRadius: 5,
    fontSize: 16,
  },
});

export default CodeSetup;