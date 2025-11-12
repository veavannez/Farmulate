import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { format } from "date-fns";

// Convert snake_case → camelCase
const toCamel = (report) => ({
  id: report.id,
  potName: report.pot_name,
  soilImage: report.image_url,
  recommendedCrop: report.recommended_crop,
  companions: report.companions || [],
  avoid: report.avoids || [],
  nitrogen: report.n ?? "",
  phosphorus: report.p ?? "",
  potassium: report.k ?? "",
  phLevel: report.ph_level ?? "",
  prediction: report.prediction || "",
  createdAt: report.created_at,
});

export default function HistoryScreen() {
  const router = useRouter();

  const [history, setHistory] = useState([]);
  const [selectedPot, setSelectedPot] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        setHistory([]);
        return;
      }

      const { data, error } = await supabase
        .from("soil_results")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map(toCamel);

      const uniqueReports = formatted.filter(
        (report, index, self) =>
          report.potName && index === self.findIndex((r) => r.id === report.id)
      );


      setHistory(uniqueReports);
    } catch (err) {
      console.error("Error fetching reports:", err.message);
      Alert.alert("Error", "Failed to load reports. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const uniquePots = useMemo(() => {
    const names = history.map((h) => h.potName).filter(Boolean);
    return ["all", ...new Set(names)];
  }, [history]);

  const filteredHistory = useMemo(() => {
    if (selectedPot === "all") return [...history];
    return history.filter((h) => h.potName === selectedPot);
  }, [history, selectedPot]);

  // Navigate to report page with reportId
  const openReport = (item) => {
    router.push({
      pathname: "/report",
      params: { reportId: item.id },
    });
  };

  const deleteReport = async (id, potName) => {
    Alert.alert("Delete Report", "Are you sure you want to delete this report?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase.from("soil_results").delete().eq("id", id);
            if (error) throw error;

            setHistory((prev) => prev.filter((h) => h.id !== id));

            const remaining = history.filter((h) => h.potName === potName);
            if (remaining.length === 0) setSelectedPot("all");

            Alert.alert("Deleted", "Report successfully deleted!");
          } catch (err) {
            console.error("Error deleting report:", err.message);
            Alert.alert("Error", "Failed to delete report.");
          }
        },
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  const PotFilterChips = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.potScroll}
    >
      {uniquePots.map((pot) => (
        <TouchableOpacity
          key={pot}
          style={[styles.potChip, selectedPot === pot && styles.potChipSelected]}
          onPress={() => setSelectedPot(pot)}
        >
          <Text
            style={[styles.potChipText, selectedPot === pot && styles.potChipTextSelected]}
          >
            {pot === "all" ? "🌍 All Pots/Plots" : `🪴 ${pot}`}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const ReportCard = ({ item }) => {
    const date = item.createdAt ? new Date(item.createdAt) : new Date();
    return (
      <View style={styles.card}>
        <TouchableOpacity style={styles.cardContent} onPress={() => openReport(item)}>
          {item.soilImage && <Image source={{ uri: item.soilImage }} style={styles.thumbnail} />}
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>
              {item.potName} | {item.recommendedCrop} | {item.prediction}
            </Text>
            <Text style={styles.cardSubtitle}>{format(date, "PPPpp")}</Text>
            <Text style={styles.cardNutrients}>
              N: {item.nitrogen} | P: {item.phosphorus} | K: {item.potassium} | pH: {item.phLevel}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => deleteReport(item.id, item.potName)}
          style={styles.deleteButton}
        >
          <Text style={styles.deleteText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>History</Text>
        <TouchableOpacity onPress={fetchReports}>
          <Text style={styles.refreshText}>⟳ Refresh</Text>
        </TouchableOpacity>
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.empty}>No reports found.</Text>
        </View>
      ) : (
        <FlatList
          ListHeaderComponent={<PotFilterChips />}
          data={filteredHistory}
          keyExtractor={(item) => item.id.toString()}
          renderItem={ReportCard}
          refreshing={refreshing}
          onRefresh={onRefresh}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 12 },
  title: { fontSize: 22, fontWeight: "bold", color: "#002d00" },
  refreshText: { fontSize: 16, color: "#2e7d32", fontWeight: "600" },
  empty: { fontSize: 16, color: "#777", textAlign: "center" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 50 },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  potScroll: { paddingVertical: 4 },
  potChip: { backgroundColor: "#e0e0e0", paddingHorizontal: 10, height: 28, borderRadius: 14, marginRight: 6, justifyContent: "center", alignItems: "center" },
  potChipSelected: { backgroundColor: "#2e7d32" },
  potChipText: { fontSize: 12, lineHeight: 14, color: "#333", fontWeight: "500" },
  potChipTextSelected: { color: "#fff" },
  card: { flexDirection: "row", backgroundColor: "#f3f3f3", padding: 10, borderRadius: 10, marginBottom: 10, marginTop: 5, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2 },
  cardContent: { flexDirection: "row", flex: 1 },
  thumbnail: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#002d00" },
  cardSubtitle: { fontSize: 14, color: "#333", marginBottom: 2 },
  cardNutrients: { fontSize: 13, color: "#444" },
  deleteButton: { marginLeft: 8, padding: 6, backgroundColor: "#ffdddd", borderRadius: 10 },
  deleteText: { fontSize: 18 },
});
