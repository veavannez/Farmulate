// context/SoilContext.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";

const SoilContext = createContext();

export const SoilProvider = ({ children }) => {
  const [soilData, setSoilData] = useState(null); // currently selected report
  const [history, setHistory] = useState([]);     // all saved reports

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
    soilTexture: data.prediction || "Unknown",
    recommendedCrop: data.recommended_crop || "No recommendation",
    companions: data.companions || [],
    avoids: data.avoids || [],
    nitrogen: data.n,
    phosphorus: data.p,
    potassium: data.k,
    phLevel: data.ph_level,
    potName: data.potName || "Unnamed Soil",
    soilImage: data.image_url || null,
    generatedAt: data.created_at || new Date().toISOString(),
  };

  setSoilData(mappedSoilData);
  addToHistory(mappedSoilData);
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
      }}
    >
      {children}
    </SoilContext.Provider>
  );
};

export const useSoil = () => useContext(SoilContext);
