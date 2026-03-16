import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { COLORS, FONT, RADIUS, SPACING } from "@/theme";

type SocialButtonProps = {
  title: string;
  subtitle?: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "muted" | "brand" | "icon";
};

export function SocialButton({
  title,
  subtitle,
  icon,
  onPress,
  loading,
  variant = "muted",
}: SocialButtonProps) {
  if (variant === "icon") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={loading}
        activeOpacity={0.85}
        style={{
          width: 58,
          height: 58,
          borderRadius: RADIUS.full,
          backgroundColor: "rgba(255,255,255,0.1)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.14)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <MaterialCommunityIcons color={COLORS.white} name={icon} size={24} />
        )}
      </TouchableOpacity>
    );
  }

  const palette = variant === "primary"
    ? {
        backgroundColor: "rgba(255,255,255,0.96)",
        borderColor: "rgba(255,255,255,0.98)",
        titleColor: "#1E2035",
        subtitleColor: "rgba(30,32,53,0.62)",
        iconBackground: "#2175F3",
        iconColor: COLORS.white,
      }
    : variant === "brand"
      ? {
          backgroundColor: "rgba(61,137,247,0.96)",
          borderColor: "rgba(126,184,255,0.6)",
          titleColor: COLORS.white,
          subtitleColor: "rgba(255,255,255,0.72)",
          iconBackground: "rgba(255,255,255,0.18)",
          iconColor: COLORS.white,
      }
    : {
        backgroundColor: "rgba(255,255,255,0.08)",
        borderColor: "rgba(255,255,255,0.12)",
        titleColor: COLORS.white,
        subtitleColor: "rgba(255,255,255,0.62)",
        iconBackground: "rgba(255,255,255,0.1)",
        iconColor: COLORS.white,
      };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.9}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.md,
        borderRadius: 999,
        paddingHorizontal: SPACING.md,
        paddingVertical: 16,
        backgroundColor: palette.backgroundColor,
        borderWidth: 1,
        borderColor: palette.borderColor,
        shadowColor: "#02112F",
        shadowOpacity: variant === "icon" ? 0 : 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: palette.iconBackground,
        }}
      >
        {loading ? (
          <ActivityIndicator color={palette.iconColor} />
        ) : (
          <MaterialCommunityIcons color={palette.iconColor} name={icon} size={22} />
        )}
      </View>
      <View style={{ flex: 1, alignItems: subtitle ? "flex-start" : "center", paddingRight: 20 }}>
        <Text style={{ color: palette.titleColor, fontSize: 18, fontWeight: "500" }}>{title}</Text>
        {subtitle ? (
          <Text style={{ color: palette.subtitleColor, fontSize: FONT.sizes.sm, marginTop: 2 }}>{subtitle}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}