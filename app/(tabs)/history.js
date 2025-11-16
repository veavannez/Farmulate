import { format } from "date-fns";
import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    Dimensions,
    FlatList,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { supabase } from "../../lib/supabase";

const { width } = Dimensions.get("window");

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
  confidence: typeof report.crop_confidence === 'number' ? report.crop_confidence
             : (typeof report.confidence === 'number' ? report.confidence : null),
});

export default function HistoryScreen() {
  const router = useRouter();

  const [history, setHistory] = useState([]);
  const [selectedPot, setSelectedPot] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

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

            // Update history and then check remaining for current pot using the new list
            setHistory((prev) => {
              const next = prev.filter((h) => h.id !== id);
              const remaining = next.filter((h) => h.potName === potName);
              if (selectedPot !== "all" && potName === selectedPot && remaining.length === 0) {
                setSelectedPot("all");
              }
              return next;
            });

            Alert.alert("Deleted", "Report successfully deleted!");
          } catch (err) {
            console.error("Error deleting report:", err.message);
            Alert.alert("Error", "Failed to delete report.");
          }
        },
      },
    ]);
  };

  const deleteAllFiltered = async () => {
    const toDelete = filteredHistory;
    if (toDelete.length === 0) return;

    Alert.alert(
      "Delete All",
      `Are you sure you want to delete all ${toDelete.length} report(s) in ${selectedPot === "all" ? "all pots" : selectedPot}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            try {
              const ids = toDelete.map((r) => r.id);
              const { error } = await supabase.from("soil_results").delete().in("id", ids);
              if (error) throw error;

              setHistory((prev) => prev.filter((h) => !ids.includes(h.id)));
              setSelectedPot("all");
              setSelectMode(false);
              setMenuOpen(false);
              setSelectedItems([]);
              Alert.alert("Success", `${ids.length} report(s) deleted!`);
            } catch (err) {
              console.error("Error deleting reports:", err.message);
              Alert.alert("Error", "Failed to delete reports.");
            }
          },
        },
      ]
    );
  };

  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    setSelectedItems([]);
    setMenuOpen(false);
  };

  const toggleSelectItem = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const deleteSelected = async () => {
    if (selectedItems.length === 0) return;

    Alert.alert(
      "Delete Selected",
      `Delete ${selectedItems.length} selected report(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.from("soil_results").delete().in("id", selectedItems);
              if (error) throw error;

              setHistory((prev) => prev.filter((h) => !selectedItems.includes(h.id)));
              setSelectedItems([]);
              setSelectMode(false);
              setMenuOpen(false);
              Alert.alert("Success", `${selectedItems.length} report(s) deleted!`);
            } catch (err) {
              console.error("Error deleting reports:", err.message);
              Alert.alert("Error", "Failed to delete selected reports.");
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

  const PotFilterChips = () => (
    <>
      {/* Chips with divider */}
      <View style={styles.filterSection}>
        <View style={styles.filterRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.potScroll}
            style={styles.potScrollContainer}
          >
            {uniquePots.map((pot) => (
              <TouchableOpacity
                key={pot}
                style={[styles.potChip, selectedPot === pot && styles.potChipSelected]}
                onPress={() => setSelectedPot(pot)}
              >
                <Text
                  numberOfLines={1}
                  style={[styles.potChipText, selectedPot === pot && styles.potChipTextSelected]}
                >
                  {pot === "all" ? "All Pots/Plots" : `🪴 ${pot}`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Below the divider: Select button or two actions */}
      {!selectMode && filteredHistory.length > 0 && (
        <View style={styles.manageRow}>
          <TouchableOpacity
            onPress={() => {
              setSelectMode(true);
              setMenuOpen(true);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.textButton}>Select</Text>
          </TouchableOpacity>
        </View>
      )}

      {menuOpen && selectMode && filteredHistory.length > 0 && (
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonActive]}
            onPress={() => {
              setSelectMode(false);
              setSelectedItems([]);
              setMenuOpen(false);
            }}
          >
            <Text style={[styles.actionButtonText, styles.actionButtonTextActive]}>
              Cancel Selection
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.deleteAllButton,
            ]}
            onPress={() => {
              if (selectedItems.length > 0) {
                setMenuOpen(false);
                deleteSelected();
              } else {
                setMenuOpen(false);
                deleteAllFiltered();
              }
            }}
          >
            <Text style={styles.deleteAllButtonText}>
              {selectedItems.length > 0 ? "Delete" : "Delete All"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  const ReportCard = ({ item }) => {
    const date = item.createdAt ? new Date(item.createdAt) : new Date();
    const isSelected = selectedItems.includes(item.id);
    
    return (
  <View style={[styles.card, isSelected && styles.cardSelectedContainer]}>
        <TouchableOpacity 
          style={styles.cardContent}
          onPress={() => selectMode ? toggleSelectItem(item.id) : openReport(item)}
        >
          {item.soilImage && <Image source={{ uri: item.soilImage }} style={styles.thumbnail} />}
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, isSelected && styles.textWhite]}>
              {item.potName} | {item.recommendedCrop === 'no_crop' ? 'No Crop' : item.recommendedCrop} | {item.prediction === 'No soil detected' ? 'No Soil Detected' : item.prediction}
            </Text>
            <Text style={[styles.cardSubtitle, isSelected && styles.textWhite]}>{format(date, "PPPpp")}</Text>
            <Text style={[styles.cardNutrients, isSelected && styles.textWhite]}>
              N: {item.nitrogen} | P: {item.phosphorus} | K: {item.potassium} | pH: {item.phLevel}
            </Text>
          </View>
        </TouchableOpacity>
        {!selectMode && (
          <TouchableOpacity
            onPress={() => deleteReport(item.id, item.potName)}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteText}>🗑️</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <LottieView
          source={require("../../assets/animations/spinner.json")}
          autoPlay
          loop
          style={{ width: width * 0.18, height: width * 0.18 }}
        />
        <Text style={styles.loadingText}>Loading...</Text>
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
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/main")}
            style={{ marginTop: 12, backgroundColor: '#2e7d32', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Add Report</Text>
          </TouchableOpacity>
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
  loadingText: { marginTop: 5, fontSize: 14, color: "#6B7280", fontWeight: "500" },
  
  // Filter Section
  filterSection: { 
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0"
  },
  filterRow: {
    height: 48,
  },
  potScrollContainer: {
    flex: 1,
  },
  potScroll: { 
    paddingVertical: 4,
  },
  potChip: { 
    backgroundColor: "#e0e0e0", 
    paddingHorizontal: 16, 
    paddingVertical: 8,
    borderRadius: 20, 
    marginRight: 8, 
    justifyContent: "center", 
    alignItems: "center",
    minHeight: 36,
    flexDirection: "row",
  },
  potChipSelected: { backgroundColor: "#2e7d32" },
  potChipText: { 
    fontSize: 14, 
    color: "#333", 
    fontWeight: "600",
  },
  potChipTextSelected: { color: "#fff" },
  
  // Delete chip below chips, right-aligned
  deleteChipRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  deleteChip: {
    backgroundColor: "#ffebee",
    borderWidth: 1,
    borderColor: "#ef5350",
  },
  deleteChipText: {
    color: "#d32f2f",
    fontWeight: "700",
  },
  // New manage row & text button styles
  manageRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: -4,
    marginBottom: 8,
  },
  textButton: {
    color: "#2e7d32",
    fontWeight: "800",
    fontSize: 15,
  },
  
  // Action Buttons Container
  actionButtonsContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: -3,
    marginBottom: 8,
  },
  actionButton: { 
    flex: 1, 
    backgroundColor: "#f5f5f5", 
    paddingVertical: 10, 
    paddingHorizontal: 12, 
    borderRadius: 8, 
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0"
  },
  actionButtonActive: { 
    backgroundColor: "#2e7d32", 
    borderColor: "#2e7d32" 
  },
  actionButtonText: { 
    fontSize: 13, 
    fontWeight: "600", 
    color: "#333" 
  },
  actionButtonTextActive: { color: "#fff" },
  deleteAllButton: { 
    backgroundColor: "#ffebee", 
    borderColor: "#ef5350" 
  },
  deleteSelectedButton: { 
    backgroundColor: "#d32f2f", 
    borderColor: "#d32f2f" 
  },
  deleteAllButtonText: { 
    fontSize: 13, 
    fontWeight: "600", 
    color: "#d32f2f" 
  },
  
  // Cards
  card: { flexDirection: "row", backgroundColor: "#f3f3f3", padding: 10, borderRadius: 10, marginBottom: 10, marginTop: 5, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2 },
  cardSelectedContainer: { backgroundColor: "#2e7d32" },
  cardContent: { flexDirection: "row", flex: 1 },
  thumbnail: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#002d00" },
  cardSubtitle: { fontSize: 14, color: "#333", marginBottom: 2 },
  cardNutrients: { fontSize: 13, color: "#444" },
  textWhite: { color: "#fff" },
  deleteButton: { marginLeft: 8, padding: 6, backgroundColor: "#ffdddd", borderRadius: 10 },
  deleteText: { fontSize: 18 },
});
