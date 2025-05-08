import React from "react";
import { Button, Input, styled, Text } from "tamagui";

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
  <Button
    w="66.67%"
    alignSelf="center"
    my="$3" // ~12px, slightly adjusted from 10px to align with token scale
    bg={disabled ? "$lightGray" : "$secondary"} // #6A5ACD mapped to $secondary
    h={40} // Matches approximate height of native Button
    borderRadius="$1" // ~4px, subtle rounding to match native Button
    disabled={disabled}
    onPress={onPress}
    unstyled={false}
  >
    <Text
      // fontSize="$3" // ~16px, typical for button text
      color="$background" // White text for contrast
      textTransform="uppercase" // Matches native Button uppercase text
      textAlign="center" // Ensures text is centered
      fontWeight="600"
    >
      {title}
    </Text>
  </Button>
);

export const StyledInput = styled(Input, {
  borderWidth: 1,
  borderColor: "#ccc",
  paddingHorizontal: 10,
  paddingVertical: 8, // Reduced to allow more text area within height
  marginVertical: 10,
  borderRadius: 5,
  fontSize: 16,
  height: 48, // Increased to accommodate text and padding
  lineHeight: 20, // Set to match fontSize and ensure text fits
  color: "#333",
  placeholderTextColor: "#999",
  backgroundColor: "#fff",
  width: "100%",
  textAlignVertical: "center", // Ensure text is vertically centered
});
