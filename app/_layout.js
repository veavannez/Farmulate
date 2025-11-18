import React from "react";
import { Stack } from "expo-router";
import { ProfileProvider } from "../context/profileContext";
import { SoilProvider } from "../context/soilContext";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context"; // ✅ modern import

export default function RootLayout() {
  return (
    <ProfileProvider>
      <SoilProvider>
        <SafeAreaView
          style={{ flex: 1, backgroundColor: "#0b1e0a" }}
          edges={["top", "right", "left", "bottom"]} // ✅ ensures full coverage
        >
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "fade", // ✅ smooth fade transition
              presentation: "transparentModal", // prevents slide effect
            }}
          />
        </SafeAreaView>
      </SoilProvider>
    </ProfileProvider>
  );
}