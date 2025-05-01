import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { UserContext } from '../contexts/UserContext';
import { verifyUserCode, updateUserCode } from '../db/database';

interface ChangeCodeProps {
  onCodeChanged: () => void;
  onCancel: () => void;
}

const ChangeCode: React.FC<ChangeCodeProps> = ({ onCodeChanged, onCancel }) => {
  const { t } = useLanguage();
  const { currentUser } = useContext(UserContext);
  const [oldCode, setOldCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [confirmNewCode, setConfirmNewCode] = useState('');

  const handleChangeCode = async () => {
    if (!currentUser) {
      Alert.alert(t('error'), t('errorNoUser'));
      return;
    }

    const isValidOldCode = await verifyUserCode(currentUser.id, oldCode);
    if (!isValidOldCode) {
      Alert.alert(t('error'), t('errorIncorrectOldCode'));
      return;
    }

    if (!newCode.match(/^\d{4}$/)) {
      Alert.alert(t('error'), t('errorInvalidNewCode'));
      return;
    }

    if (newCode !== confirmNewCode) {
      Alert.alert(t('error'), t('errorCodesDoNotMatch'));
      return;
    }

    try {
      await updateUserCode(currentUser.id, newCode);
      Alert.alert(t('success'), t('successUpdateCode'));
      onCodeChanged();
    } catch (error) {
      console.error('Error updating code:', error);
      Alert.alert(t('error'), t('errorUpdateCode'));
    }
  };

  return (
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>{t('changeVerificationCode')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('enterOldCode')}
        keyboardType="numeric"
        maxLength={4}
        value={oldCode}
        onChangeText={setOldCode}
        secureTextEntry
        autoFocus
      />
      <TextInput
        style={styles.input}
        placeholder={t('enterNewCode')}
        keyboardType="numeric"
        maxLength={4}
        value={newCode}
        onChangeText={setNewCode}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder={t('confirmNewCode')}
        keyboardType="numeric"
        maxLength={4}
        value={confirmNewCode}
        onChangeText={setConfirmNewCode}
        secureTextEntry
      />
      <View style={styles.buttonContainer}>
        <Button title={t('cancel')} onPress={onCancel} />
        <Button title={t('changeCode')} onPress={handleChangeCode} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
    alignSelf: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginVertical: 10,
    borderRadius: 5,
    width: '100%',
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
});

export default ChangeCode;