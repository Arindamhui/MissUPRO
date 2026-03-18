import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { COLORS } from "@/theme";

export function WinterScreen({
  title,
  rightLabel,
  onRightPress,
  children,
}: {
  title: string;
  rightLabel?: string;
  onRightPress?: () => void;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: "#09101F" }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(7,11,23,0.18)", "rgba(8,12,28,0.84)", "#09101F"]} style={{ position: "absolute", inset: 0 }} />
      <AnimatedSnow density={10} />

      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 6, paddingBottom: 36, paddingHorizontal: 18 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 18 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons color={COLORS.white} name="chevron-left" size={28} />
          </TouchableOpacity>
          <Text style={{ color: COLORS.white, fontSize: 28, fontWeight: "900", flex: 1 }}>{title}</Text>
          {rightLabel ? (
            <TouchableOpacity onPress={onRightPress} style={{ minWidth: 46, alignItems: "flex-end" }}>
              <Text style={{ color: COLORS.white, fontSize: 16 }}>{rightLabel}</Text>
            </TouchableOpacity>
          ) : <View style={{ width: 42 }} />}
        </View>

        {children}
      </ScrollView>
    </View>
  );
}

export function GlassPanel({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[{ backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 26, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: 16, marginBottom: 16 }, style]}>
      {children}
    </View>
  );
}

export function HeaderTabs({
  items,
  activeKey,
  onChange,
}: {
  items: Array<{ key: string; label: string }>;
  activeKey: string;
  onChange: (key: string) => void;
}) {
  return (
    <View style={{ marginHorizontal: -18, marginTop: -6, marginBottom: 18, backgroundColor: "rgba(255,255,255,0.98)" }}>
      <View style={{ flexDirection: "row", paddingHorizontal: 18 }}>
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <TouchableOpacity key={item.key} onPress={() => onChange(item.key)} style={{ flex: 1, alignItems: "center", paddingVertical: 16, borderBottomWidth: 4, borderBottomColor: active ? "#FF2F96" : "transparent" }}>
              <Text style={{ color: active ? "#1A1A1A" : "#A1A1A8", fontSize: 16, fontWeight: "800" }}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function GradientButton({
  title,
  onPress,
  disabled,
  small,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  small?: boolean;
}) {
  return (
    <TouchableOpacity disabled={disabled} activeOpacity={0.9} onPress={onPress} style={{ opacity: disabled ? 0.6 : 1 }}>
      <LinearGradient colors={["#F93DBD", "#6B63FF", "#39C7FF"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ borderRadius: 999, alignItems: "center", justifyContent: "center", paddingVertical: small ? 10 : 16, paddingHorizontal: small ? 18 : 24 }}>
        <Text style={{ color: COLORS.white, fontSize: small ? 14 : 16, fontWeight: "900" }}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function SegmentedPill({
  items,
  activeKey,
  onChange,
}: {
  items: Array<{ key: string; label: string }>;
  activeKey: string;
  onChange: (key: string) => void;
}) {
  return (
    <View style={{ backgroundColor: "rgba(255,255,255,0.96)", borderRadius: 999, padding: 4, flexDirection: "row", marginBottom: 18 }}>
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <TouchableOpacity key={item.key} onPress={() => onChange(item.key)} style={{ flex: 1, borderRadius: 999, overflow: "hidden" }}>
            {active ? (
              <LinearGradient colors={["#C63BFF", "#FF3399"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ paddingVertical: 12, alignItems: "center" }}>
                <Text style={{ color: COLORS.white, fontSize: 15, fontWeight: "800" }}>{item.label}</Text>
              </LinearGradient>
            ) : (
              <View style={{ paddingVertical: 12, alignItems: "center" }}>
                <Text style={{ color: "#B1B1BA", fontSize: 15, fontWeight: "700" }}>{item.label}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function NeonEmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 46 }}>
      <View style={{ width: 116, height: 116, borderRadius: 58, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#59D7FF", shadowColor: "#E449FF", shadowOpacity: 0.35, shadowRadius: 16, backgroundColor: "rgba(17,20,35,0.4)" }}>
        <View style={{ width: 54, height: 54, borderRadius: 27, borderWidth: 3, borderColor: "#E449FF", alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#66E2FF", marginBottom: 8 }} />
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#66E2FF" }} />
        </View>
      </View>
      <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "700", marginTop: 20, textAlign: "center" }}>{title}</Text>
      {subtitle ? <Text style={{ color: "rgba(255,255,255,0.64)", fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: "center" }}>{subtitle}</Text> : null}
    </View>
  );
}

export function SearchInput({ value, onChangeText, placeholder }: { value: string; onChangeText: (value: string) => void; placeholder: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#1A2031", borderRadius: 18, paddingHorizontal: 16, marginBottom: 18 }}>
      <MaterialCommunityIcons color="rgba(255,255,255,0.5)" name="magnify" size={24} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="rgba(255,255,255,0.38)" style={{ flex: 1, color: COLORS.white, paddingVertical: 14, paddingHorizontal: 10, fontSize: 16 }} />
    </View>
  );
}