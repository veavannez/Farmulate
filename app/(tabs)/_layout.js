import React from "react";
import { View, Image, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TabsLayout() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#002d00" }}>
      {/* Constant Header */}
      <View style={styles.header}>
        <Image
          source={require("../../assets/farmulate-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Bottom Tab Navigation */}
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
    height: 60,
    backgroundColor: "#002d00",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    height: 100,
    width: 150,
    right: 100
  },
});
