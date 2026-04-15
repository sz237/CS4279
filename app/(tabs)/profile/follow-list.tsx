import { auth } from "@/src/config/firebase";
import {
  FriendItem,
  FriendRequest,
  acceptFriendRequest,
  getFriends,
  getPendingRequests,
  rejectFriendRequest,
  removeFriend,
} from "@/src/services/profile";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}

function Avatar({ photoURL, name, size = 48 }: { photoURL: string | null; name: string; size?: number }) {
  const initials = initialsFromName(name || "U");
  if (photoURL) {
    return (
      <Image
        source={{ uri: photoURL }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#EEF2FF",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.35, fontWeight: "600", color: "#6D28D9" }}>
        {initials}
      </Text>
    </View>
  );
}

function SectionLabel({ title }: { title: string }) {
  return (
    <Text className="text-xs font-bold text-gray-500 uppercase tracking-widest px-4 pt-5 pb-2">
      {title}
    </Text>
  );
}

function RequestRow({
  request,
  onAccept,
  onReject,
  busy,
}: {
  request: FriendRequest;
  onAccept: (req: FriendRequest) => void;
  onReject: (fromUid: string) => void;
  busy: boolean;
}) {
  return (
    <View className="flex-row items-center px-4 py-3">
      <Avatar photoURL={request.fromPhotoURL} name={request.fromDisplayName} />

      <View className="ml-3 flex-1">
        <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
          {request.fromDisplayName}
        </Text>
        {!!request.fromUsername && (
          <Text className="text-sm text-gray-400 mt-0.5">@{request.fromUsername}</Text>
        )}
      </View>

      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={() => onReject(request.fromUid)}
          disabled={busy}
          className="px-4 py-2 rounded-full border border-gray-300"
          style={{ opacity: busy ? 0.5 : 1 }}
        >
          <Text className="text-sm font-medium text-gray-500">Deny</Text>
        </Pressable>
        <Pressable
          onPress={() => onAccept(request)}
          disabled={busy}
          className="px-4 py-2 rounded-full"
          style={{ backgroundColor: "#6D28D9", opacity: busy ? 0.5 : 1 }}
        >
          <Text className="text-sm font-semibold text-white">Accept</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FriendRow({
  user,
  onRemove,
  onPress,
}: {
  user: FriendItem;
  onRemove: (uid: string) => void;
  onPress: (uid: string) => void;
}) {
  const confirmRemove = () => {
    Alert.alert(
      "Remove Friend",
      `Remove ${user.displayName} from your friends?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => onRemove(user.uid) },
      ]
    );
  };

  return (
    <Pressable className="flex-row items-center px-4 py-3" onPress={() => onPress(user.uid)}>
      <Avatar photoURL={user.photoURL} name={user.displayName} />

      <View className="ml-3 flex-1">
        <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
          {user.displayName}
        </Text>
        {!!user.username && (
          <Text className="text-sm text-gray-400 mt-0.5">@{user.username}</Text>
        )}
      </View>

      <Pressable
        onPress={confirmRemove}
        hitSlop={8}
        className="px-4 py-2 rounded-full border border-gray-300"
      >
        <Text className="text-sm font-medium text-gray-500">Remove</Text>
      </Pressable>
    </Pressable>
  );
}

export default function FriendsListScreen() {
  const router = useRouter();
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async (showSpinner = false) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    if (showSpinner) setLoading(true);
    try {
      const [friendsList, requestsList] = await Promise.all([
        getFriends(uid),
        getPendingRequests(uid),
      ]);
      setFriends(friendsList);
      setRequests(requestsList);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    // Show spinner only on the very first load; silent refresh when returning
    load(!hasLoadedRef.current);
    hasLoadedRef.current = true;
  }, [load]));

  const handleAccept = async (req: FriendRequest) => {
    setBusyUid(req.fromUid);
    try {
      await acceptFriendRequest(req);
      setRequests((prev) => prev.filter((r) => r.fromUid !== req.fromUid));
      const uid = auth.currentUser?.uid;
      if (uid) setFriends(await getFriends(uid));
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Could not accept request.");
    } finally {
      setBusyUid(null);
    }
  };

  const handleReject = async (fromUid: string) => {
    setBusyUid(fromUid);
    try {
      await rejectFriendRequest(fromUid);
      setRequests((prev) => prev.filter((r) => r.fromUid !== fromUid));
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Could not decline request.");
    } finally {
      setBusyUid(null);
    }
  };

  const handleRemove = async (friendUid: string) => {
    try {
      await removeFriend(friendUid);
      setFriends((prev) => prev.filter((f) => f.uid !== friendUid));
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Could not remove friend.");
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-400 text-sm">Loading…</Text>
      </View>
    );
  }

  const isEmpty = friends.length === 0 && requests.length === 0;

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* ── Friend Requests ── */}
      {requests.length > 0 && (
        <View className="bg-white mb-3 border-b border-gray-100">
          <SectionLabel title="Friend Requests" />
          {requests.map((req, index) => (
            <View key={req.fromUid}>
              {index > 0 && <View className="h-px bg-gray-100 mx-4" />}
              <RequestRow
                request={req}
                onAccept={handleAccept}
                onReject={handleReject}
                busy={busyUid === req.fromUid}
              />
            </View>
          ))}
          <View className="h-2" />
        </View>
      )}

      {/* ── Friends ── */}
      <View className="bg-white border-b border-gray-100">
        <SectionLabel title="Friends" />
        {friends.length === 0 ? (
          <View className="items-center py-10 gap-3">
            <Ionicons name="people-outline" size={40} color="#D1D5DB" />
            <Text className="text-sm text-gray-400 text-center px-8">
              No friends yet. Search for users to send a friend request!
            </Text>
          </View>
        ) : (
          friends.map((friend, index) => (
            <View key={friend.uid}>
              {index > 0 && <View className="h-px bg-gray-100 mx-4" />}
              <FriendRow
                user={friend}
                onRemove={handleRemove}
                onPress={(uid) => router.push(`/(tabs)/profile/user-profile?uid=${uid}` as any)}
              />
            </View>
          ))
        )}
        <View className="h-2" />
      </View>

      {isEmpty && requests.length === 0 && null}
    </ScrollView>
  );
}
