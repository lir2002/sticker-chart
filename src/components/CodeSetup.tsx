import React, { useState } from "react";
import { Alert } from "react-native";
import { YStack, Text, styled, useTheme } from "tamagui";
import { useLanguage } from "../contexts/LanguageContext";
import { CustomButton, StyledInput } from "./SharedComponents";

interface CodeSetupProps {
  onCodeSet: (code: string) => void;
}

// Styled components for layout
const Container = styled(YStack, {
  flex: 1,
  p: "$4",
  jc: "center",
  bg: "$modalBackground",
});

const Title = styled(Text, {
  fontSize: "$5",
  fontWeight: "bold",
  ta: "center",
  mb: "$4",
  color: "$text",
});

const CodeSetup: React.FC<CodeSetupProps> = ({ onCodeSet }) => {
  const { t } = useLanguage();
  const theme = useTheme();
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
    <Container>
      <Title>{t("setAdminPassword")}</Title>
      <StyledInput
        placeholder={t("codePlaceholder")}
        value={code}
        onChangeText={setCode}
        keyboardType="numeric"
        maxLength={4}
        secureTextEntry
        autoFocus
      />
      <StyledInput
        placeholder={t("confirmCodePlaceholder")}
        value={confirmCode}
        onChangeText={setConfirmCode}
        keyboardType="numeric"
        maxLength={4}
        secureTextEntry
      />
      <CustomButton onPress={handleSetCode} title={t("setCode")} />
    </Container>
  );
};

export default CodeSetup;
