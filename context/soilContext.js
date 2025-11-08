// context/SoilContext.js
import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
const SoilContext = createContext();

export const SoilProvider = ({ children }) => {
  const [soilData, setSoilData] = useState(null); // currently selected report
  const [history, setHistory] = useState([]);     // all saved reports

  // Load history from storage on startup
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const saved = await AsyncStorage.getItem("soilHistory");
        if (saved) {
          setHistory(JSON.parse(saved));
        }
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
    if (history.length > 0) {
      saveHistory();
    }
  }, [history]);

  // Add new report to history
  const addToHistory = (report) => {
    const withId = {
      ...report,
      id: report.id || Date.now(), // ensure unique ID
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