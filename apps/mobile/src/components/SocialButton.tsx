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
  variant?: "primary" | "muted" | "icon";
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
        backgroundColor: COLORS.white,
        borderColor: COLORS.white,
        titleColor: "#0B1020",
        subtitleColor: "rgba(11,16,32,0.64)",
        iconBackground: "rgba(108,92,231,0.12)",
        iconColor: COLORS.primary,
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
        borderRadius: 22,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        backgroundColor: palette.backgroundColor,
        borderWidth: 1,
        borderColor: palette.borderColor,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 16,
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
      <View style={{ flex: 1 }}>
        <Text style={{ color: palette.titleColor, fontSize: FONT.sizes.md, fontWeight: "700" }}>{title}</Text>
        {subtitle ? (
          <Text style={{ color: palette.subtitleColor, fontSize: FONT.sizes.sm, marginTop: 2 }}>{subtitle}</Text>
        ) : null}
      </View>
      <MaterialCommunityIcons color={palette.subtitleColor} name="chevron-right" size={22} />
    </TouchableOpacity>
  );
}