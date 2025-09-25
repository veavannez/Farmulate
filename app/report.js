// app/(tabs)/report.js
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
import { useSoil } from "../context/SoilContext";
import {
  getPhCategory,
  getPhosphorusCategory,
  getNitrogenCategory,
  getPotassiumCategory,
} from "../utils/helpers";

const ReportScreen = () => {
  const { soilData, addToHistory } = useSoil();
  const router = useRouter();

  // ✅ Save report to history when opened
  useEffect(() => {
    if (soilData) {
      addToHistory({
        ...soilData,
        id: soilData.id || Date.now(), // unique ID
        generatedAt: soilData.generatedAt || new Date().toISOString(),
      });
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
          <MaterialCommunityIcons name="sprout" size={22} color="#2e7d32" /> Soil
          Report
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
            <View
              style={[
                styles.nutrientBox,
                { backgroundColor: nitrogenCategory.color },
              ]}
            >
              <Ionicons name="leaf" size={26} color="#fff" />
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
              <MaterialCommunityIcons name="test-tube" size={26} color="#fff" />
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
              <MaterialCommunityIcons
                name="chemical-weapon"
                size={26}
                color="#fff"
              />
              <Text style={styles.nutrientValue}>{soilData.potassium}</Text>
              <Text style={styles.nutrientLabel}>Potassium</Text>
              <Text style={styles.nutrientStatus}>
                {potassiumCategory.label}
              </Text>
            </View>

            <View
              style={[styles.nutrientBox, { backgroundColor: phCategory.color }]}
            >
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
          <MaterialCommunityIcons name="repeat" size={22} color="#2e7d32" /> Crop
          Rotation
        </Text>
        <View style={styles.highlightCard}>
          <Text style={styles.subHeader}>Recommended Next Crop</Text>
          <View style={styles.nextCropBox}>
            <Text style={styles.nextCropText}>{soilData.nextCrop}</Text>
          </View>
        </View>

        {/* Companion Planting */}
        <Text style={styles.sectionTitle}>
          <MaterialCommunityIcons name="flower" size={22} color="#2e7d32" />{" "}
          Companion Planting
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
