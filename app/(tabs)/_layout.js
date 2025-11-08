import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, View, Image, StyleSheet, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get("window").width;

  // Dynamic logo size based on screen width
  const logoWidth = screenWidth < 400 ? 120 : 150;
  const logoHeight = screenWidth < 400 ? 70 : 100;

  const TABS = [
    { name: "index", title: "Home", icon: "home" },
    { name: "weather", title: "Weather", icon: "cloud" },
    { name: "main", title: "Farmulate", icon: "leaf" },
    { name: "history", title: "History", icon: "time" },
    { name: "profile", title: "Profile", icon: "person" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#002d00" }}>
      {/* Header with SafeArea */}
      <SafeAreaView
        style={[
          styles.header,
          { paddingTop: insets.top, height: 60 + insets.top },
        ]}
      >
        <Image
          source={require("../../assets/farmulate-logo.png")}
          style={[styles.logo, { width: logoWidth, height: logoHeight }]}
          resizeMode="contain"
          accessible={false}
        />
      </SafeAreaView>

      {/* Tabs */}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#2e7d32",
          tabBarStyle: {
            backgroundColor: "#f8f8f8",
            height: 60,
            borderTopWidth: 0.3,
            borderTopColor: "#ccc",
          },
        }}
      >
        {TABS.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              tabBarIcon: ({ color, size }) => (
                <Ionicons name={tab.icon} color={color} size={size} />
              ),
            }}
          />
        ))}
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#002d00",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingHorizontal: 20,
  },
  logo: {
    width: 150,
    height: 100,
  },
});
