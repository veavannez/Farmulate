import React from "react";
import { View, StyleSheet } from "react-native";
import { Tabs } from "expo-router";

export default function SharedLayout({ children }) {
  return (
    <View style={styles.container}>
      {/* Header is handled by each screen itself */}
      <View style={styles.content}>{children}</View>

      {/* Bottom Tab Bar */}
      <Tabs
        screenOptions={{
          headerShown: false,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
});
