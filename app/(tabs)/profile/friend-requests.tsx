import { auth } from "@/src/config/firebase";
import {
  FriendRequest,
  acceptFriendRequest,
  getPendingRequests,
  rejectFriendRequest,
} from "@/src/services/profile";
import { UI } from "@/src/theme/ui";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
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
  const initials = initialsFromName(request.fromDisplayName || "U");

  return (
    <View style={{ paddingVertical: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {request.fromPhotoURL ? (
          <Image
            source={{ uri: request.fromPhotoURL }}
            style={{ width: 52, height: 52, borderRadius: 26 }}
          />
        ) : (
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: "#E0E7FF",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "600", color: UI.colors.brand }}>
              {initials}
            </Text>
          </View>
        )}

        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: UI.colors.textPrimary }}>
            {request.fromDisplayName}
          </Text>
          {!!request.fromUsername && (
            <Text style={{ fontSize: 14, color: UI.colors.textSecondary, marginTop: 2 }}>
              @{request.fromUsername}
            </Text>
          )}
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 12, marginLeft: 64 }}>
        <Pressable
          onPress={() => onAccept(request)}
          disabled={busy}
          style={{
            flex: 1,
            backgroundColor: UI.colors.brand,
            borderRadius: 8,
            paddingVertical: 9,
            alignItems: "center",
            opacity: busy ? 0.6 : 1,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>Accept</Text>
        </Pressable>

        <Pressable
          onPress={() => onReject(request.fromUid)}
          disabled={busy}
          style={{
            flex: 1,
            borderRadius: 8,
            paddingVertical: 9,
            alignItems: "center",
            borderWidth: 1,
            borderColor: UI.colors.cardBorder,
            opacity: busy ? 0.6 : 1,
          }}
        >
          <Text style={{ color: UI.colors.textMuted, fontWeight: "500", fontSize: 14 }}>
            Decline
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function FriendRequestsScreen() {
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState<string | null>(null);

  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      setLoading(true);
      const list = await getPendingRequests(uid);
      setRequests(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAccept = async (req: FriendRequest) => {
    setBusyUid(req.fromUid);
    try {
      await acceptFriendRequest(req);
      setRequests((prev) => prev.filter((r) => r.fromUid !== req.fromUid));
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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: UI.colors.pageBg }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: insets.top + 12,
        paddingBottom: 40,
      }}
    >
      <Text
        style={{
          fontSize: UI.type.pageTitle,
          fontWeight: "800",
          color: UI.colors.textPrimary,
          marginBottom: 4,
        }}
      >
        Friend Requests
      </Text>
      <Text
        style={{
          fontSize: UI.type.body,
          color: UI.colors.textSecondary,
          marginBottom: 20,
        }}
      >
        {requests.length > 0
          ? `${requests.length} pending request${requests.length > 1 ? "s" : ""}`
          : "No pending requests"}
      </Text>

      {loading ? (
        <Text style={{ color: UI.colors.textMuted, fontSize: UI.type.body }}>
          Loading…
        </Text>
      ) : requests.length === 0 ? (
        <View style={{ alignItems: "center", marginTop: 48, gap: 12 }}>
          <Ionicons name="person-add-outline" size={48} color="#D1D5DB" />
          <Text style={{ fontSize: 16, color: UI.colors.textMuted, textAlign: "center" }}>
            You're all caught up!{"\n"}No pending friend requests.
          </Text>
        </View>
      ) : (
        <View
          style={{
            backgroundColor: UI.colors.cardBg,
            borderColor: UI.colors.cardBorder,
            borderWidth: 1,
            borderRadius: UI.radius.card,
            paddingHorizontal: 16,
            ...UI.shadow.card,
          }}
        >
          {requests.map((req, index) => (
            <View key={req.fromUid}>
              <RequestRow
                request={req}
                onAccept={handleAccept}
                onReject={handleReject}
                busy={busyUid === req.fromUid}
              />
              {index < requests.length - 1 && (
                <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
