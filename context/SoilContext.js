import React, { createContext, useState, useContext } from "react";

const SoilContext = createContext();

export const SoilProvider = ({ children }) => {
  const [soilData, setSoilData] = useState(null);   // currently selected report
  const [history, setHistory] = useState([]);       // all saved reports

  // Add new report to history
  const addToHistory = (report) => {
    const withId = {
      ...report,
      id: report.id || Date.now(),            // ensure unique ID
      generatedAt: report.generatedAt || new Date().toISOString(), // timestamp
    };

    setHistory((prev) => [withId, ...prev]); // newest first
  };

  // Clear all history
  const clearHistory = () => setHistory([]);

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
