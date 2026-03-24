import { Image, ImageSourcePropType, Text, View } from "react-native";

type Props = {
  name: string;
  avatar?: ImageSourcePropType;
};

// Deterministic colour pair based on first character
const PALETTES = [
  { bg: "#EDE9FE", text: "#6D28D9" },
  { bg: "#DBEAFE", text: "#1D4ED8" },
  { bg: "#DCFCE7", text: "#15803D" },
  { bg: "#FEF9C3", text: "#A16207" },
  { bg: "#FFE4E6", text: "#BE123C" },
];

export function MemberChip({ name, avatar }: Props) {
  const palette = PALETTES[name.charCodeAt(0) % PALETTES.length];

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        paddingLeft: 8,
        paddingRight: 16,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#F4F4F5",
        gap: 12,
      }}
    >
      {/* Avatar: real image or initial circle */}
      {avatar ? (
        <Image
          source={avatar}
          style={{ width: 32, height: 32, borderRadius: 16 }}
        />
      ) : (
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: palette.bg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "700", color: palette.text }}>
            {name[0].toUpperCase()}
          </Text>
        </View>
      )}

      <Text style={{ fontSize: 14, fontWeight: "600", color: "#27272A" }}>
        {name}
      </Text>
    </View>
  );
}
