import { useAuth } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuthStore } from "@/store";

export default function SplashScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const authMode = useAuthStore((s) => s.authMode);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  useEffect(() => {
    if (!isLoaded) return;
    const timeout = setTimeout(() => {
      if (isSignedIn || authMode === "guest") {
        router.replace("/(tabs)");
        return;
      }
      router.replace("/(auth)/login");
    }, 2400);

    return () => clearTimeout(timeout);
  }, [authMode, isLoaded, isSignedIn]);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="splash" />
      <LinearGradient
        colors={["rgba(21,23,70,0.1)", "rgba(17,21,75,0.22)", "rgba(10,18,60,0.82)"]}
        end={{ x: 0.5, y: 1 }}
        start={{ x: 0.5, y: 0 }}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />
      <AnimatedSnow density={26} />

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
        <Animated.View style={{ alignItems: "center", opacity, transform: [{ translateY }] }}>
          <BrandLogo size={152} />
        </Animated.View>
      </View>
    </View>
  );
}