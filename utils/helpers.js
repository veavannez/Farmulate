// utils/helpers.js

export const COLORS = {
  high: "#4caf50",      // green
  modHigh: "#fbc02d",   // yellow
  modLow: "#fb8c00",    // orange
  low: "#c62828",       // red
};

// Whitelisted soil textures used in the app/model
export const ALLOWED_TEXTURES = ["Loamy", "Clay", "Sandy", "Silt"];

export function sanitizeSoilTexture(value) {
  if (!value || typeof value !== "string") return "Not detected";
  // Normalize capitalization and trim
  const v = value.trim();
  // Case-insensitive match against whitelist
  const match = ALLOWED_TEXTURES.find(t => t.toLowerCase() === v.toLowerCase());
  return match || "Not detected";
}

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

// Strong Password Validation (Industry Standards)
// - Minimum 8 characters
// - At least 1 uppercase letter
// - At least 1 lowercase letter
// - At least 1 number
// - At least 1 special character
export function validateStrongPassword(password) {
  if (!password || typeof password !== "string") {
    return { isValid: false, message: "Password is required." };
  }

  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/'`~]/.test(password);

  if (password.length < minLength) {
    return { isValid: false, message: "Password must be at least 8 characters long." };
  }
  if (!hasUpperCase) {
    return { isValid: false, message: "Password must include at least one uppercase letter (A-Z)." };
  }
  if (!hasLowerCase) {
    return { isValid: false, message: "Password must include at least one lowercase letter (a-z)." };
  }
  if (!hasNumber) {
    return { isValid: false, message: "Password must include at least one number (0-9)." };
  }
  if (!hasSpecialChar) {
    return { isValid: false, message: "Password must include at least one special character (!@#$%^&*...)." };
  }

  return { isValid: true, message: "Strong password!" };
}
