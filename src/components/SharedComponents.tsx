import React from 'react';
import { View, Button, StyleSheet } from 'react-native';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  disabled,
}) => (
  <View style={styles.customButtonContainer}>
    <Button
      title={title}
      onPress={onPress}
      color="#6A5ACD"
      disabled={disabled}
    />
  </View>
);

const styles = StyleSheet.create({
  customButtonContainer: {
    width: '66.67%',
    alignSelf: 'center',
    marginVertical: 10,
  },
});