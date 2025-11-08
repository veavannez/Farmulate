// app/report.js
import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSoil } from "../context/soilContext";
import {
  getPhCategory,
  getPhosphorusCategory,
  getNitrogenCategory,
  getPotassiumCategory,
} from "../utils/helpers";

const ReportScreen = () => {
  const { soilData, addToHistory, history } = useSoil();
  const router = useRouter();

  useEffect(() => {
    if (soilData) {
      const reportId = soilData.id || Date.now().toString();
      const alreadyExists = history.some((h) => h.id === reportId);

      if (!alreadyExists) {
        addToHistory({
          ...soilData,
          id: reportId,
          generatedAt: soilData.generatedAt || new Date().toISOString(),
        });
      }
    }
  }, [soilData]);

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

  const phCategory = getPhCategory(soilData.phLevel);
  const phosphorusCategory = getPhosphorusCategory(
    soilData.phosphorus,
    soilData.phLevel
  );
  const nitrogenCategory = getNitrogenCategory(soilData.nitrogen);
  const potassiumCategory = getPotassiumCategory(soilData.potassium);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButtonFloat}
        >
          <Ionicons name="arrow-back" size={22} color="#2e7d32" />
        </TouchableOpacity>

        <Image
          source={require("../assets/farmulate-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Soil Report */}
        <Text style={styles.sectionTitle}>
          <MaterialCommunityIcons name="sprout" size={28} color="#2e7d32" /> Soil Report
        </Text>

        {/* Pot/Plot + Date Info */}
        <View style={styles.metaBox}>
          <Text style={styles.metaTitle}>🪴 {soilData.potName}</Text>
          <Text style={styles.metaDate}>
            {new Date(soilData.generatedAt || Date.now()).toLocaleString()}
          </Text>
        </View>

        {/* Soil Image + Texture */}
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

        {/* Nutrients only */}
        <View style={styles.card}>
          <View style={styles.nutrientGrid}>
            <View
              style={[
                styles.nutrientBox,
                { backgroundColor: nitrogenCategory.color },
              ]}
            >
              <Ionicons name="leaf" size={24} color="#fff" />
              <Text style={styles.nutrientValue}>{soilData.nitrogen}</Text>
              <Text style={styles.nutrientLabel}>Nitrogen</Text>
              <Text style={styles.nutrientStatus}>
                {nitrogenCategory.label}
              </Text>
            </View>

            <View
              style={[
                styles.nutrientBox,
                { backgroundColor: phosphorusCategory.color },
              ]}
            >
              <MaterialCommunityIcons
                name="beaker-outline"
                size={24}
                color="#fff"
              />
              <Text style={styles.nutrientValue}>{soilData.phosphorus}</Text>
              <Text style={styles.nutrientLabel}>Phosphorus</Text>
              <Text style={styles.nutrientStatus}>
                {phosphorusCategory.label}
              </Text>
            </View>

            <View
              style={[
                styles.nutrientBox,
                { backgroundColor: potassiumCategory.color },
              ]}
            >
              <MaterialCommunityIcons name="flask" size={24} color="#fff" />
              <Text style={styles.nutrientValue}>{soilData.potassium}</Text>
              <Text style={styles.nutrientLabel}>Potassium</Text>
              <Text style={styles.nutrientStatus}>
                {potassiumCategory.label}
              </Text>
            </View>

            <View
              style={[styles.nutrientBox, { backgroundColor: phCategory.color }]}
            >
              <Ionicons name="water" size={24} color="#fff" />
              <Text style={styles.nutrientValue}>{soilData.phLevel}</Text>
              <Text style={styles.nutrientLabel}>pH</Text>
              <Text style={styles.nutrientStatus}>{phCategory.label}</Text>
            </View>
          </View>

          {/* Insight */}
          <View style={styles.insightBox}>
            <Ionicons name="bulb" size={18} color="#fff" />
            <Text style={styles.insightText}>{soilData.insight}</Text>
          </View>
        </View>

        {/* Crop Rotation */}
        <Text style={styles.sectionTitle}>
          <MaterialCommunityIcons name="repeat" size={22} color="#2e7d32" /> Crop Rotation
        </Text>
        <View style={styles.highlightCard}>
          <Text style={styles.subHeader}>Recommended Next Crop</Text>
          <View style={styles.nextCropBox}>
            <Text style={styles.nextCropText}>{soilData.nextCrop}</Text>
          </View>
        </View>

        {/* Companion Planting */}
        <Text style={styles.sectionTitle}>
          <MaterialCommunityIcons name="flower" size={22} color="#2e7d32" /> Companion Planting
        </Text>
        <View style={styles.card}>
          <View style={styles.companionHeaderRow}>
            <Text style={[styles.subHeader, { flex: 1, textAlign: "center" }]}>
              Best Companions
            </Text>
            <Text style={[styles.subHeader, { flex: 1, textAlign: "center" }]}>
              Crops to Avoid
            </Text>
          </View>
          <View style={styles.companionListRow}>
            <View style={{ flex: 1 }}>
              {soilData.companions?.map((c, idx) => (
                <Text key={`companion-${idx}`} style={styles.goodCropItem}>
                  {c}
                </Text>
              ))}
            </View>
            <View style={{ flex: 1 }}>
              {soilData.avoid?.map((a, idx) => (
                <Text key={`avoid-${idx}`} style={styles.badCropItem}>
                  {a}
                </Text>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default ReportScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    flexDirection: "row",
    backgroundColor: "#002d00",
    justifyContent: "center",
    height: 90,
  },
  backButtonFloat: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 8,
    marginTop: 22,
    elevation: 4,
    marginRight: 160,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    alignSelf: "center",
  },
  logo: {
    marginTop: 7,
    height: 100,
    width: 150,
    right: 145,
  },
  scrollContent: { padding: 16, paddingBottom: 100 },
  sectionTitle: {
    fontSize: 25,
    fontWeight: "600",
    marginVertical: 12,
    color: "#000",
  },
  metaBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    alignItems: "center",
  },
  metaTitle: { fontSize: 18, fontWeight: "bold", color: "#2e7d32", marginBottom: 4 },
  metaDate: { fontSize: 14, color: "#555" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  ard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  image: { width: "100%", height: 150, borderRadius: 12, marginBottom: 10 },
  tagGreen: {
    backgroundColor: "#388e3c",
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  tagText: { color: "#fff", fontWeight: "600" },
  nutrientGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 12,
  },
  nutrientBox: {
    width: "48%",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  nutrientValue: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  nutrientLabel: { fontSize: 14, color: "#fff", marginTop: 4 },
  nutrientStatus: { fontSize: 12, color: "#fff", marginTop: 2 },
  insightBox: {
    backgroundColor: "#2e7d32",
    padding: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  insightText: { color: "#fff", marginLeft: 6, flex: 1 },
  highlightCard: {
    backgroundColor: "#e8f5e9",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  nextCropBox: {
    marginTop: 8,
    backgroundColor: "#2e7d32",
    paddingVertical: 12,
    paddingHorizontal: 60,
    borderRadius: 8,
  },
  nextCropText: { fontSize: 20, fontWeight: "bold", color: "#fff", textAlign: "center" },
  companionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  companionListRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  goodCropItem: {
    backgroundColor: "#e8f5e9",
    color: "#2e7d32",
    paddingVertical: 5,
    marginVertical: 2,
    borderRadius: 4,
    textAlign: "center",
    fontWeight: "500",
    marginHorizontal: 10,
  },
  badCropItem: {
    backgroundColor: "#ffebee",
    color: "#c62828",
    paddingVertical: 6,
    marginVertical: 2,
    borderRadius: 4,
    textAlign: "center",
    fontWeight: "500",
    marginHorizontal: 10,
  },
  subHeader: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
  },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { fontSize: 16, color: "#555" },
  button: {
    marginTop: 10,
    backgroundColor: "#2e7d32",
    padding: 10,
    borderRadius: 8,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});