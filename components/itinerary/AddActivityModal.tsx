import React, { useState } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Activity } from "./ActivityCard";

interface AddActivityModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (activity: Omit<Activity, "id">) => void;
}

export default function AddActivityModal({
  visible,
  onClose,
  onAdd,
}: AddActivityModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("");

  const handleAdd = () => {
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      description: description.trim() || "No description",
      time: time.trim() || "TBD",
      duration: duration.trim() || "1 hour",
    });
    setTitle("");
    setDescription("");
    setTime("");
    setDuration("");
    onClose();
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
            <View className="bg-white rounded-t-3xl px-6 pt-4 pb-10">
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
                value={title}
                onChangeText={setTitle}
              />
              <InputField
                label="Description"
                placeholder="e.g. Purple sand beach at sunset"
                value={description}
                onChangeText={setDescription}
              />
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <InputField
                    label="Time"
                    placeholder="e.g. 4:00 PM"
                    value={time}
                    onChangeText={setTime}
                  />
                </View>
                <View className="flex-1">
                  <InputField
                    label="Duration"
                    placeholder="e.g. 2 hours"
                    value={duration}
                    onChangeText={setDuration}
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={handleAdd}
                className="bg-violet-600 rounded-2xl py-4 items-center mt-2"
                activeOpacity={0.85}
              >
                <Text className="text-white font-semibold text-base">
                  Add to Itinerary
                </Text>
              </TouchableOpacity>
            </View>
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