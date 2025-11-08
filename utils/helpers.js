// utils/helpers.js

export const COLORS = {
  high: "#4caf50",      // green
  modHigh: "#fbc02d",   // yellow
  modLow: "#fb8c00",    // orange
  low: "#c62828",       // red
};

// Soil pH categories (scientifically accurate)
export function getPhCategory(pH) {
  if (pH < 4.6) return { label: "Extremely Acidic", color: COLORS.low };
  if (pH >= 4.6 && pH <= 5.5) return { label: "Strongly Acidic", color: COLORS.modLow };
  if (pH >= 5.6 && pH <= 6.5) return { label: "Acidic", color: COLORS.modHigh };
  if (pH >= 6.6 && pH <= 7.5) return { label: "Neutral", color: COLORS.high };
  if (pH >= 7.6 && pH <= 8.5) return { label: "Alkaline", color: COLORS.modHigh };
  if (pH >= 8.6 && pH <= 9.1) return { label: "Strongly Alkaline", color: COLORS.modLow };
  if (pH > 9.1) return { label: "Extremely Alkaline", color: COLORS.low };
  return { label: "Unknown", color: COLORS.low };
}

// Phosphorus categories based on pH-dependent extraction method
export function getPhosphorusCategory(value, pH) {
  // Alkaline soils → Olsen method
  if (pH > 7) {
    if (value > 15) return { label: "High", color: COLORS.high };
    if (value >= 10 && value <= 15) return { label: "Moderately High", color: COLORS.modHigh };
    if (value >= 5 && value < 10) return { label: "Moderately Low", color: COLORS.modLow };
    return { label: "Low", color: COLORS.low };
  }
  // Acidic soils → Bray 1 method
  else {
    if (value > 20) return { label: "High", color: COLORS.high };
    if (value >= 15 && value <= 20) return { label: "Moderately High", color: COLORS.modHigh };
    if (value >= 10 && value < 15) return { label: "Moderately Low", color: COLORS.modLow };
    return { label: "Low", color: COLORS.low };
  }
}

// Nitrogen categories (N in ppm)
export function getNitrogenCategory(value) {
  if (value >= 23) return { label: "High", color: COLORS.high };
  if (value >= 18 && value < 23) return { label: "Moderately High", color: COLORS.modHigh };
  if (value >= 10.5 && value < 18) return { label: "Moderately Low", color: COLORS.modLow };
  return { label: "Low", color: COLORS.low };
}

// Potassium categories (K in ppm)
export function getPotassiumCategory(value) {
  if (value > 50) return { label: "High", color: COLORS.high };
  if (value >= 30.1 && value <= 50) return { label: "Moderately High", color: COLORS.modHigh };
  if (value >= 15.1 && value <= 30) return { label: "Moderately Low", color: COLORS.modLow };
  return { label: "Low", color: COLORS.low };
}
