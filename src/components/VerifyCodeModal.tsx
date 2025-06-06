import React, { useState } from "react";
import { Button, Modal, TouchableOpacity } from "react-native";
import { YStack, XStack, Text, useTheme } from "tamagui";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { StyledInput } from "./SharedComponents";
import { useLanguage } from "../contexts/LanguageContext";
import { verifyUserCode } from "../db";

interface VerifyCodeModalProps {
  visible: boolean;
  title: string;
  userId: number | null;
  onVerify: () => void;
  onCancel: () => void;
}

const VerifyCodeModal: React.FC<VerifyCodeModalProps> = ({
  visible,
  title,
  userId,
  onVerify,
  onCancel,
}) => {
  const { t } = useLanguage();
  const theme = useTheme();
  const [inputCode, setInputCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!userId) {
      setError(t("noCurrentUser"));
      return;
    }
    try {
      const isValid = await verifyUserCode(userId, inputCode);
      if (isValid) {
        setError(null);
        setInputCode("");
        onVerify();
      } else {
        setError(t("errorIncorrectCode"));
        setInputCode("");
      }
    } catch (error: any) {
      setError(`${t("errorVerifyCode")}: ${error.message}`);
    }
  };

  const handleCancel = () => {
    setInputCode("");
    setError(null);
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <YStack f={1} jc="center" ai="center" bg="$overlay">
        <YStack bg="$modalBackground" p="$4" br="$2" w="80%" ai="center">
          <TouchableOpacity
            onPress={handleCancel}
            style={{ position: "absolute", top: 10, right: 10 }}
          >
            <MaterialIcons name="close" size={24} color={theme.icon.val} />
          </TouchableOpacity>
          <Text fontSize="$4" fontWeight="bold" mb="$2" color="$text">
            {title}
          </Text>
          <StyledInput
            placeholder={t("codePlaceholder")}
            keyboardType="numeric"
            maxLength={4}
            value={inputCode}
            onChangeText={(text) => {
              if (text.match(/^\d*$/)) {
                setInputCode(text);
                setError(null);
              }
            }}
            secureTextEntry
            autoFocus
          />
          {error && (
            <Text fontSize="$3" color="$red" mt="$2">
              {error}
            </Text>
          )}
          <XStack jc="space-between" w="60%" mt="$2" gap="$3">
            <Button title={t("cancel")} onPress={handleCancel} />
            <Button
              title={t("verify")}
              onPress={handleVerify}
              disabled={inputCode.length !== 4}
            />
          </XStack>
        </YStack>
      </YStack>
    </Modal>
  );
};

export default VerifyCodeModal;
