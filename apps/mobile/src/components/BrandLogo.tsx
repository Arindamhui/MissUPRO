import React from "react";
import { Image, View } from "react-native";
import brandLogo from "../../assets/branding/missu-pro-app-logo.png";

export function BrandLogo({
  size = 108,
}: {
  size?: number;
}) {
  return (
    <View style={{ alignItems: "center" }}>
      <Image
        source={brandLogo}
        style={{
          width: size,
          height: size,
          borderRadius: Math.max(18, Math.round(size * 0.24)),
          shadowColor: "#04091E",
          shadowOpacity: 0.28,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
        }}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="MissU Pro logo"
      />
    </View>
  );
}