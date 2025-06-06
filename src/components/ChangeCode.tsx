import React, { useState, useContext } from "react";
import { Alert } from "react-native";
import { YStack, Text, XStack } from "tamagui";
import { useLanguage } from "../contexts/LanguageContext";
import { UserContext } from "../contexts/UserContext";
import { verifyUserCode, updateUserCode } from "../db";
import { CustomButton, StyledInput } from "./SharedComponents";

interface ChangeCodeProps {
  onCodeChanged: () => void;
  onCancel: () => void;
}

const ChangeCode: React.FC<ChangeCodeProps> = ({ onCodeChanged, onCancel }) => {
  const { t } = useLanguage();
  const { currentUser } = useContext(UserContext);
  const [oldCode, setOldCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [confirmNewCode, setConfirmNewCode] = useState("");

  const handleChangeCode = async () => {
    if (!currentUser) {
      Alert.alert(t("error"), t("errorNoUser"));
      return;
    }

    const isValidOldCode = await verifyUserCode(currentUser.id, oldCode);
    if (!isValidOldCode) {
      Alert.alert(t("error"), t("errorIncorrectOldCode"));
      return;
    }

    if (!newCode.match(/^\d{4}$/)) {
      Alert.alert(t("error"), t("errorInvalidNewCode"));
      return;
    }

    if (newCode !== confirmNewCode) {
      Alert.alert(t("error"), t("errorCodesDoNotMatch"));
      return;
    }

    try {
      await updateUserCode(currentUser.id, newCode);
      Alert.alert(t("success"), t("successUpdateCode"));
      onCodeChanged();
    } catch (error) {
      console.error("Error updating code:", error);
      Alert.alert(t("error"), t("errorUpdateCode"));
    }
  };

  return (
    <YStack p="$4" ai="center" bg="$modalBackground" w="90%">
      <Text fontSize="$5" fontWeight="bold" mb="$4" ta="center" color="$text">
        {t("changeVerificationCode")}
      </Text>
      <StyledInput
        placeholder={t("enterOldCode")}
        value={oldCode}
        onChangeText={setOldCode}
        keyboardType="numeric"
        maxLength={4}
        secureTextEntry
        autoFocus
      />
      <StyledInput
        placeholder={t("enterNewCode")}
        value={newCode}
        onChangeText={setNewCode}
        keyboardType="numeric"
        maxLength={4}
        secureTextEntry
      />
      <StyledInput
        placeholder={t("confirmNewCode")}
        value={confirmNewCode}
        onChangeText={setConfirmNewCode}
        keyboardType="numeric"
        maxLength={4}
        secureTextEntry
      />
      <XStack jc="center" mt="$4" gap="$3" p="$2" f={1} w="80%">
        <CustomButton title={t("cancel")} onPress={onCancel} />
        <CustomButton title={t("changeCode")} onPress={handleChangeCode} />
      </XStack>
    </YStack>
  );
};

export default ChangeCode;
