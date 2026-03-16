import React from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput,
  ScrollView, Modal as RNModal, FlatList, Image, TextInputProps,
} from "react-native";
import { COLORS, SPACING, FONT, RADIUS } from "@/theme";

// ─── Button ───
export function Button({
  title, onPress, variant = "primary", size = "md", loading, disabled, style,
}: {
  title: string; onPress: () => void; variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg"; loading?: boolean; disabled?: boolean; style?: any;
}) {
  const colors = {
    primary: { bg: COLORS.primary, text: COLORS.white },
    secondary: { bg: COLORS.surface, text: COLORS.text },
    danger: { bg: COLORS.danger, text: COLORS.white },
    ghost: { bg: "transparent", text: COLORS.textSecondary },
    outline: { bg: "transparent", text: COLORS.primary },
  };
  const sizes = { sm: 36, md: 48, lg: 56 };
  const c = colors[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[{
        backgroundColor: c.bg,
        height: sizes[size],
        borderRadius: RADIUS.md,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: SPACING.lg,
        opacity: disabled ? 0.5 : 1,
        borderWidth: variant === "outline" ? 1.5 : 0,
        borderColor: variant === "outline" ? COLORS.primary : undefined,
      }, style]}
    >
      {loading ? (
        <ActivityIndicator color={c.text} />
      ) : (
        <Text style={{ color: c.text, fontSize: size === "sm" ? 13 : 15, fontWeight: "600" }}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Input ───
export function Input({
  label, placeholder, value, onChangeText, secure, keyboardType, multiline, style, ...props
}: {
  label?: string; placeholder?: string; value: string; onChangeText: (text: string) => void;
  secure?: boolean; keyboardType?: any; multiline?: boolean; style?: any;
} & TextInputProps) {
  return (
    <View style={{ marginBottom: SPACING.md }}>
      {label && <Text style={{ fontSize: 13, fontWeight: "500", color: COLORS.text, marginBottom: 6 }}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSecondary}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[{
          backgroundColor: COLORS.inputBg,
          borderRadius: RADIUS.md,
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.sm + 4,
          fontSize: 15,
          color: COLORS.text,
          minHeight: multiline ? 100 : undefined,
          textAlignVertical: multiline ? "top" : undefined,
        }, style]}
        {...props}
      />
    </View>
  );
}

// ─── Card ───
export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[{
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      shadowColor: COLORS.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    }, style]}>
      {children}
    </View>
  );
}

// ─── Avatar ───
export function Avatar({ uri, size = 48, online }: { uri?: string; size?: number; online?: boolean }) {
  return (
    <View style={{ position: "relative" }}>
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center", overflow: "hidden",
      }}>
        {uri ? (
          <Image source={{ uri }} style={{ width: size, height: size }} />
        ) : (
          <Text style={{ color: COLORS.primary, fontSize: size * 0.4, fontWeight: "600" }}>?</Text>
        )}
      </View>
      {online !== undefined && (
        <View style={{
          position: "absolute", bottom: 0, right: 0,
          width: 14, height: 14, borderRadius: 7,
          backgroundColor: online ? COLORS.success : COLORS.textSecondary,
          borderWidth: 2, borderColor: COLORS.white,
        }} />
      )}
    </View>
  );
}

// ─── Badge ───
export function Badge({
  text,
  label,
  color = COLORS.primary,
}: {
  text?: string;
  label?: string;
  color?: string;
}) {
  const content = text ?? label ?? "";
  return (
    <View style={{
      backgroundColor: color + "20",
      paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: RADIUS.full,
    }}>
      <Text style={{ color, fontSize: 11, fontWeight: "600" }}>{content}</Text>
    </View>
  );
}

// ─── Coin Display ───
export function CoinDisplay({ amount, size = "md" }: { amount: number; size?: "sm" | "md" | "lg" }) {
  const fontSize = size === "sm" ? 12 : size === "md" ? 16 : 22;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Text style={{ fontSize: fontSize + 2 }}>🪙</Text>
      <Text style={{ fontSize, fontWeight: "700", color: COLORS.gold }}>{amount.toLocaleString()}</Text>
    </View>
  );
}

// ─── Diamond Display ───
export function DiamondDisplay({ amount, size = "md" }: { amount: number; size?: "sm" | "md" | "lg" }) {
  const fontSize = size === "sm" ? 12 : size === "md" ? 16 : 22;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Text style={{ fontSize: fontSize + 2 }}>💎</Text>
      <Text style={{ fontSize, fontWeight: "700", color: COLORS.diamond }}>{amount.toLocaleString()}</Text>
    </View>
  );
}

// ─── Screen Wrapper ───
export function Screen({ children, scroll, style }: { children: React.ReactNode; scroll?: boolean; style?: any }) {
  const Wrapper = scroll ? ScrollView : View;
  return (
    <Wrapper style={[{ flex: 1, backgroundColor: COLORS.background }, style]}
      {...(scroll ? { contentContainerStyle: { padding: SPACING.md } } : { style: [{ flex: 1, backgroundColor: COLORS.background, padding: SPACING.md }, style] })}
    >
      {children}
    </Wrapper>
  );
}

// ─── Empty State ───
export function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: SPACING.xxl }}>
      <Text style={{ fontSize: 48, marginBottom: SPACING.md }}>{icon}</Text>
      <Text style={{ fontSize: 18, fontWeight: "600", color: COLORS.text }}>{title}</Text>
      {subtitle && <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 4, textAlign: "center" }}>{subtitle}</Text>}
    </View>
  );
}

// ─── Section Header ───
export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.sm, marginTop: SPACING.md }}>
      <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.text }}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={{ fontSize: 14, color: COLORS.primary, fontWeight: "500" }}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
