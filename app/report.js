// app/report.js
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  const [printing, setPrinting] = useState(false);
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

  const generatePDF = async () => {
    if (!soilData) return;
    
    setPrinting(true);
    try {
      // Prepare image source: embed as base64 to avoid remote-image failures in WebView/pdf
      let imageSrc = null;
      if (soilData.soilImage) {
        try {
          if (soilData.soilImage.startsWith('http')) {
            const tmpPath = `${FileSystem.cacheDirectory}soil_report_image.jpg`;
            const dl = await FileSystem.downloadAsync(soilData.soilImage, tmpPath);
            const b64 = await FileSystem.readAsStringAsync(dl.uri, { encoding: FileSystem.EncodingType.Base64 });
            imageSrc = `data:image/jpeg;base64,${b64}`;
          } else if (soilData.soilImage.startsWith('file://')) {
            const b64 = await FileSystem.readAsStringAsync(soilData.soilImage, { encoding: FileSystem.EncodingType.Base64 });
            imageSrc = `data:image/jpeg;base64,${b64}`;
          }
        } catch (imgErr) {
          console.warn('PDF image embed failed; falling back to placeholder:', imgErr?.message || imgErr);
        }
      }
      const phCategory = getPhCategory(parseFloat(soilData.phLevel));
      const isNoCrop = (soilData.recommendedCrop || "").toString().toLowerCase() === "no_crop" || soilData.recommendedCrop === "No suitable crops";
      const confPct = typeof soilData.confidence === 'number' ? Math.round(soilData.confidence * 100) : null;
      const recBoxClass = `recommendation-box${isNoCrop ? ' red' : ''}`;
      const recValueClass = `rec-value${isNoCrop ? ' red' : ''}`;
      const recText = isNoCrop ? 'No crop recommended' : soilData.recommendedCrop;
      const confidenceHtml = confPct !== null ? `<div class="confidence">Confidence: ${confPct}%</div>` : '';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Farmulate Soil Report - ${soilData.potName || 'Unnamed Pot/Plot'}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page { size: A4; margin: 1in; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 0;
              color: #1a1a1a;
              background: #fff;
              line-height: 1.5;
            }
            .header { 
              text-align: center; 
              margin-bottom: 16px;
              border-bottom: 3px solid #2e7d32;
              padding-bottom: 14px;
            }
            .logo-text {
              font-size: 24px;
              font-weight: bold;
              color: #2e7d32;
              margin-bottom: 4px;
              letter-spacing: 1px;
            }
            .subtitle { 
              color: #555; 
              font-size: 13px;
              font-style: italic;
              font-weight: 500;
            }
            .meta-bar {
              background: #f8f8f8;
              border: 1px solid #ddd;
              padding: 12px 18px;
              border-radius: 4px;
              margin-bottom: 18px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .meta-label {
              font-size: 10px;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 2px;
            }
            .meta-value {
              font-size: 13px;
              font-weight: 600;
              color: #1a1a1a;
            }
            .content-grid {
              display: grid;
              grid-template-columns: 350px 1fr;
              gap: 18px;
            }
            .left-column {
              display: flex;
              flex-direction: column;
              gap: 14px;
            }
            .panel {
              background: #fff;
              border: 1px solid #ddd;
              border-radius: 4px;
              padding: 14px;
              page-break-inside: avoid;
            }
            .section-header {
              font-size: 12px;
              font-weight: 700;
              color: #2e7d32;
              margin-bottom: 10px;
              text-transform: uppercase;
              letter-spacing: 0.8px;
              border-bottom: 2px solid #2e7d32;
              padding-bottom: 6px;
            }
            .soil-image {
              width: 100%;
              height: 180px;
              object-fit: cover;
              border-radius: 3px;
              border: 1px solid #ccc;
              margin-bottom: 10px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #eee;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .info-label {
              font-size: 11px;
              color: #666;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .info-value {
              font-size: 12px;
              color: #1a1a1a;
              font-weight: 600;
            }
            .nutrient-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 8px;
            }
            .nutrient-table th {
              background: #f5f5f5;
              padding: 8px;
              text-align: left;
              font-size: 10px;
              font-weight: 700;
              color: #555;
              text-transform: uppercase;
              border: 1px solid #ddd;
              letter-spacing: 0.5px;
            }
            .nutrient-table td {
              padding: 10px 8px;
              font-size: 12px;
              border: 1px solid #ddd;
              color: #1a1a1a;
            }
            .nutrient-name {
              font-weight: 600;
            }
            .nutrient-value {
              text-align: center;
              font-weight: 700;
              color: #2e7d32;
            }
            .nutrient-unit {
              text-align: center;
              font-size: 10px;
              color: #666;
            }
            .recommendation-box { background: #e8f5e9; border-left: 4px solid #2e7d32; padding: 12px; margin-top: 10px; }
            .recommendation-box.red { background: #ffebee; border-left-color: #c62828; }
            .rec-label {
              font-size: 10px;
              color: #555;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 4px;
            }
            .rec-value {
              font-size: 15px;
              font-weight: 700;
              color: #2e7d32;
            }
            .rec-value.red { color: #c62828; }
            .confidence { font-size: 11px; color: #555; margin-top: 6px; font-weight: 600; }
            .companion-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 14px;
              margin-top: 10px;
            }
            .companion-column h4 {
              font-size: 11px;
              margin-bottom: 8px;
              color: #1a1a1a;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .companion-list {
              list-style: none;
            }
            .companion-list li {
              padding: 6px 10px;
              margin-bottom: 4px;
              font-size: 11px;
              border-left: 3px solid;
              background: #f9f9f9;
              line-height: 1.4;
            }
            .good-companion {
              border-color: #2e7d32;
              color: #1b5e20;
            }
            .bad-companion {
              border-color: #c62828;
              color: #b71c1c;
            }
            .footer {
              margin-top: 16px;
              padding-top: 10px;
              border-top: 2px solid #ddd;
              text-align: center;
              color: #666;
              font-size: 9px;
              line-height: 1.4;
            }
            .report-id {
              font-size: 9px;
              color: #999;
              text-align: center;
              margin-top: 4px;
              font-family: 'Courier New', monospace;
              letter-spacing: 1px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-text">🌱 FARMULATE</div>
            <div class="subtitle">Soil Analysis Report</div>
          </div>

          <div class="meta-bar">
            <div>
              <div class="meta-label">Sample Location</div>
              <div class="meta-value">${soilData.potName || "Unnamed Pot/Plot"}</div>
            </div>
            <div style="text-align: right;">
              <div class="meta-label">Analysis Date</div>
              <div class="meta-value">${formatDate(soilData.generatedAt)}</div>
            </div>
          </div>

          <div class="content-grid">
            <!-- Left Column: Soil Analysis -->
            <div class="left-column">
              <div class="panel">
                <div class="section-header">Soil Sample Image</div>
                ${imageSrc ? `<img src="${imageSrc}" class="soil-image" alt="Soil Sample" />` : `<div style="height: 180px; background: #f0f0f0; border-radius: 3px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 11px; border: 1px dashed #ccc;">No Image Available</div>`}
              </div>

              <div class="panel">
                <div class="section-header">Soil Texture</div>
                <div class="info-row">
                  <div class="info-label">Classification</div>
                  <div class="info-value">${soilData.soilTexture}</div>
                </div>
              </div>

              <div class="panel">
                <div class="section-header">Soil Nutrients</div>
                <table class="nutrient-table">
                  <thead>
                    <tr>
                      <th>Nutrient</th>
                      <th style="text-align: center;">Value</th>
                      <th style="text-align: center;">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="nutrient-name">Nitrogen (N)</td>
                      <td class="nutrient-value">${soilData.nitrogen}</td>
                      <td class="nutrient-unit">mg/kg</td>
                    </tr>
                    <tr>
                      <td class="nutrient-name">Phosphorus (P)</td>
                      <td class="nutrient-value">${soilData.phosphorus}</td>
                      <td class="nutrient-unit">mg/kg</td>
                    </tr>
                    <tr>
                      <td class="nutrient-name">Potassium (K)</td>
                      <td class="nutrient-value">${soilData.potassium}</td>
                      <td class="nutrient-unit">mg/kg</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="panel">
                <div class="section-header">pH Level</div>
                <div class="info-row">
                  <div class="info-label">pH Value</div>
                  <div class="info-value">${soilData.phLevel}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Classification</div>
                  <div class="info-value">${phCategory.label}</div>
                </div>
              </div>
            </div>

            <!-- Right Column: Recommendations -->
            <div>
              <div class="panel">
                <div class="section-header">Recommended Crop</div>
                <div class="${recBoxClass}">
                  <div class="rec-label">Optimal Crop for Current Soil</div>
                  <div class="${recValueClass}">${recText}</div>
                  ${confidenceHtml}
                </div>
              </div>

              <div class="panel" style="margin-top: 14px;">
                <div class="section-header">Companion Planting</div>
                <div class="companion-grid">
                  <div class="companion-column">
                    <h4>Compatible Crops</h4>
                    <ul class="companion-list">
                      ${soilData.companions.slice(0, 5).map(c => `<li class="good-companion">${c}</li>`).join('')}
                    </ul>
                  </div>
                  <div class="companion-column">
                    <h4>Incompatible Crops</h4>
                    <ul class="companion-list">
                      ${soilData.avoid.slice(0, 5).map(a => `<li class="bad-companion">${a}</li>`).join('')}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="footer">
            This report has been generated by Farmulate.<br>
            For agricultural advisory purposes only. Consult with a certified agronomist for detailed recommendations.
          </div>
          <div class="report-id">REPORT ID: FSA-${Date.now().toString(36).toUpperCase()}</div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });

      // Build industry-standard filename: Farmulate_Report_<pot>_<YYYY-MM-DD>.pdf
      const safePot = (soilData.potName || 'Unnamed Pot').toString().replace(/[^a-z0-9_\-]+/gi, '_').replace(/^_+|_+$/g, '');
      const dateStr = new Date(soilData.generatedAt || Date.now()).toISOString().slice(0, 10);
      const finalName = `Farmulate_Report_${safePot}_${dateStr}.pdf`;
      const destUri = `${FileSystem.documentDirectory}${finalName}`;

      try {
        await FileSystem.moveAsync({ from: uri, to: destUri });
      } catch (moveErr) {
        // Fallback: if move fails, keep original uri but still use naming in share dialog
        console.warn('Could not move PDF to documents directory:', moveErr?.message || moveErr);
      }
      
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(destUri || uri, {
          mimeType: 'application/pdf',
          dialogTitle: finalName,
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('Success', `PDF generated: ${finalName}`);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF. Please try again.');
    } finally {
      setPrinting(false);
    }
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
            confidence: (typeof report.crop_confidence === 'number' ? report.crop_confidence : (report.confidence ?? null)),
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
    { label: "Nitrogen", unit: "mg/kg", value: soilData.nitrogen, color: "#388e3c", icon: <Ionicons name="leaf" size={24} color="#fff" /> },
    { label: "Phosphorus", unit: "mg/kg", value: soilData.phosphorus, color: "#43a047", icon: <MaterialCommunityIcons name="beaker-outline" size={24} color="#fff" /> },
    { label: "Potassium", unit: "mg/kg", value: soilData.potassium, color: "#66bb6a", icon: <MaterialCommunityIcons name="flask" size={24} color="#fff" /> },
    { label: "pH", unit: null, value: soilData.phLevel, color: "#81c784", icon: <Ionicons name="water" size={24} color="#fff" /> },
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
        <TouchableOpacity 
          onPress={generatePDF} 
          style={styles.printButton}
          disabled={printing}
        >
          {printing ? (
            <ActivityIndicator size="small" color="#2e7d32" />
          ) : (
            <Ionicons name="print" size={22} color="#2e7d32" />
          )}
        </TouchableOpacity>
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
        {(() => {
          const isNoCrop = (soilData.recommendedCrop || "").toString().toLowerCase() === "no_crop" || soilData.recommendedCrop === "No suitable crops";
          const confPct = typeof soilData.confidence === 'number' ? Math.round(soilData.confidence * 100) : null;
          return (
            <View style={isNoCrop ? styles.highlightCardRed : styles.highlightCard}>
              <Text style={styles.subHeader}>Recommended Crop</Text>
              <View style={isNoCrop ? styles.nextCropBoxRed : styles.nextCropBox}>
                <Text style={styles.nextCropText}>{isNoCrop ? "No crop recommended" : soilData.recommendedCrop}</Text>
              </View>
              {confPct !== null && (
                <Text style={styles.confidenceText}>Confidence: {confPct}%</Text>
              )}
            </View>
          );
        })()}

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
                  {n.unit && <Text style={styles.unitText}>{n.unit}</Text>}

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
  header: { flexDirection: "row", backgroundColor: "#002d00", justifyContent: "center", alignItems: "center", height: 65, paddingHorizontal: 16 },
  backButtonFloat: { 
    backgroundColor: "#fff", 
    borderRadius: 20, 
    padding: 8, 
    elevation: 4, 
    shadowColor: "#000", 
    shadowOpacity: 0.15, 
    shadowOffset: { width: 0, height: 2 }, 
    shadowRadius: 3,
    position: "absolute",
    left: 16,
    top: 12
  },
  printButton: { 
    backgroundColor: "#fff", 
    borderRadius: 20, 
    padding: 8, 
    elevation: 4, 
    shadowColor: "#000", 
    shadowOpacity: 0.15, 
    shadowOffset: { width: 0, height: 2 }, 
    shadowRadius: 3,
    position: "absolute",
    right: 16,
    top: 12,
    minWidth: 38,
    alignItems: "center",
    justifyContent: "center"
  },
  logo: { height: 100, width: 150 },
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
  unitText: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.85)", marginTop: 2 },
  highlightCard: { backgroundColor: "#e8f5e9", borderRadius: 12, padding: 16, marginBottom: 16, alignItems: "center" },
  highlightCardRed: { backgroundColor: "#ffebee", borderRadius: 12, padding: 16, marginBottom: 16, alignItems: "center" },
  nextCropBox: { marginTop: 8, backgroundColor: "#2e7d32", paddingVertical: 12, paddingHorizontal: 60, borderRadius: 8 },
  nextCropBoxRed: { marginTop: 8, backgroundColor: "#c62828", paddingVertical: 12, paddingHorizontal: 60, borderRadius: 8 },
  nextCropText: { fontSize: 20, fontWeight: "bold", color: "#fff", textAlign: "center" },
  confidenceText: { marginTop: 8, fontSize: 12, color: "#555", fontWeight: "600" },
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