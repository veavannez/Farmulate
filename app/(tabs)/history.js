import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSoil } from "../../context/SoilContext";
import { format } from "date-fns";

export default function HistoryScreen() {
  const { history, setSoilData, clearHistory } = useSoil();
  const router = useRouter();

  const openReport = (item) => {
    setSoilData(item);       // load into context
    router.push("/report");  // navigate to hidden report
  };

  const confirmClear = () => {
    Alert.alert("Clear History", "Are you sure you want to delete all saved reports?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: clearHistory },
    ]);
  };

  const renderItem = ({ item }) => {
    const date = item.generatedAt ? new Date(item.generatedAt) : new Date(item.id);

    return (
      <TouchableOpacity style={styles.card} onPress={() => openReport(item)}>
        {/* Thumbnail if soilImage exists */}
        {item.soilImage && (
          <Image source={{ uri: item.soilImage }} style={styles.thumbnail} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>
            {item.soilTexture} | {item.soilHealth}
          </Text>
          <Text style={styles.cardSubtitle}>{format(date, "PPPpp")}</Text>
          <Text style={styles.cardNutrients}>
            N: {item.nitrogen} | P: {item.phosphorus} | K: {item.potassium} | pH:{" "}
            {item.phLevel}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>History</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={confirmClear}>
            <Text style={styles.clearText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {history.length === 0 ? (
        <Text style={styles.empty}>No reports saved yet.</Text>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          removeClippedSubviews={false} // ✅ prevents key duplication/rendering issues
        />
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
  clearText: { fontSize: 14, color: "red", fontWeight: "bold" },
  empty: { fontSize: 16, color: "#777", marginTop: 20 },
  card: {
    flexDirection: "row",
    backgroundColor: "#e9e9e9",
    padding: 12,
    borderRadius: 12,
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
  cardNutrients: { fontSize: 14, color: "#444" },
});
