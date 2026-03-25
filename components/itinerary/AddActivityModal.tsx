import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface ManualStopInput {
  name: string;
  address: string;
  timeLabel: string;
  duration: string;
}

const TIME_OPTIONS = ["Morning", "Noon", "Afternoon", "Evening"] as const;
type TimeOption = (typeof TIME_OPTIONS)[number];

interface AddActivityModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (input: ManualStopInput) => void;
  defaultTimeLabel?: string;
}

export default function AddActivityModal({
  visible,
  onClose,
  onAdd,
  defaultTimeLabel,
}: AddActivityModalProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [timeLabel, setTimeLabel] = useState<TimeOption | "">("");
  const [duration, setDuration] = useState("");

  // Pre-select the time slot when opened from a specific section
  useEffect(() => {
    if (visible && defaultTimeLabel) {
      const match = TIME_OPTIONS.find(
        (o) => o.toLowerCase() === defaultTimeLabel.toLowerCase()
      );
      setTimeLabel(match ?? "");
    }
  }, [visible, defaultTimeLabel]);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      address: address.trim(),
      timeLabel: timeLabel,
      duration: duration.trim(),
    });
    setName("");
    setAddress("");
    setTimeLabel("");
    setDuration("");
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1 justify-end bg-black/40">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <ScrollView
              className="bg-white rounded-t-3xl"
              contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Handle */}
              <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-4" />

              <View className="flex-row items-center justify-between mb-5">
                <Text className="text-xl font-bold text-gray-900">
                  Add Activity
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              {/* Inputs */}
              <InputField
                label="Activity Name *"
                placeholder="e.g. Pfeiffer Beach"
                value={name}
                onChangeText={setName}
              />
              <InputField
                label="Address"
                placeholder="e.g. 1 Scenic Rd, Big Sur, CA"
                value={address}
                onChangeText={setAddress}
              />

              {/* Time of day picker */}
              <View className="mb-4">
                <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Time of Day
                </Text>
                <View className="flex-row gap-2">
                  {TIME_OPTIONS.map((option) => {
                    const isSelected = timeLabel === option;
                    return (
                      <TouchableOpacity
                        key={option}
                        onPress={() => setTimeLabel(isSelected ? "" : option)}
                        activeOpacity={0.75}
                        className={`flex-1 py-2 rounded-xl items-center border ${
                          isSelected
                            ? "bg-violet-600 border-violet-600"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            isSelected ? "text-white" : "text-gray-500"
                          }`}
                        >
                          {option}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <InputField
                label="Duration"
                placeholder="e.g. 2 hours"
                value={duration}
                onChangeText={setDuration}
              />

              <TouchableOpacity
                onPress={handleAdd}
                className="bg-violet-600 rounded-2xl py-4 items-center mt-2"
                activeOpacity={0.85}
              >
                <Text className="text-white font-semibold text-base">
                  Add to Itinerary
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function InputField({
  label,
  placeholder,
  value,
  onChangeText,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
}) {
  return (
    <View className="mb-4">
      <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#D1D5DB"
        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm"
      />
    </View>
  );
}