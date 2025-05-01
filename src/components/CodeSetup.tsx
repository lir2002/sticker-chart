import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { useLanguage } from "../contexts/LanguageContext";
import { styles } from "../styles/codeSetupStyles";

interface CodeSetupProps {
  onCodeSet: (code: string) => void;
}

const CodeSetup: React.FC<CodeSetupProps> = ({ onCodeSet }) => {
  const { t } = useLanguage();
  const [code, setCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");

  const handleSetCode = async () => {
    if (!code.match(/^\d{4}$/)) {
      Alert.alert("Error", t("errorInvalidCode"));
      return;
    }
    if (code !== confirmCode) {
      Alert.alert("Error", t("errorCodeMismatch"));
      return;
    }

    try {
      onCodeSet(code);
    } catch (error) {
      console.error("Error saving code:", error);
      Alert.alert("Error", t("errorSetPassword"));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("setAdminPassword")}</Text>
      <TextInput
        style={styles.input}
        placeholder={t("codePlaceholder")}
        keyboardType="numeric"
        maxLength={4}
        value={code}
        onChangeText={setCode}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder={t("confirmCodePlaceholder")}
        keyboardType="numeric"
        maxLength={4}
        value={confirmCode}
        onChangeText={setConfirmCode}
        secureTextEntry
      />
      <Button title={t("setCode")} onPress={handleSetCode} />
    </View>
  );
};

export default CodeSetup;