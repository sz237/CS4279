import { UI } from "@/src/theme/ui";
import { Text, View } from "react-native";

export function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontSize: UI.type.sectionTitle,
          fontWeight: "700",
          color: UI.colors.textPrimary,
        }}
      >
        {title}
      </Text>

      {subtitle ? (
        <Text
          style={{
            marginTop: 4,
            fontSize: UI.type.body,
            color: UI.colors.textSecondary,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}