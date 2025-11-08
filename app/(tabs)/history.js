
import React, { useState, useEffect, useMemo } from "react";
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
import { useSoil } from "../../context/soilContext";
import { supabase } from "../../lib/supabase";
import { format } from "date-fns";

export default function HistoryScreen() {
  const { setSoilData } = useSoil();
  const router = useRouter();

  const [history, setHistory] = useState([]);
  const [selectedPot, setSelectedPot] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ Fetch current user reports
  const fetchReports = async () => {
    try {
      setLoading(true);

      // Get the current logged-in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) {
        setHistory([]);
        setLoading(false);
        return;
      }

      // Fetch only that user's reports
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", user.id)
        .order("generated_at", { ascending: false });

      if (error) throw error;

      setHistory(data || []);
    } catch (err) {
      console.error("Error fetching reports:", err.message);
      Alert.alert("Error", "Failed to load your reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // ✅ Unique pots
  const uniquePots = useMemo(() => {
    const names = history.map((h) => h.pot_name).filter(Boolean);
    return ["all", ...new Set(names)];
  }, [history]);

  // ✅ Filtered reports
  const filteredHistory = useMemo(() => {
    if (selectedPot === "all")
      return [...history].sort(
        (a, b) => new Date(b.generated_at) - new Date(a.generated_at)
      );
    return history
      .filter((h) => h.pot_name === selectedPot)
      .sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at));
  }, [history, selectedPot]);

  // ✅ Open report
  const openReport = (item) => {
    setSoilData(item);
    router.push("/report");
  };

  // ✅ Delete report
  const deleteReport = async (id, potName) => {
    Alert.alert(
      "Delete Report",
      "Are you sure you want to delete this report?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("reports")
                .delete()
                .eq("id", id);

              if (error) throw error;

              setHistory((prev) => prev.filter((h) => h.id !== id));

              // Reset selected pot if no reports left
              const remaining = history.filter((h) => h.pot_name === potName);
              if (remaining.length === 0) setSelectedPot("all");

              Alert.alert("Deleted", "Report successfully deleted!");
            } catch (err) {
              console.error("Error deleting report:", err.message);
              Alert.alert("Error", err.message);
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  // ✅ Render report card
  const renderItem = ({ item }) => {
    const date = item.generated_at
      ? new Date(item.generated_at)
      : new Date(item.id);

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={{ flexDirection: "row", flex: 1 }}
          onPress={() => openReport(item)}
        >
          {item.soil_image && (
            <Image source={{ uri: item.soil_image }} style={styles.thumbnail} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>
              {item.pot_name || "Unnamed Pot"} | {item.soil_texture} |{" "}
              {item.soil_health}
            </Text>
            <Text style={styles.cardSubtitle}>{format(date, "PPPpp")}</Text>
            <Text style={styles.cardNutrients}>
              N: {item.nitrogen} | P: {item.phosphorus} | K: {item.potassium} | pH:{" "}
              {item.ph_level}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => deleteReport(item.id, item.pot_name)}
          style={styles.deleteButton}
        >
          <Text style={styles.deleteText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>History</Text>
        <TouchableOpacity onPress={fetchReports}>
          <Text style={styles.refreshText}>⟳ Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2e7d32" style={{ marginTop: 20 }} />
      ) : history.length === 0 ? (
        <Text style={styles.empty}>No reports found.</Text>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.potScroll}
          >
            {uniquePots.map((pot, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.potChip,
                  selectedPot === pot && styles.potChipSelected,
                ]}
                onPress={() => setSelectedPot(pot)}
              >
                <Text
                  style={[
                    styles.potChipText,
                    selectedPot === pot && styles.potChipTextSelected,
                  ]}
                >
                  {pot === "all" ? "🌍 All Pots/Plots" : `🪴 ${pot}`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <FlatList
            data={filteredHistory}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: "bold", color: "#002d00" },
  refreshText: { fontSize: 16, color: "#2e7d32", fontWeight: "600" },
  empty: { fontSize: 16, color: "#777", marginTop: 20, textAlign: "center" },

  potScroll: {
    paddingVertical: 4,
    marginBottom: 16,
    alignItems: "center",
  },
  potChip: {
    backgroundColor: "#e0e0e0",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginRight: 8,
  },
  potChipSelected: { backgroundColor: "#2e7d32" },
  potChipText: { fontSize: 14, color: "#333", fontWeight: "500" },
  potChipTextSelected: { color: "#fff" },

  card: {
    flexDirection: "row",
    backgroundColor: "#f3f3f3",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#002d00" },
  cardSubtitle: { fontSize: 14, color: "#333", marginBottom: 4 },
  cardNutrients: { fontSize: 13, color: "#444" },
  deleteButton: {
    marginLeft: 8,
    padding: 6,
    backgroundColor: "#ffdddd",
    borderRadius: 8,
  },
  deleteText: { fontSize: 18 },
});
