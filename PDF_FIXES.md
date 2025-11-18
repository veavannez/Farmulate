# PDF and UI Fixes for report.js

## Changes Needed:

### 1. Fix Image Embedding (Line ~70-85)
Replace the deprecated FileSystem.downloadAsync method with fetch + FileReader for proper base64 conversion.

**Current code:**
```javascript
if (soilData.soilImage.startsWith('http')) {
  const tmpPath = `${FileSystem.cacheDirectory}soil_report_image.jpg`;
  const dl = await FileSystem.downloadAsync(soilData.soilImage, tmpPath);
  const b64 = await FileSystem.readAsStringAsync(dl.uri, { encoding: FileSystem.EncodingType.Base64 });
  imageSrc = `data:image/jpeg;base64,${b64}`;
}
```

**Replace with:**
```javascript
if (soilData.soilImage.startsWith('http')) {
  const response = await fetch(soilData.soilImage);
  const blob = await response.blob();
  const reader = new FileReader();
  imageSrc = await new Promise((resolve, reject) => {
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
```

### 2. Make PDF Single-Page Compact (Line ~106-115)
Reduce all spacing, font sizes, and margins to fit everything on one page.

**Changes:**
- `@page { size: A4; margin: 0.5in; }` (was 1in)
- `body { padding: 8px; line-height: 1.4; }` (was padding: 0, line-height: 1.5)
- `.logo-text { font-size: 18px; }` (was 24px)
- `.subtitle { font-size: 10px; }` (was 13px)
- `.content-grid { grid-template-columns: 260px 1fr; gap: 10px; }` (was 350px, gap 18px)
- `.soil-image { height: 120px; }` (was 180px)
- `.section-header { font-size: 9px; margin-bottom: 5px; }` (was 12px, 10px)
- All `.panel { padding: 8px; gap: 6px; }` (was 14px, 14px)
- Nutrient table: `th { padding: 4px 5px; font-size: 8px; }`, `td { padding: 5px; font-size: 9px; }`
- Recommendation box: `padding: 6px; margin-top: 5px; font-size: 11px/8px`
- Companion list: `font-size: 8px; padding: 3px 5px; margin-bottom: 2px;`
- Footer: `font-size: 7px; margin-top: 6px; padding-top: 4px;`

### 3. Add Red Styling for "No soil detected" UI (Line ~660)
**Current:**
```javascript
<View style={styles.tagGreen}>
  <Text style={styles.tagText}>Soil Texture: {soilData.soilTexture}</Text>
</View>
```

**Replace with:**
```javascript
<View style={(soilData.soilTexture || "").toString().toLowerCase().includes('no soil') ? styles.tagRed : styles.tagGreen}>
  <Text style={styles.tagText}>Soil Texture: {soilData.soilTexture || "Not detected"}</Text>
</View>
```

**Add to StyleSheet (after tagGreen):**
```javascript
tagRed: { backgroundColor: "#c62828", padding: 8, borderRadius: 8, alignItems: "center" },
```

## Instructions:
Please manually apply these changes to `app/report.js` since the automated tool is currently disabled.
