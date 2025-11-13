// app/report.js
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSoil } from "../context/soilContext";
import { supabase } from "../lib/supabase";
import { sanitizeSoilTexture } from "../utils/helpers";

const COLORS = {
  high: "#4caf50",      // green
  modHigh: "#fbc02d",   // yellow
  modLow: "#fb8c00",    // orange
  low: "#c62828",       // red
};

// Soil pH categories
function getPhCategory(pH) {
  if (pH < 4.6) return { label: "Extremely Acidic", color: COLORS.low };
  if (pH >= 4.6 && pH <= 5.5) return { label: "Strongly Acidic", color: COLORS.modLow };
  if (pH >= 5.6 && pH <= 6.5) return { label: "Acidic", color: COLORS.modHigh };
  if (pH >= 6.6 && pH <= 7.5) return { label: "Neutral", color: COLORS.high };
  if (pH >= 7.6 && pH <= 8.5) return { label: "Alkaline", color: COLORS.modHigh };
  if (pH >= 8.6 && pH <= 9.1) return { label: "Strongly Alkaline", color: COLORS.modLow };
  if (pH > 9.1) return { label: "Extremely Alkaline", color: COLORS.low };
  return { label: "Unknown", color: COLORS.low };
}

const ReportScreen = () => {
  const { soilData: mappedSoilData } = useSoil();
  const [soilData, setSoilData] = useState(mappedSoilData || null);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();
  const { reportId } = useLocalSearchParams();

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Intl.DateTimeFormat("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(dateString));
  };

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return;

        let report = null;

        if (reportId) {
          const { data, error } = await supabase
            .from("soil_results")
            .select("*")
            .eq("user_id", user.id)
            .eq("id", reportId)
            .single();
          if (error) throw error;
          report = data;
        } else if (mappedSoilData) {
          report = mappedSoilData;
        } else {
          const { data, error } = await supabase
            .from("soil_results")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1);
          if (error) throw error;
          report = data[0];
        }

        if (!report) {
          setSoilData(null);
        } else {
          setSoilData({
            potName: report.pot_name || report.potName || "Unnamed Pot/Plot",
            soilTexture: sanitizeSoilTexture(report.prediction || report.soilTexture || "Not detected"),
            recommendedCrop: report.recommended_crop || report.recommendedCrop || "No recommendation",
            nitrogen: report.n ?? report.nitrogen,
            phosphorus: report.p ?? report.phosphorus,
            potassium: report.k ?? report.potassium,
            phLevel: report.ph_level ?? report.phLevel,
            soilImage: report.image_url || report.soilImage,
            companions: report.companions || report.companions || [],
            avoid: report.avoids || report.avoid || [],
            generatedAt: report.created_at || report.generatedAt,
          });
          console.log("📊 report.js - Soil data loaded:", {
            potName: report.pot_name || report.potName,
            nitrogen: report.n ?? report.nitrogen,
            phosphorus: report.p ?? report.phosphorus,
            potassium: report.k ?? report.potassium,
            phLevel: report.ph_level ?? report.phLevel,
          });
        }
      } catch (err) {
        console.error("Error fetching report:", err.message);
        setSoilData(null);
      } finally {
        setLoaded(true);
      }
    };

    fetchReport();
  }, [reportId, mappedSoilData]);

  if (!loaded) return null;

  if (!soilData) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>No report available.</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/(tabs)/main")}
        >
          <Text style={styles.buttonText}>Go to Main</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const nutrients = [
    { label: "Nitrogen", value: soilData.nitrogen, color: "#388e3c", icon: <Ionicons name="leaf" size={24} color="#fff" /> },
    { label: "Phosphorus", value: soilData.phosphorus, color: "#43a047", icon: <MaterialCommunityIcons name="beaker-outline" size={24} color="#fff" /> },
    { label: "Potassium", value: soilData.potassium, color: "#66bb6a", icon: <MaterialCommunityIcons name="flask" size={24} color="#fff" /> },
    { label: "pH", value: soilData.phLevel, color: "#81c784", icon: <Ionicons name="water" size={24} color="#fff" /> },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonFloat}>
          <Ionicons name="arrow-back" size={22} color="#2e7d32" />
        </TouchableOpacity>
        <Image
          source={require("../assets/farmulate-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>
          <MaterialCommunityIcons name="sprout" size={28} color="#2e7d32" /> Soil Report
        </Text>

        <View style={styles.metaBox}>
          <Text
            style={styles.metaTitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            🪴 {soilData.potName || "Unnamed Pot/Plot"}
          </Text>
          <Text style={styles.metaDate}>{formatDate(soilData.generatedAt)}</Text>
        </View>

        <View style={styles.card}>
          {soilData.soilImage && (
            <Image
              source={{ uri: soilData.soilImage }}
              style={styles.image}
              resizeMode="cover"
            />
          )}
          <View style={styles.tagGreen}>
            <Text style={styles.tagText}>Soil Texture: {soilData.soilTexture}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          <MaterialCommunityIcons name="repeat" size={22} color="#2e7d32" /> Crop Rotation
        </Text>
        <View style={styles.highlightCard}>
          <Text style={styles.subHeader}>Recommended Crop</Text>
          <View style={styles.nextCropBox}>
            <Text style={styles.nextCropText}>{soilData.recommendedCrop}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          <MaterialCommunityIcons name="flower" size={22} color="#2e7d32" /> Companion Planting
        </Text>
        <View style={styles.card}>
          <View style={styles.companionHeaderRow}>
            <Text style={[styles.subHeader, { flex: 1, textAlign: "center" }]}>Best Companions</Text>
            <Text style={[styles.subHeader, { flex: 1, textAlign: "center" }]}>Crops to Avoid</Text>
          </View>
          <View style={styles.companionListRow}>
            <View style={{ flex: 1 }}>
              {soilData.companions.map((c, idx) => (
                <Text key={`companion-${idx}`} style={styles.goodCropItem}>{c}</Text>
              ))}
            </View>
            <View style={{ flex: 1 }}>
              {soilData.avoid.map((a, idx) => (
                <Text key={`avoid-${idx}`} style={styles.badCropItem}>{a}</Text>
              ))}
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          <MaterialCommunityIcons name="chemical-weapon" size={22} color="#2e7d32" /> Soil Nutrients
        </Text>

        <View style={styles.card}>
          <View style={styles.nutrientGrid}>
            {nutrients.map((n, idx) => {
              const isPh = n.label === "pH";
              const phCategory = isPh ? getPhCategory(parseFloat(n.value)) : null;

              return (
                <View
                  key={idx}
                  style={[
                    styles.nutrientBox,
                    { 
                      backgroundColor: isPh && phCategory ? phCategory.color : n.color,
                      height: 140,          // fixed height for all boxes
                      justifyContent: "center"
                    },
                  ]}
                >
                  {n.icon}
                  <Text style={styles.nutrientValue}>{n.value}</Text>
                  <Text style={styles.nutrientLabel}>{n.label}</Text>

                  {isPh && phCategory && (
                    <Text style={[styles.phCategoryText, { color: "#fff", marginTop: 4 }]}>
                      {phCategory.label}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default ReportScreen;

// ------------------------------
// Styles remain unchanged
const styles = StyleSheet.create({

  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: { flexDirection: "row", backgroundColor: "#002d00", justifyContent: "center", height: 65 },
  backButtonFloat: { backgroundColor: "#fff", borderRadius: 20, padding: 8, marginTop: 5, elevation: 4, marginRight: 160, shadowColor: "#000", shadowOpacity: 0.15, shadowOffset: { width: 0, height: 2 }, shadowRadius: 3, alignSelf: "center" },
  logo: { marginTop: -15, height: 100, width: 150, right: 145 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  sectionTitle: { fontSize: 25, fontWeight: "600", marginVertical: 12, color: "#000" },
  metaBox: { backgroundColor: "#fff", borderRadius: 12, padding: 12, marginHorizontal: 16, marginTop: 12, marginBottom: 8, alignItems: "center" },
  metaTitle: { fontSize: 18, fontWeight: "bold", color: "#2e7d32", marginBottom: 4 },
  metaDate: { fontSize: 14, color: "#555" },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 16 },
  image: { width: "100%", height: 150, borderRadius: 12, marginBottom: 10 },
  tagGreen: { backgroundColor: "#388e3c", padding: 8, borderRadius: 8, alignItems: "center" },
  tagText: { color: "#fff", fontWeight: "600" },
  nutrientGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 12 },
  nutrientBox: { width: "48%", borderRadius: 12, padding: 12, marginBottom: 12, alignItems: "center" },
  nutrientValue: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  nutrientLabel: { fontSize: 14, color: "#fff", marginTop: 4 },
  highlightCard: { backgroundColor: "#e8f5e9", borderRadius: 12, padding: 16, marginBottom: 16, alignItems: "center" },
  nextCropBox: { marginTop: 8, backgroundColor: "#2e7d32", paddingVertical: 12, paddingHorizontal: 60, borderRadius: 8 },
  nextCropText: { fontSize: 20, fontWeight: "bold", color: "#fff", textAlign: "center" },
  companionHeaderRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  companionListRow: { flexDirection: "row", justifyContent: "space-between" },
  goodCropItem: { backgroundColor: "#e8f5e9", color: "#2e7d32", paddingVertical: 5, marginVertical: 2, borderRadius: 4, textAlign: "center", fontWeight: "500", marginHorizontal: 10 },
  badCropItem: { backgroundColor: "#ffebee", color: "#c62828", paddingVertical: 6, marginVertical: 2, borderRadius: 4, textAlign: "center", fontWeight: "500", marginHorizontal: 10 },
  subHeader: { fontSize: 14, fontWeight: "bold", color: "#000", textAlign: "center" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { fontSize: 16, color: "#555" },
  button: { marginTop: 10, backgroundColor: "#2e7d32", padding: 10, borderRadius: 8 },
  buttonText: { color: "#fff", fontWeight: "600" },
});