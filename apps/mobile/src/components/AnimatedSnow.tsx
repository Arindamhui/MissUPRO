import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, View } from "react-native";

type Snowflake = {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
};

const { width, height } = Dimensions.get("window");

export function AnimatedSnow({ density = 18 }: { density?: number }) {
  const flakes = useMemo<Snowflake[]>(() => (
    Array.from({ length: density }, (_, index) => ({
      id: index,
      left: (width / density) * index + ((index % 3) * 11),
      size: 4 + (index % 4),
      duration: 5400 + (index % 6) * 700,
      delay: index * 230,
      opacity: 0.22 + (index % 5) * 0.08,
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
        <Animated.View
          key={flake.id}
          style={{
            position: "absolute",
            left: flake.left,
            width: flake.size,
            height: flake.size,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.85)",
            opacity: flake.opacity,
            transform: [{ translateY: animatedValues[index] }, { translateX: animatedValues[index].interpolate({ inputRange: [-40, height + 40], outputRange: [0, (index % 2 === 0 ? 18 : -18)] }) }],
          }}
        />
      ))}
    </View>
  );
}