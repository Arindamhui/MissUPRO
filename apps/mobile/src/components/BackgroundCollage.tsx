import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Text, View } from "react-native";

const lightStrands: Array<{ id: number; left: `${number}%`; length: number; opacity: number }> = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  left: `${3 + index * 5.4}%` as `${number}%`,
  length: 42 + (index % 5) * 20,
  opacity: 0.35 + (index % 4) * 0.14,
}));

const forestHeights = [52, 76, 64, 88, 70, 100, 78, 90, 62, 94, 74, 68, 86, 58];

function HangingLights() {
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, right: 0, left: 0, height: 220 }}>
      {lightStrands.map((strand) => (
        <View key={strand.id} style={{ position: "absolute", left: strand.left, top: 0, alignItems: "center" }}>
          <View style={{ width: 1.4, height: strand.length, backgroundColor: `rgba(255,244,219,${strand.opacity})` }} />
          <View style={{ width: 4, height: 4, borderRadius: 99, backgroundColor: "rgba(255,246,220,0.96)", shadowColor: "#FFF6D2", shadowOpacity: 0.9, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } }} />
        </View>
      ))}
    </View>
  );
}

function ForestLine() {
  return (
    <View pointerEvents="none" style={{ position: "absolute", right: 0, bottom: 0, left: 0, height: 140, flexDirection: "row", alignItems: "flex-end" }}>
      {forestHeights.map((height, index) => (
        <View key={index} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: 20, height, borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: index % 3 === 0 ? "rgba(12,87,124,0.82)" : "rgba(5,66,102,0.88)", transform: [{ skewX: index % 2 === 0 ? "-8deg" : "8deg" }] }} />
        </View>
      ))}
    </View>
  );
}

function PortraitTile({
  top,
  left,
  right,
  bottom,
  colors,
}: {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  colors: readonly [string, string, ...string[]];
}) {
  return (
    <View
      style={{
        position: "absolute",
        top,
        left,
        right,
        bottom,
        width: left != null || right != null ? "48%" : undefined,
        height: top != null ? 260 : 300,
        overflow: "hidden",
      }}
    >
      <LinearGradient colors={colors} style={{ flex: 1 }}>
        <View style={{ position: "absolute", top: 34, right: 26, width: 114, height: 114, borderRadius: 57, backgroundColor: "rgba(255,255,255,0.08)" }} />
        <View style={{ position: "absolute", top: 98, left: 26, width: 118, height: 138, borderRadius: 62, backgroundColor: "rgba(17,14,38,0.38)" }} />
        <View style={{ position: "absolute", top: 50, left: 54, width: 78, height: 92, borderRadius: 48, backgroundColor: "rgba(243,214,212,0.28)" }} />
        <View style={{ position: "absolute", top: 136, left: 34, width: 160, height: 180, borderTopLeftRadius: 90, borderTopRightRadius: 90, backgroundColor: "rgba(72,44,126,0.26)" }} />
        <View style={{ position: "absolute", bottom: -40, right: -20, width: 180, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.06)" }} />
      </LinearGradient>
    </View>
  );
}

export function BackgroundCollage({ variant = "auth" }: { variant?: "auth" | "splash" | "home" }) {
  const showPortraits = variant === "auth";

  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
      <LinearGradient
        colors={variant === "home" ? ["#261E70", "#171B56", "#0A143C"] : ["#3B2BA6", "#211F7D", "#141E67"]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />

      {showPortraits ? (
        <>
          <PortraitTile top={0} left={0} colors={["rgba(92,84,127,0.88)", "rgba(35,32,60,0.96)"]} />
          <PortraitTile top={0} right={0} colors={["rgba(128,107,126,0.84)", "rgba(55,47,78,0.96)"]} />
          <PortraitTile top={260} left={0} colors={["rgba(79,48,111,0.9)", "rgba(33,18,61,0.97)"]} />
          <PortraitTile top={260} right={0} colors={["rgba(94,70,118,0.88)", "rgba(34,18,62,0.97)"]} />
          <LinearGradient
            colors={["rgba(7,10,27,0.2)", "rgba(33,19,95,0.34)", "rgba(89,20,148,0.48)", "rgba(19,28,91,0.92)"]}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          />
        </>
      ) : null}

      <HangingLights />

      <LinearGradient
        colors={["rgba(255,255,255,0.18)", "rgba(255,255,255,0.01)"]}
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
        colors={["rgba(173,80,255,0.28)", "rgba(104,77,250,0.04)"]}
        style={{
          position: "absolute",
          bottom: 120,
          left: -40,
          width: 260,
          height: 260,
          borderRadius: 999,
        }}
      />

      {variant !== "splash" ? (
        <View style={{ position: "absolute", top: 88, right: 18, width: 170, alignItems: "center", opacity: variant === "home" ? 0.8 : 1 }}>
          <Text style={{ color: "rgba(255,255,255,0.56)", fontSize: 30 }}>🛷</Text>
        </View>
      ) : null}

      <LinearGradient
        colors={["rgba(11,14,44,0)", "rgba(12,16,53,0.12)", "rgba(7,14,49,0.88)"]}
        style={{ position: "absolute", right: 0, bottom: 0, left: 0, height: 260 }}
      />
      <ForestLine />

      <Text style={{ position: "absolute", top: 120, left: 20, color: "rgba(255,255,255,0.18)", fontSize: 36 }}>❄</Text>
      <Text style={{ position: "absolute", top: 330, right: 28, color: "rgba(255,255,255,0.16)", fontSize: 44 }}>❄</Text>
      <Text style={{ position: "absolute", bottom: 220, left: 18, color: "rgba(255,255,255,0.16)", fontSize: 28 }}>❄</Text>
    </View>
  );
}