// Imports
import { Picker } from "@react-native-picker/picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { useEffect, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View
} from "react-native";
import { useSoil } from "../../context/soilContext";
import { supabase } from "../../lib/supabase";

const MainScreen = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // 🌱 State variables
  const [nitrogen, setNitrogen] = useState("");
  const [phosphorus, setPhosphorus] = useState("");
  const [potassium, setPotassium] = useState("");
  const [phLevel, setPhLevel] = useState("");
  const [selectedPot, setSelectedPot] = useState("default");
  const [newPotName, setNewPotName] = useState("");
  const [existingPots, setExistingPots] = useState([]);
  const [soilImage, setSoilImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const { setSoilData, setMappedSoilData, setIsProcessing } = useSoil();
  const router = useRouter();

  // Picker display color: white placeholder, theme-aware selection
  const pickerTextColor = selectedPot === 'default' ? 'transparent' : '#000';

  // 🔑 Get valid Supabase session token
  const getValidToken = async () => {
    let { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    let token = sessionData?.session?.access_token;
    if (!token || (sessionData?.session?.expires_at && Date.now() / 1000 > sessionData.session.expires_at)) {
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) throw refreshError;
      token = refreshed?.session?.access_token;
    }

    if (!token) throw new Error("No valid Supabase session token");
    return token;
  };

  // 📷 Image Picker
  const pickImage = async (fromCamera = false) => {
    try {
      let result;
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Camera access is needed.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 1 });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Gallery access is needed.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 1 });
      }
      if (!result.canceled) setSoilImage(result.assets[0].uri);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Something went wrong while picking the image.");
    }
  };

  const handleImageSelection = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", "Take Photo", "Choose from Gallery"], cancelButtonIndex: 0 },
        (buttonIndex) => {
          if (buttonIndex === 1) pickImage(true);
          else if (buttonIndex === 2) pickImage(false);
        }
      );
    } else {
      Alert.alert("Select Image", "Choose an option", [
        { text: "Take Photo", onPress: () => pickImage(true) },
        { text: "Choose from Gallery", onPress: () => pickImage(false) },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  // 🌿 Load user's pots
    const loadPots = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user?.user?.id) return;

        const { data, error } = await supabase
          .from("pots")
          .select("name")
          .eq("user_id", user.user.id)
          .order("name", { ascending: true });

        if (error) throw error;
        setExistingPots(data?.map(p => p.name) || []);
      } catch (err) {
        console.error("Error loading pots:", err);
      }
    };

