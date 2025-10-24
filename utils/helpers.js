// utils/helpers.js

export const COLORS = {
  high: "#4caf50", // green
  modHigh: "#fbc02d", // yellow
  modLow: "#fb8c00", // orange
  low: "#c62828", // red
};

export function getPhCategory(value) {
  if (value >= 5.6 && value <= 6.8) return { label: "High", color: COLORS.high };
  if (value >= 5.1 && value <= 5.5) return { label: "Moderately High", color: COLORS.modHigh };
  if (value >= 4.6 && value <= 5.0) return { label: "Moderately Low", color: COLORS.modLow };
  return { label: "Low", color: COLORS.low };
}

export function getPhosphorusCategory(value, ph) {
  if (ph >= 7) {
    // Olsen method
    if (value >= 10.1 && value <= 15) return { label: "High", color: COLORS.high };
    if (value >= 6.1 && value <= 10) return { label: "Moderately High", color: COLORS.modHigh };
    if (value >= 2.1 && value <= 6.0) return { label: "Moderately Low", color: COLORS.modLow };
    return { label: "Low", color: COLORS.low };
  } else if (ph <= 6) {
    // Bray 1 method
    if (value >= 20.1 && value <= 30) return { label: "High", color: COLORS.high };
    if (value >= 15.1 && value <= 20) return { label: "Moderately High", color: COLORS.modHigh };
    if (value >= 10.1 && value <= 15) return { label: "Moderately Low", color: COLORS.modLow };
    return { label: "Low", color: COLORS.low };
  }
  return { label: "Low", color: COLORS.low }; // fallback
}

export function getNitrogenCategory(value) {
  if (value >= 23) return { label: "High", color: COLORS.high };
  if (value >= 18 && value <= 22.9) return { label: "Moderately High", color: COLORS.modHigh };
  if (value >= 10.5 && value <= 17.8) return { label: "Moderately Low", color: COLORS.modLow };
  return { label: "Low", color: COLORS.low };
}

export function getPotassiumCategory(value) {
  if (value > 50) return { label: "High", color: COLORS.high };
  if (value >= 30.1 && value <= 50) return { label: "Moderately High", color: COLORS.modHigh };
  if (value >= 15.1 && value <= 30) return { label: "Moderately Low", color: COLORS.modLow };
  return { label: "Low", color: COLORS.low };
}
