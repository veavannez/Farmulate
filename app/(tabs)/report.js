import React from "react";
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
import { useSoil } from "../../context/SoilContext";
import {
  getPhCategory,
  getPhosphorusCategory,
  getNitrogenCategory,
  getPotassiumCategory,
} from "../../utils/helpers";

const ReportScreen = () => {
  const { soilData } = useSoil();
  const router = useRouter();

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

  // Get categories
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Soil Report</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Soil Report */}
        <Text style={styles.sectionTitle}>
          <MaterialCommunityIcons name="sprout" size={22} color="#2e7d32" /> Soil Report
        </Text>

        {/* Soil Image + Texture */}
        <View style={styles.card}>
          {soilData.soilImage && (
            <Image
              source={{ uri: soilData.soilImage }}
              style={styles.image}
              resizeMode="cover"
            />
          )}
          <View style={styles.tag}>
            <Text style={styles.tagText}>
              Soil Texture: {soilData.soilTexture}
            </Text>
          </View>
        </View>

        {/* Soil Health + Nutrients */}
        <View style={styles.card}>
          <View style={styles.tagYellow}>
            <Text style={styles.tagText}>
              Soil Health: {soilData.soilHealth}
            </Text>
          </View>

          {/* Nutrient Grid */}
          <View style={styles.nutrientGrid}>
            <View style={[styles.nutrientBox, { backgroundColor: nitrogenCategory.color }]}>
              <Ionicons name="leaf" size={26} color="#fff" />
              <Text style={styles.nutrientValue}>{soilData.nitrogen}</Text>
              <Text style={styles.nutrientLabel}>Nitrogen</Text>
              <Text style={styles.nutrientStatus}>{nitrogenCategory.label}</Text>
            </View>
            <View style={[styles.nutrientBox, { backgroundColor: phosphorusCategory.color }]}>
              <MaterialCommunityIcons name="test-tube" size={26} color="#fff" />
              <Text style={styles.nutrientValue}>{soilData.phosphorus}</Text>
              <Text style={styles.nutrientLabel}>Phosphorus</Text>
              <Text style={styles.nutrientStatus}>{phosphorusCategory.label}</Text>
            </View>
            <View style={[styles.nutrientBox, { backgroundColor: potassiumCategory.color }]}>
              <MaterialCommunityIcons name="chemical-weapon" size={26} color="#fff" />
              <Text style={styles.nutrientValue}>{soilData.potassium}</Text>
              <Text style={styles.nutrientLabel}>Potassium</Text>
              <Text style={styles.nutrientStatus}>{potassiumCategory.label}</Text>
            </View>
            <View style={[styles.nutrientBox, { backgroundColor: phCategory.color }]}>
              <Ionicons name="water" size={26} color="#fff" />
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
          <View style={styles.companionRow}>
            <View style={styles.companionColumn}>
              <Text style={styles.subHeader}>Best Companions</Text>
              {soilData.companions?.map((c, idx) => (
                <Text key={idx} style={styles.goodCrop}>
                  {c}
                </Text>
              ))}
            </View>
            <View style={styles.companionColumn}>
              <Text style={styles.subHeader}>Crops to Avoid</Text>
              {soilData.avoid?.map((a, idx) => (
                <Text key={idx} style={styles.badCrop}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1b5e20",
    paddingVertical: 14,
    paddingHorizontal: 16,
    elevation: 3,
  },
  backButton: { marginRight: 10 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "bold" },

  scrollContent: { padding: 20 },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#222",
    marginBottom: 12,
    marginTop: 16,
  },

  card: {
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  tag: {
    backgroundColor: "#4caf50",
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 14,
  },
  tagYellow: {
    backgroundColor: "#fbc02d",
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 14,
  },
  tagText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  nutrientGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  nutrientBox: {
    width: "48%",
    marginBottom: 14,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  nutrientValue: { color: "#fff", fontSize: 22, fontWeight: "900" },
  nutrientLabel: {
    color: "#fff",
    fontSize: 15,
    marginTop: 6,
    fontWeight: "600",
  },
  nutrientStatus: {
    color: "#fff",
    fontSize: 13,
    marginTop: 2,
    fontStyle: "italic",
  },

  insightBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2e7d32",
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  insightText: {
    color: "#fff",
    fontSize: 15,
    marginLeft: 6,
    flex: 1,
    flexWrap: "wrap",
  },

  highlightCard: {
    backgroundColor: "#e8f5e9",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    alignItems: "center",
  },
  subHeader: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#1b5e20",
  },
  nextCropBox: {
    backgroundColor: "#2e7d32",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 30,
    alignItems: "center",
  },
  nextCropText: { color: "#fff", fontSize: 22, fontWeight: "bold" },

  companionRow: { flexDirection: "row", justifyContent: "space-between" },
  companionColumn: { flex: 1, marginHorizontal: 6 },

  goodCrop: {
    backgroundColor: "#4caf50",
    color: "#fff",
    padding: 8,
    borderRadius: 8,
    marginVertical: 4,
    textAlign: "center",
    fontWeight: "600",
  },
  badCrop: {
    backgroundColor: "#c62828",
    color: "#fff",
    padding: 8,
    borderRadius: 8,
    marginVertical: 4,
    textAlign: "center",
    fontWeight: "600",
  },

  image: {
    width: "100%",
    height: 200,
    borderRadius: 14,
    marginBottom: 10,
  },

  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { fontSize: 16, color: "#777", marginBottom: 20 },
  button: {
    backgroundColor: "#1b5e20",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});

export default ReportScreen;
