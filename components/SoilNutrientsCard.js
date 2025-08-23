import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function SoilNutrientsCard({ data }) {
  if (!data) {
    return (
      <View style={[styles.panel, { width: SCREEN_WIDTH - 40 }]}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No inputs yet</Text>
        </View>
      </View>
    );
  }

  const inputs = [
    { label: "Nitrogen", value: data.nitrogen },
    { label: "Phosphorus", value: data.phosphorus },
    { label: "Potassium", value: data.potassium },
    { label: "Soil pH", value: data.phLevel },
  ];

  return (
    <View style={[styles.panel, { width: SCREEN_WIDTH - 40 }]}>
      {/* Nutrient grid */}
      <View style={styles.gridRow}>
        {inputs.slice(0, 2).map((n, idx) => (
          <View key={idx} style={[styles.card, { backgroundColor: "#5f8d4e" }]}>
            <Text style={styles.value}>{n.value}</Text>
            <Text style={styles.label}>{n.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.gridRow}>
        {inputs.slice(2, 4).map((n, idx) => (
          <View key={idx} style={[styles.card, { backgroundColor: "#2e7d32" }]}>
            <Text style={styles.value}>{n.value}</Text>
            <Text style={styles.label}>{n.label}</Text>
          </View>
        ))}
      </View>

      {/* Advisory pill */}
      <View style={styles.pill}>
        <Text style={styles.pillText}>
          Maintain current fertilizer schedule. Monitor soil health.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: "#cfcfcf",
    borderRadius: 24,
    padding: 14,
    marginTop: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    alignSelf: "center",
  },
  gridRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  card: {
    width: "48%",
    height: 165,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  value: { fontSize: 42, fontWeight: "900", color: "#fff" },
  label: { fontSize: 18, fontWeight: "800", color: "#fff", marginTop: 2 },
  pill: {
    marginTop: 12,
    backgroundColor: "#0f3b17",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignSelf: "center",
  },
  pillText: { color: "#fff", fontWeight: "600" },
  emptyContainer: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#555",
  },
});
