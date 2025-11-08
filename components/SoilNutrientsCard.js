import React, { memo } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import {
  getPhCategory,
  getPhosphorusCategory,
  getNitrogenCategory,
  getPotassiumCategory,
} from "../utils/helpers";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SoilNutrientsCard = ({ data }) => {
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
    {
      label: "Nitrogen",
      value: data.nitrogen ?? 0,
      category: getNitrogenCategory(data.nitrogen) || { label: "Unknown", color: "#999" },
    },
    {
      label: "Phosphorus",
      value: data.phosphorus ?? 0,
      category: getPhosphorusCategory(data.phosphorus, data.phLevel) || { label: "Unknown", color: "#999" },
    },
    {
      label: "Potassium",
      value: data.potassium ?? 0,
      category: getPotassiumCategory(data.potassium) || { label: "Unknown", color: "#999" },
    },
    {
      label: "Soil pH",
      value: data.phLevel ?? 0,
      category: getPhCategory(data.phLevel) || { label: "Unknown", color: "#999" },
    },
  ];

  const renderCard = (n, idx) => (
    <View
      key={idx}
      style={[
        styles.card,
        { backgroundColor: n.category.color, shadowColor: n.category.color },
      ]}
    >
      <Text style={styles.value}>{n.value}</Text>
      <Text style={styles.label}>
        {n.label} {"\n"}({n.category.label})
      </Text>
    </View>
  );

  // Example dynamic advisory logic (simplified)
  const advisoryText = () => {
    const lowNutrients = inputs.filter((n) => n.category.label.toLowerCase() === "low");
    if (lowNutrients.length === 0) return "Maintain current fertilizer schedule. Monitor soil health.";
    return `Increase ${lowNutrients.map((n) => n.label).join(", ")}. Monitor soil health.`;
  };

  return (
    <View style={[styles.panel, { width: SCREEN_WIDTH - 40 }]}>
      <View style={styles.gridRow}>
        {inputs.slice(0, 2).map(renderCard)}
      </View>
      <View style={styles.gridRow}>
        {inputs.slice(2, 4).map(renderCard)}
      </View>
      <View style={styles.pill}>
        <Text style={styles.pillText}>{advisoryText()}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    backgroundColor: "#f5f5f5",
    borderRadius: 24,
    padding: 14,
    marginTop: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    alignSelf: "center",
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  card: {
    width: "48%",
    height: 165,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  value: { fontSize: 42, fontWeight: "900", color: "#fff" },
  label: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginTop: 4,
  },
  pill: {
    marginTop: 16,
    backgroundColor: "#1b5e20",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignSelf: "center",
    shadowColor: "#1b5e20",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  pillText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  emptyContainer: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#555" },
});

// Memoized for performance
export default memo(SoilNutrientsCard);
