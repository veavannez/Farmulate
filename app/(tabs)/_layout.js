import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, View, Image, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#002d00" }}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.min(insets.top, 20),
            height: 70 + Math.min(insets.top, 20),
          },
        ]}
      >
        <Image
          source={require("../../assets/farmulate-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Tabs */}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#2e7d32",
          tabBarStyle: { backgroundColor: "#f8f8f8", height: 60 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="weather"
          options={{
            title: "Weather",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cloud" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="main"
          options={{
            title: "Farmulate",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="leaf" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: "History",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="time" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" color={color} size={size} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#002d00",
    justifyContent: "center",
    alignItems: "flex-start", // align items to the left
    paddingHorizontal: 20, // space from left edge
  },
  logo: {
    height: 100,
    width: 150,
  },
});
