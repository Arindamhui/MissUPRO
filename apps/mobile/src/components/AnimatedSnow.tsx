import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, Text, View } from "react-native";

type Snowflake = {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  glyph: "dot" | "flake";
  sway: number;
};

const { width, height } = Dimensions.get("window");

export function AnimatedSnow({ density = 18 }: { density?: number }) {
  const flakes = useMemo<Snowflake[]>(() => (
    Array.from({ length: density }, (_, index) => ({
      id: index,
      left: (width / density) * index + ((index % 4) * 9),
      size: index % 5 === 0 ? 18 : 4 + (index % 4),
      duration: 5200 + (index % 7) * 620,
      delay: index * 190,
      opacity: index % 5 === 0 ? 0.65 : 0.2 + (index % 5) * 0.09,
      glyph: index % 5 === 0 ? "flake" : "dot",
      sway: index % 2 === 0 ? 18 : -18,
    }))
  ), [density]);

  const animatedValues = useRef(flakes.map(() => new Animated.Value(-40))).current;

  useEffect(() => {
    const animations = animatedValues.map((value, index) => (
      Animated.loop(
        Animated.sequence([
          Animated.delay(flakes[index]?.delay ?? 0),
          Animated.timing(value, {
            toValue: height + 40,
            duration: flakes[index]?.duration ?? 6000,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: -40,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      )
    ));

    animations.forEach((animation) => animation.start());
    return () => {
      animations.forEach((animation) => animation.stop());
    };
  }, [animatedValues, flakes]);

  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
      {flakes.map((flake, index) => (
        (() => {
          const translateY = animatedValues[index] ?? new Animated.Value(-40);
          const translateX = translateY.interpolate({ inputRange: [-40, height + 40], outputRange: [0, flake.sway] });
          return (
            <Animated.View
              key={flake.id}
              style={{
                position: "absolute",
                left: flake.left,
                opacity: flake.opacity,
                transform: [{ translateY }, { translateX }],
              }}
            >
              {flake.glyph === "flake" ? (
                <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: flake.size, textShadowColor: "rgba(255,255,255,0.36)", textShadowRadius: 12 }}>
                  ❄
                </Text>
              ) : (
                <View
                  style={{
                    width: flake.size,
                    height: flake.size,
                    borderRadius: 999,
                    backgroundColor: "rgba(255,255,255,0.88)",
                    shadowColor: "#FFFFFF",
                    shadowOpacity: 0.45,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 0 },
                  }}
                />
              )}
            </Animated.View>
          );
        })()
      ))}
    </View>
  );
}