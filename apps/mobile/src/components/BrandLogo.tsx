import React from "react";
import { Image, Text, View } from "react-native";
import appIcon from "../../android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.webp";

export function BrandLogo({
  size = 108,
  showWordmark = true,
  subtitle,
}: {
  size?: number;
  showWordmark?: boolean;
  subtitle?: string;
}) {
  return (
    <View style={{ alignItems: "center" }}>
      <Image
        source={appIcon}
        style={{
          width: size,
          height: size,
          borderRadius: Math.max(20, Math.round(size * 0.26)),
          shadowColor: "#04091E",
          shadowOpacity: 0.34,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
        }}
      />

      {showWordmark ? (
        <>
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: size > 96 ? 28 : 24,
              fontWeight: "800",
              letterSpacing: 0.3,
              marginTop: 18,
            }}
          >
            SK Lite
          </Text>
          {subtitle ? (
            <Text
              style={{
                color: "rgba(255,255,255,0.84)",
                fontSize: 14,
                fontWeight: "500",
                marginTop: 6,
                textAlign: "center",
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}