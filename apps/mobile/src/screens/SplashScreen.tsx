import { useAuth } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";
import { AnimatedSnow } from "@/components/AnimatedSnow";
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
      <LinearGradient
        colors={["#0E1427", "#131C34", "#060911"]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />
      <AnimatedSnow density={22} />
      <View style={{ position: "absolute", top: -40, right: -30, width: 220, height: 220, borderRadius: 999, backgroundColor: "rgba(255,107,107,0.18)" }} />
      <View style={{ position: "absolute", bottom: -50, left: -20, width: 260, height: 260, borderRadius: 999, backgroundColor: "rgba(108,92,231,0.2)" }} />

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
        <Animated.View style={{ alignItems: "center", opacity, transform: [{ translateY }] }}>
          <View style={{ width: 106, height: 106, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center", marginBottom: 22, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }}>
            <Text style={{ fontSize: 40 }}>❄️</Text>
          </View>
          <Text style={{ color: "white", fontSize: 40, fontWeight: "800", letterSpacing: 1.2 }}>SK Lite</Text>
          <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 15, marginTop: 10, textAlign: "center" }}>
            Jashn Har Din, Party Har Waqt!
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}