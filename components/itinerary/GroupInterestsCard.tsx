import type { InterestTag } from "@/src/models/trip";
import { UI } from "@/src/theme/ui";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

type Props = {
  interestTags?: InterestTag[];
  currentUid?: string | null;
  onAddInterest?: (label: string) => void;
  onToggleVote?: (tag: InterestTag) => void;
};

function formatInterestLabel(value?: string | null) {
  const safe = (value ?? "").trim();
  if (!safe) return "";

  return safe
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function InterestChip({
  label,
  voteCount,
  isVoted,
  onPress,
}: {
  label: string;
  voteCount: number;
  isVoted?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: isVoted ? "#EEF2FF" : "#F4F4F5",
        borderWidth: isVoted ? 1 : 0,
        borderColor: isVoted ? UI.colors.brand : "transparent",
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: isVoted ? UI.colors.brand : UI.colors.textSecondary,
        }}
      >
        {label}
      </Text>

      <View
        style={{
          minWidth: 20,
          height: 20,
          paddingHorizontal: 6,
          borderRadius: 999,
          backgroundColor: isVoted ? UI.colors.brand : "#E4E4E7",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: isVoted ? "#FFFFFF" : UI.colors.textSecondary,
          }}
        >
          {voteCount}
        </Text>
      </View>
    </Pressable>
  );
}

export function GroupInterestsCard({
  interestTags = [],
  currentUid = null,
  onAddInterest,
  onToggleVote,
}: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [draftInterest, setDraftInterest] = useState("");

  const sortedTags = [...interestTags].sort((a, b) => {
    const aVotes = a.voterUids?.length ?? 0;
    const bVotes = b.voterUids?.length ?? 0;
    if (bVotes !== aVotes) return bVotes - aVotes;
    return a.label.localeCompare(b.label);
  });

  const hasTags = sortedTags.length > 0;
  const topTags = sortedTags.slice(0, 3);

  const summaryText =
    topTags.length > 0
      ? `Your group is most interested in ${topTags
          .map((tag) => formatInterestLabel(tag.label))
          .join(", ")}.`
      : "No interests have been added yet.";

  const handleAdd = () => {
    const value = draftInterest.trim();
    if (!value) return;
    onAddInterest?.(value);
    setDraftInterest("");
    setIsAdding(false);
  };

  return (
    <View style={{ marginTop: UI.spacing.sectionGap }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          color: UI.colors.textPrimary,
          marginBottom: 12,
        }}
      >
        Group Interests
      </Text>

      <View
        style={{
          backgroundColor: UI.colors.cardBg,
          borderColor: UI.colors.cardBorder,
          borderWidth: 1,
          borderRadius: UI.radius.card,
          padding: UI.spacing.cardPadding,
          ...UI.shadow.card,
        }}
      >
        <Text
          style={{
            fontSize: UI.type.body,
            color: UI.colors.textSecondary,
            marginBottom: 16,
          }}
        >
          {summaryText}
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: UI.colors.textSecondary,
            }}
          >
            Interests
          </Text>

          <Pressable onPress={() => setIsAdding((v) => !v)}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: UI.colors.brand,
              }}
            >
              {isAdding ? "Cancel" : "+ Add interest"}
            </Text>
          </Pressable>
        </View>

        {isAdding && (
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
            <TextInput
              value={draftInterest}
              onChangeText={setDraftInterest}
              placeholder="Add an interest"
              placeholderTextColor="#A1A1AA"
              style={{
                flex: 1,
                backgroundColor: "#FFFFFF",
                borderColor: UI.colors.cardBorder,
                borderWidth: 1,
                borderRadius: 999,
                paddingHorizontal: 14,
                paddingVertical: 10,
                color: UI.colors.textPrimary,
              }}
              onSubmitEditing={handleAdd}
            />

            <Pressable
              onPress={handleAdd}
              style={{
                borderRadius: 999,
                paddingHorizontal: 14,
                justifyContent: "center",
                backgroundColor: UI.colors.brand,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Add</Text>
            </Pressable>
          </View>
        )}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {hasTags ? (
            sortedTags.map((tag) => {
              const label = formatInterestLabel(tag.label);
              if (!label) return null;

              const voteCount = tag.voterUids?.length ?? 0;
              const isVoted = currentUid
                ? (tag.voterUids ?? []).includes(currentUid)
                : false;

              return (
                <InterestChip
                  key={tag.id}
                  label={label}
                  voteCount={voteCount}
                  isVoted={isVoted}
                  onPress={onToggleVote ? () => onToggleVote(tag) : undefined}
                />
              );
            })
          ) : (
            <Text style={{ fontSize: 14, color: UI.colors.textMuted }}>
              No interests added yet.
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}