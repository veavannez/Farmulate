import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSoil } from "../context/soilContext";
import { supabase } from "../lib/supabase";
import { getPhCategory } from "../utils/helpers";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SoilNutrientsCard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { soilData: soilContextData } = useSoil();

  const fetchLatestReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Prefer context data (immediate display after creating a report)
      if (soilContextData) {
        setData(soilContextData);
        return;
      }

      // Otherwise, fetch latest from Supabase
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("User not logged in");

      const { data: result, error: supaError } = await supabase
        .from("soil_results")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (supaError) throw supaError;

      setData(result);
    } catch (err) {
      console.error("Failed to fetch soil report:", err);
      setError("Failed to load soil report");
    } finally {
      setLoading(false);
    }
  }, [soilContextData]);

  useEffect(() => {
    fetchLatestReport();
  }, [fetchLatestReport]);

  if (loading)
    return (
      <View style={[styles.panel, { width: SCREEN_WIDTH - 40, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={{ marginTop: 8, color: "#555", fontWeight: "600" }}>Loading soil report...</Text>
      </View>
    );

  if (error || !data)
    return (
      <View style={[styles.panel, { width: SCREEN_WIDTH - 40 }]}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{error || "No soil report available"}</Text>
          <TouchableOpacity onPress={fetchLatestReport} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#fff" />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>
    );

  // Normalize nutrient values from either DB (n,p,k,ph_level) or context (nitrogen,phosphorus,potassium,phLevel)
  const nitrogenValue = data?.n ?? data?.nitrogen ?? 0;
  const phosphorusValue = data?.p ?? data?.phosphorus ?? 0;
  const potassiumValue = data?.k ?? data?.potassium ?? 0;
  const phValue = data?.ph_level ?? data?.phLevel ?? data?.ph ?? 0;
  // Use category color for pH to get a slightly darker/meaningful shade
  const phCategory = getPhCategory(Number(phValue));

  const nutrients = [
    { label: "Nitrogen", unit: "mg/kg", value: nitrogenValue, color: "#388e3c", icon: <Ionicons name="leaf" size={28} color="#fff" /> },
    { label: "Phosphorus", unit: "mg/kg", value: phosphorusValue, color: "#43a047", icon: <MaterialCommunityIcons name="beaker-outline" size={28} color="#fff" /> },
    { label: "Potassium", unit: "mg/kg", value: potassiumValue, color: "#66bb6a", icon: <MaterialCommunityIcons name="flask" size={28} color="#fff" /> },
    { label: "pH Level", unit: null, value: phValue, color: phCategory.color || "#4caf50", icon: <Ionicons name="water" size={28} color="#fff" /> },
  ];

  const renderCard = (n, idx) => (
    <View key={idx} style={[styles.card, { backgroundColor: n.color, shadowColor: n.color }]}>
      {n.icon}
      <Text style={styles.value}>{n.value}</Text>
      <Text style={styles.label}>{n.label}</Text>
      {n.unit && <Text style={styles.unitText}>{n.unit}</Text>}
      {n.label === "pH Level" && (
        <Text style={styles.phCategoryText}>{getPhCategory(Number(n.value)).label}</Text>
      )}
    </View>
  );

  return (
    <View style={[styles.panel, { width: SCREEN_WIDTH - 40 }]}>
      <View style={styles.lastChecked}>
        <Text style={styles.lastCheckedText}>🪴 {data.potName || data.pot_name || "Unnamed Pot"}</Text>
        <Text style={styles.lastCheckedText}>
          ⏱ Last Checked: {data.generatedAt || data.created_at ? new Date(data.generatedAt || data.created_at).toLocaleString() : "N/A"}
        </Text>
        <TouchableOpacity onPress={fetchLatestReport} style={styles.refreshButtonSmall}>
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.gridRow}>{nutrients.slice(0, 2).map(renderCard)}</View>
      <View style={styles.gridRow}>{nutrients.slice(2, 4).map(renderCard)}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    backgroundColor: "#f5f5f5",
    borderRadius: 24,
    padding: 14,
    marginTop: 16,
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
    height: 160,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  value: { fontSize: 36, fontWeight: "900", color: "#fff", marginTop: 6 },
  label: { fontSize: 16, fontWeight: "700", color: "#fff", textAlign: "center", marginTop: 2 },
  unitText: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.85)", textAlign: "center", marginTop: 2 },
  lastChecked: {
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#2e7d32",
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#2e7d32",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    position: "relative",
  },
  lastCheckedText: { color: "#fff", fontWeight: "700", fontSize: 15, textAlign: "center" },
  refreshButtonSmall: {
    position: "absolute",
    right: 10,
    top: 10,
    padding: 4,
    backgroundColor: "#1b5e20",
    borderRadius: 12,
  },
  phCategoryText: { marginTop: 0, color: "rgba(255,255,255,0.9)", fontWeight: "700", fontSize: 12 },
  emptyContainer: { height: 120, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#555" },
  refreshButton: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2e7d32",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  refreshText: { color: "#fff", fontWeight: "600" },
});

export default SoilNutrientsCard;
