// context/SoilContext.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";
import { sanitizeSoilTexture } from "../utils/helpers";

const SoilContext = createContext();

export const SoilProvider = ({ children }) => {
  const [soilData, setSoilData] = useState(null); // currently selected report
  const [history, setHistory] = useState([]);     // all saved reports
  const [isProcessing, setIsProcessing] = useState(false); // global busy flag

  // Load history from storage on startup
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const saved = await AsyncStorage.getItem("soilHistory");
        if (saved) setHistory(JSON.parse(saved));
      } catch (err) {
        console.error("Failed to load history", err);
      }
    };
    loadHistory();
  }, []);

  // Save history to storage whenever it changes
  useEffect(() => {
    const saveHistory = async () => {
      try {
        await AsyncStorage.setItem("soilHistory", JSON.stringify(history));
      } catch (err) {
        console.error("Failed to save history", err);
      }
    };
    if (history.length > 0) saveHistory();
  }, [history]);

  // Map API response to context structure
  const setMappedSoilData = (data) => {
  if (!data) return;

  const mappedSoilData = {
    id: data.id || Date.now().toString(),
    // Accept either snake_case (DB) or camelCase (app) field names
    soilTexture: sanitizeSoilTexture((data.prediction || data.soilTexture || "Not detected")),
    recommendedCrop: data.recommended_crop || data.recommendedCrop || "No recommendation",
    companions: data.companions || data.companions || [],
    avoids: data.avoids || data.avoid || [],
    nitrogen: data.n ?? data.nitrogen ?? "",
    phosphorus: data.p ?? data.phosphorus ?? "",
    potassium: data.k ?? data.potassium ?? "",
    phLevel: data.ph_level ?? data.phLevel ?? data.phLevel ?? "",
    potName: data.potName || data.pot_name || "Unnamed Soil",
    soilImage: data.image_url || data.soilImage || null,
    generatedAt: data.created_at || data.generatedAt || new Date().toISOString(),
    // Confidence (probability 0-1) may arrive as crop_confidence or confidence
    confidence: typeof data.crop_confidence === 'number' ? data.crop_confidence
               : (typeof data.confidence === 'number' ? data.confidence : null),
  };

  setSoilData(mappedSoilData);
  addToHistory(mappedSoilData);

    console.log("📝 soilContext.js - Mapped data:", mappedSoilData);
};


  // Add new report to history
  const addToHistory = (report) => {
    const withId = {
      ...report,
      id: report.id || Date.now().toString(),
      generatedAt: report.generatedAt || new Date().toISOString(),
    };
    setHistory((prev) => [withId, ...prev]); // newest first
  };

  // Clear all history
  const clearHistory = async () => {
    setHistory([]);
    try {
      await AsyncStorage.removeItem("soilHistory");
    } catch (err) {
      console.error("Failed to clear history", err);
    }
  };

  return (
    <SoilContext.Provider
      value={{
        soilData,
        setSoilData,
        setMappedSoilData, // expose helper
        history,
        addToHistory,
        clearHistory,
        isProcessing,
        setIsProcessing,
      }}
    >
      {children}
    </SoilContext.Provider>
  );
};

export const useSoil = () => useContext(SoilContext);