// Call on mount
useEffect(() => {
  loadPots();
}, []);

  // ☁️ Upload Image
  const uploadImage = async (uri, userId) => {
    try {
      if (!uri) {
        console.error("❌ No URI provided");
        return null;
      }

      console.log("📤 Starting upload...", { uri, userId });
      
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, { 
        encoding: FileSystem.EncodingType.Base64 
      });
      
      console.log("✅ Read file as base64, length:", base64.length);
      
      // Convert to binary
      const arrayBuffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      console.log("✅ Converted to ArrayBuffer, size:", arrayBuffer.length);
      
      const fileName = `${userId}/${Date.now()}.jpg`;
      
      console.log("📤 Uploading to Supabase:", fileName);
      
      const { data, error } = await supabase.storage
        .from("soil-images")
        .upload(fileName, arrayBuffer, { 
          contentType: "image/jpeg",
          upsert: true 
        });

      if (error) {
        console.error("❌ Supabase upload error:", error);
        throw error;
      }

      console.log("✅ Upload successful:", data);

      const { data: publicUrlData } = supabase.storage
        .from("soil-images")
        .getPublicUrl(fileName);

      console.log("✅ Public URL:", publicUrlData.publicUrl);
      
      return publicUrlData.publicUrl;
      
    } catch (err) {
      console.error("❌ Image upload failed:", err);
      Alert.alert("Upload Error", `Could not upload the soil image: ${err.message || err}`);
      return null;
    }
  };

  // 🪴 Save new pot
  const savePot = async (potName) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) { Alert.alert("Error", "User not logged in."); return; }

    if (existingPots.includes(potName)) {
      Alert.alert("Duplicate Pot", "This pot name already exists.");
      return;
    }

    const { error } = await supabase
      .from("pots")
      .insert({ user_id: user.id, name: potName });

    if (error) throw error;

    setExistingPots(prev => [...prev, potName].sort((a,b) => a.localeCompare(b)));
  } catch (err) {
    console.error("Error saving pot:", err);
  }
};

  // 🟢 YOLO/XGBoost API
  const fetchYoloResult = async (imageUrl, image_name, potName) => {
    try {
      if (!imageUrl) return { prediction: null, recommended_crop: null, companions: [], avoid: [] };
      
      console.log("🔄 Calling Render backend (may take 60s on cold start)...");
      const token = await getValidToken();
      
      // Add timeout for Render cold starts (90 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);
      
      const response = await fetch("https://soil-backend-cfwo.onrender.com/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ imageUrl, image_name, N: Number(nitrogen), P: Number(phosphorus), K: Number(potassium), ph: Number(phLevel), pot_name: potName }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log("✅ Backend response:", result);
      
      return { 
        prediction: result.soil_texture || "Not detected", 
        recommended_crop: result.recommended_crop || "No recommendation", 
        companions: result.companions || [], 
        avoid: result.avoid || [],
        confidence: typeof result.confidence === 'number' ? result.confidence : null
      };
    } catch (err) {
      console.error("YOLO API Error:", err);
      
      if (err.name === 'AbortError') {
        Alert.alert(
          "Timeout", 
          "The server took too long to respond. Render's free tier may be starting up. Please try again in a minute."
        );
      } else {
        Alert.alert(
          "Prediction Error",
          `Failed to get soil prediction: ${err.message || 'Unknown error'}\n\nPlease check your internet connection and try again.`
        );
      }
      
      throw err; // Re-throw to stop the farmulate process
    }
  };

  // 🌾 Handle FARMULATE
  const handleFarmulate = async () => {
  setLoading(true);
  setIsProcessing(true);
  try {
    // 1️⃣ Validate fields
    const missing = [];
    if (!nitrogen) missing.push("Nitrogen");
    if (!phosphorus) missing.push("Phosphorus");
    if (!potassium) missing.push("Potassium");
    if (!phLevel) missing.push("pH Level");
    if (!soilImage) missing.push("Soil Image");

    let finalPotName = selectedPot === "new" ? newPotName.trim() : selectedPot;
    if (!finalPotName || finalPotName === "default") {
      Alert.alert("Missing Pot/Plot", "Please select or enter a valid pot/plot name.");
      setLoading(false);
      return;
    }

    if (missing.length > 0) {
      Alert.alert("Missing Fields", `Please fill in: ${missing.join(", ")}`);
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("User not logged in");

    // 2️⃣ Ensure pot exists in pots table (basic entry)
    if (selectedPot === "new" && !existingPots.includes(finalPotName)) {
      await savePot(finalPotName);
    }

    // 3️⃣ Upload image (REQUIRED)
    const imageUrl = await uploadImage(soilImage, user.id);
    if (!imageUrl) {
      Alert.alert("Error", "Failed to upload image. Please try again.");
      setLoading(false);
      return;
    }

    const image_name = soilImage.split("/").pop();

    // 4️⃣ Fetch YOLO/XGBoost result (backend inserts into soil_results)
    console.log("📤 Sending to backend:", { imageUrl, nitrogen, phosphorus, potassium, phLevel, finalPotName });
    
    const yoloResult = await fetchYoloResult(imageUrl, image_name, finalPotName);

    if (!yoloResult.prediction) {
      Alert.alert("Error", "Failed to get soil prediction. Please try again.");
      setLoading(false);
      return;
    }
    
    console.log("✅ Got prediction:", yoloResult);

    // 5️⃣ Update pots table with latest soil data
    const { error: updatePotError } = await supabase
      .from("pots")
      .update({
        n: Number(nitrogen),
        p: Number(phosphorus),
        k: Number(potassium),
        ph_level: Number(phLevel),
        soil_image_url: imageUrl,
        soil_texture: yoloResult.prediction || "Unknown",
        recommended_crop: yoloResult.recommended_crop || "No recommendation",
        companions: Array.isArray(yoloResult.companions) ? yoloResult.companions : [],
        avoid: Array.isArray(yoloResult.avoid) ? yoloResult.avoid : [],
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("name", finalPotName);

    if (updatePotError) {
      console.error("Update Pot Error:", updatePotError);
      // Don't throw - backend already saved to soil_results
    }

    // 6️⃣ Build report payload from response (ensures confidence is available)
    setMappedSoilData({
      potName: finalPotName,
      soilTexture: yoloResult.prediction,
      recommendedCrop: yoloResult.recommended_crop,
      nitrogen: Number(nitrogen),
      phosphorus: Number(phosphorus),
      potassium: Number(potassium),
      phLevel: Number(phLevel),
      soilImage: imageUrl,
      companions: Array.isArray(yoloResult.companions) ? yoloResult.companions : [],
      avoid: Array.isArray(yoloResult.avoid) ? yoloResult.avoid : [],
      confidence: yoloResult.confidence ?? null,
      generatedAt: new Date().toISOString(),
    });

    router.push("/report");

    // 7️⃣ Reset form
    setNitrogen("");
    setPhosphorus("");
    setPotassium("");
    setPhLevel("");
    setNewPotName("");
    setSoilImage(null);
    setSelectedPot("default");

  } catch (err) {
    console.error("Farmulate Error:", err);
    Alert.alert("Error", err.message || "Something went wrong.");
  } finally {
    setLoading(false);
    setIsProcessing(false);
  }
};

  const handleDeletePot = async () => {
  if (!selectedPot || selectedPot === "default") return;

  Alert.alert(
    "Delete Pot/Plot",
    `Are you sure you want to delete "${selectedPot}"?`,
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.id) throw new Error("User not logged in");

             // First check if there are any reports associated with this pot
             const { data: reports, error: checkError } = await supabase
               .from("soil_results")
               .select("id")
               .eq("user_id", user.id)
               .eq("pot_name", selectedPot);

             if (checkError) throw checkError;

             if (reports && reports.length > 0) {
               Alert.alert(
                 "Cannot Delete",
                 `This pot has ${reports.length} soil report(s) associated with it. Please delete the reports from the History tab first.`,
                 [{ text: "OK" }]
               );
               return;
             }

              // Store pot name before resetting
              const potToDelete = selectedPot;

             // Now delete the pot
             const { error } = await supabase
              .from("pots")
              .delete()
              .eq("user_id", user.id)
               .eq("name", potToDelete);

            if (error) throw error;

            // Remove from state immediately
             setExistingPots(prev => prev.filter(p => p !== potToDelete));
            setSelectedPot("default");
           
              Alert.alert("Success", `Pot "${potToDelete}" has been deleted.`);
          } catch (err) {
            console.error("Error deleting pot:", err);
            Alert.alert("Error", "Could not delete pot.");
          }
        }
      }
    ]
  );
};

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} scrollEnabled={!loading}>
        {/* Decor */}
        <View style={styles.decorContainer}>
          <Image source={require("../../assets/leaves-decor.png")} style={styles.decorLeft} resizeMode="contain" />
          <Image source={require("../../assets/leaves-decor.png")} style={styles.decorRight} resizeMode="contain" />
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Soil Information</Text>

          {/* Pot/Plot Picker + compact delete */}
          <Text style={styles.label}>Select Pot/Plot</Text>
          <View style={styles.potPickerRow}>
            <View style={styles.pickerContainer}>
              {selectedPot === 'default' && (
                <Text pointerEvents="none" style={styles.pickerPlaceholder}>Select Pot/Plot</Text>
              )}
              <Picker
                selectedValue={selectedPot}
                onValueChange={(val) => setSelectedPot(val)}
                style={[styles.picker, { color: pickerTextColor }]}
                dropdownIconColor="#333"
              >
                <Picker.Item label=" Select Pot/Plot" value="default" />
                {existingPots.map((pot, idx) => (
                  <Picker.Item key={idx} label={pot} value={pot} />
                ))}
                <Picker.Item label="🌱 Add New Pot/Plot" value="new" />
              </Picker>
            </View>

            {selectedPot !== "default" && selectedPot !== "new" && (
              <TouchableOpacity style={styles.deleteIconBtn} onPress={handleDeletePot}>
                <Text style={styles.deleteIcon}>🗑</Text>
              </TouchableOpacity>
            )}
          </View>

          {selectedPot === "new" && (
            <TextInput placeholder="Enter new pot/plot name" placeholderTextColor="#aaa" style={styles.input} value={newPotName} onChangeText={setNewPotName} />
          )}

          {/* Nutrient Inputs */}
          {[
            { label: "Nitrogen (mg/kg)", placeholder: "Nitrogen" },
            { label: "Phosphorus (mg/kg)", placeholder: "Phosphorus" },
            { label: "Potassium (mg/kg)", placeholder: "Potassium" },
            { label: "pH Level", placeholder: "pH Level" }
          ].map((item, i) => {
              const value = item.label.includes("Nitrogen") ? nitrogen
                          : item.label.includes("Phosphorus") ? phosphorus
                          : item.label.includes("Potassium") ? potassium
                          : phLevel;

              const setValue = item.label.includes("Nitrogen") ? setNitrogen
                            : item.label.includes("Phosphorus") ? setPhosphorus
                            : item.label.includes("Potassium") ? setPotassium
                            : setPhLevel;

              return (
                <View key={i}>
                  <Text style={styles.label}>{item.label}</Text>
                  <TextInput
                    placeholder={item.placeholder}
                    placeholderTextColor="#aaa"
                    style={styles.input}
                    value={value}
                    keyboardType="numeric"
                    onChangeText={(text) => {
                      // Remove any non-numeric characters (allow dot for decimal)
                      const filtered = text.replace(/[^0-9.]/g, "");
                      setValue(filtered);
                    }}
                  />
                </View>
              );
            })}
          {/* Image Upload */}
          <TouchableOpacity style={styles.uploadBtn} onPress={handleImageSelection}>
            <Text style={styles.uploadText}>{soilImage?"✅ Change Soil Image":"📷 Add Soil Image"}</Text>
          </TouchableOpacity>

          {soilImage && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: soilImage }} style={styles.preview} resizeMode="cover" />
              <TouchableOpacity style={styles.removeBtn} onPress={()=>setSoilImage(null)}>
                <Text style={styles.removeText}>❌</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.button} onPress={handleFarmulate}>
          <Text style={styles.buttonText}>FARMULATE</Text>
        </TouchableOpacity>

        {loading && (
          <View pointerEvents="auto" style={styles.loadingOverlay}>
            <LottieView source={require("../../assets/animations/spinner.json")} autoPlay loop style={{ width: 80, height: 80 }} />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// Styles
const styles = StyleSheet.create({
  potPickerRow: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  deleteIconBtn: { marginLeft: 10, padding: 5 },
  deleteIcon: { fontSize: 22, color: "#800020" }, // burgundy

  pickerContainer: { backgroundColor: "#fff", borderRadius: 10, marginBottom: 0, overflow: "hidden", flex:1, height: 48, justifyContent: "center" },
  picker: { fontSize: 16, height: 48, width: "100%", backgroundColor: "transparent" },
  pickerPlaceholder: { position: "absolute", left: 12, top: 12, color: "#aaa", fontSize: 16, zIndex: 1 },
  scrollContainer: { flexGrow: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", padding: 20 },
  decorContainer: { flexDirection: "row", justifyContent: "center", marginBottom: -15 },
  decorLeft: { width: 100, height: 40, marginRight: 100 },
  decorRight: { width: 100, height: 40, transform:[{ scaleX: -1 }] },
  card: { width:"100%", backgroundColor:"#0a2f0f", borderRadius:25, padding:20, marginTop:10 },
  title:{ fontSize:22, fontWeight:"bold", color:"#fff", textAlign:"center", marginBottom:20 },
  uploadBtn:{ backgroundColor:"#8bc34a", padding:15, borderRadius:10, alignItems:"center", marginBottom:10, marginTop:10 },
  uploadText:{ color:"#fff", fontWeight:"600", fontSize:16 },
  previewContainer:{ marginTop:10, alignItems:"center", position:"relative" },
  preview:{ width:"100%", height:150, borderRadius:10 },
  removeBtn:{ position:"absolute", top:5, right:5, backgroundColor:"rgba(0,0,0,0.6)", borderRadius:20, padding:5 },
  removeText:{ color:"#fff", fontSize:14 },
  label:{ fontWeight:"bold", marginBottom:5, color:"#fff" },
  input:{ backgroundColor:"#fff", padding:12, borderRadius:10, marginBottom:15, fontSize:16 },
  button:{ backgroundColor:"#004d00", padding:15, borderRadius:25, alignItems:"center", marginTop:20, width:"90%" },
  buttonText:{ color:"#fff", fontSize:18, fontWeight:"bold" },
  loadingOverlay:{ position:"absolute", top:0,left:0,right:0,bottom:0, backgroundColor:"rgba(255,255,255,0.8)", justifyContent:"center", alignItems:"center", paddingTop:250, zIndex:10 },
  loadingText:{ marginTop:5, fontSize:13, color:"#6B7280", fontWeight:"550" },
});

export default MainScreen;