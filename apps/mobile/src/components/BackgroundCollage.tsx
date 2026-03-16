import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { View, Text } from "react-native";

export function BackgroundCollage() {
  return (
    <View pointerEvents="none" style={{ ...Object.assign({}, { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }) }}>
      <LinearGradient
        colors={["#0D1325", "#131B33", "#070B14"]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />

      <LinearGradient
        colors={["rgba(255,107,107,0.24)", "rgba(255,107,107,0.02)"]}
        style={{
          position: "absolute",
          top: -60,
          right: -10,
          width: 220,
          height: 220,
          borderRadius: 999,
        }}
      />

      <LinearGradient
        colors={["rgba(108,92,231,0.28)", "rgba(108,92,231,0.04)"]}
        style={{
          position: "absolute",
          bottom: 120,
          left: -40,
          width: 260,
          height: 260,
          borderRadius: 999,
        }}
      />

      <View style={{ position: "absolute", top: 110, left: 22, width: 132, transform: [{ rotate: "-8deg" }] }}>
        <LinearGradient
          colors={["rgba(255,255,255,0.18)", "rgba(255,255,255,0.05)"]}
          style={{ borderRadius: 28, padding: 14, minHeight: 118, justifyContent: "space-between" }}
        >
          <Text style={{ color: "rgba(255,255,255,0.86)", fontSize: 12, fontWeight: "700" }}>LIVE ROOM</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={{ color: "white", fontSize: 22, fontWeight: "800" }}>8.7K</Text>
              <Text style={{ color: "rgba(255,255,255,0.62)", fontSize: 11 }}>viewers</Text>
            </View>
            <Text style={{ fontSize: 26 }}>🎤</Text>
          </View>
        </LinearGradient>
      </View>

      <View style={{ position: "absolute", top: 180, right: 24, width: 128, transform: [{ rotate: "9deg" }] }}>
        <LinearGradient
          colors={["rgba(108,92,231,0.3)", "rgba(255,255,255,0.04)"]}
          style={{ borderRadius: 30, padding: 16, minHeight: 148, justifyContent: "space-between" }}
        >
          <View style={{ alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
            <Text style={{ color: "white", fontSize: 11, fontWeight: "700" }}>TOP HOST</Text>
          </View>
          <Text style={{ color: "white", fontSize: 40 }}>✨</Text>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, lineHeight: 18 }}>
            calls, gifts, parties and late-night rooms.
          </Text>
        </LinearGradient>
      </View>

      <View style={{ position: "absolute", bottom: 210, right: 40, width: 168, transform: [{ rotate: "-7deg" }] }}>
        <LinearGradient
          colors={["rgba(255,255,255,0.16)", "rgba(255,255,255,0.04)"]}
          style={{ borderRadius: 32, padding: 18, minHeight: 116 }}
        >
          <Text style={{ color: "white", fontSize: 14, fontWeight: "800", marginBottom: 8 }}>TONIGHT'S MIX</Text>
          <Text style={{ color: "rgba(255,255,255,0.68)", fontSize: 12, lineHeight: 18 }}>
            drop in, match energy, stay anonymous or go live.
          </Text>
        </LinearGradient>
      </View>
    </View>
  );
}