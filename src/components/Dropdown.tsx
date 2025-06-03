import React, { useState } from "react";
import { FlatList, Modal, TouchableOpacity } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { YStack, Text } from "tamagui";
import { useTheme } from "tamagui";

interface DropdownProps {
  value: string;
  onValueChange: (value: string) => void;
  items: { label: string; value: string }[];
  placeholder: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  value,
  onValueChange,
  items,
  placeholder,
}) => {
  const theme = useTheme();
  const [isModalVisible, setModalVisible] = useState(false);

  const selectedItem = items.find((item) => item.value === value);

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: theme.background.val,
          borderWidth: 1,
          borderColor: theme.border?.val,
          borderRadius: 5,
          padding: 10,
          height: 40,
        }}
      >
        <Text
          flex={1}
          color={selectedItem ? theme.text.val : theme.text.val + "80"}
        >
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
        <MaterialIcons
          name="arrow-drop-down"
          size={24}
          color={theme.icon.val}
        />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => setModalVisible(false)}
        >
          <YStack
            backgroundColor={theme.background.val}
            borderRadius={10}
            width="80%"
            maxHeight="50%"
            padding={10}
          >
            <FlatList
              data={items}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onValueChange(item.value);
                    setModalVisible(false);
                  }}
                  style={{
                    padding: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border?.val + "20",
                  }}
                >
                  <Text color={theme.text.val}>{item.label}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.value}
            />
          </YStack>
        </TouchableOpacity>
      </Modal>
    </>
  );
};