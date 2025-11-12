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
  View
} from "react-native";
import { useSoil } from "../../context/soilContext";
import { supabase } from "../../lib/supabase";

const MainScreen = () => {
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

  const { setSoilData, setMappedSoilData } = useSoil();
  const router = useRouter();

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
      if (!uri) return null;
      const token = await getValidToken();
      const fileUri = uri.startsWith("file://") ? uri : `file://${uri}`;
      const ext = fileUri.split(".").pop().toLowerCase();
      if (!["jpg", "jpeg", "png"].includes(ext)) {
        Alert.alert("Unsupported file", "Please select a JPG, JPEG, or PNG image.");
        return null;
      }

      const cacheFile = `${FileSystem.cacheDirectory}${Date.now()}.${ext}`;
      await FileSystem.copyAsync({ from: fileUri, to: cacheFile });
      const base64 = await FileSystem.readAsStringAsync(cacheFile, { encoding: FileSystem.EncodingType.Base64 });
      const buffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const fileName = `${userId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("soil-images").upload(fileName, buffer, { contentType: `image/${ext}`, upsert: true });
      await FileSystem.deleteAsync(cacheFile, { idempotent: true });
      if (error) throw error;

      const { data: publicUrl } = supabase.storage.from("soil-images").getPublicUrl(fileName);
      return publicUrl.publicUrl;
    } catch (err) {
      console.error("Image upload failed:", err);
      Alert.alert("Upload Error", "Could not upload the soil image.");
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
      const token = await getValidToken();
      const response = await fetch("https://soil-backend-cfwo.onrender.com/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ imageUrl, image_name, N: Number(nitrogen), P: Number(phosphorus), K: Number(potassium), ph: Number(phLevel), pot_name: potName }),
      });
      if (!response.ok) throw new Error(`YOLO API request failed: ${response.statusText}`);
      const result = await response.json();
      return { prediction: result.soil_texture || "Not detected", recommended_crop: result.recommended_crop || "No recommendation", companions: result.companions || [], avoid: result.avoid || [] };
    } catch (err) {
      console.error("YOLO API Error:", err);
      return { prediction: null, recommended_crop: null, companions: [], avoid: [] };
    }
  };

  // 🌾 Handle FARMULATE
  const handleFarmulate = async () => {
  setLoading(true);
  try {
    // 1️⃣ Validate fields
    const missing = [];
    if (!nitrogen) missing.push("Nitrogen");
    if (!phosphorus) missing.push("Phosphorus");
    if (!potassium) missing.push("Potassium");
    if (!phLevel) missing.push("pH Level");

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

    // 2️⃣ Ensure pot exists
    if (selectedPot === "new" && !existingPots.includes(finalPotName)) {
      await savePot(finalPotName);
    }

    // 3️⃣ Upload image
    let imageUrl = null;
    if (soilImage) imageUrl = await uploadImage(soilImage, user.id);

    const image_name = soilImage ? soilImage.split("/").pop() : `soil_${Date.now()}.jpg`;

    // 4️⃣ Fetch YOLO/XGBoost result
    const yoloResult = await fetchYoloResult(imageUrl, image_name, finalPotName);

    // 5️⃣ Insert into Supabase soil_results
    const { error: insertError } = await supabase
      .from("soil_results")
      .insert([{
        user_id: user.id,
        pot_name: finalPotName,
        n: Number(nitrogen),
        p: Number(phosphorus),
        k: Number(potassium),
        ph_level: Number(phLevel),
        image_url: imageUrl,
        image_name: image_name,
        prediction: yoloResult.prediction,
        recommended_crop: yoloResult.recommended_crop,
        companions: yoloResult.companions,
        avoids: yoloResult.avoid,
      }]);

    if (insertError) throw insertError;

    // 6️⃣ Fetch latest inserted result for user
    const { data: latestResult, error: fetchError } = await supabase
      .from("soil_results")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError) throw fetchError;

    if (latestResult?.length) {
      const row = latestResult[0];
      setMappedSoilData({
        potName: row.pot_name,
        soilTexture: row.prediction,
        recommendedCrop: row.recommended_crop,
        nitrogen: row.n,
        phosphorus: row.p,
        potassium: row.k,
        phLevel: row.ph_level,
        soilImage: row.image_url,
        companions: row.companions,
        avoid: row.avoids,
        generatedAt: row.created_at,
      });
    }

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

            const { error } = await supabase
              .from("pots")
              .delete()
              .eq("user_id", user.id)
              .eq("name", selectedPot);

            if (error) throw error;

            // Remove from state immediately
            setExistingPots(prev => prev.filter(p => p !== selectedPot));
            setSelectedPot("default");
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
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
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
              <Picker
                selectedValue={selectedPot}
                onValueChange={(val) => setSelectedPot(val)}
                style={styles.picker}
                dropdownIconColor="#fff"
              >
                <Picker.Item label=" Select Pot/Plot" value="default" color="#aaa" />
                {existingPots.map((pot, idx) => (
                  <Picker.Item key={idx} label={pot} value={pot} color="#fff" />
                ))}
                <Picker.Item label="🌱 Add New Pot/Plot" value="new" color="#fff" />
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
          {["Nitrogen", "Phosphorus", "Potassium", "pH Level"].map((label, i) => {
              const value = label === "Nitrogen" ? nitrogen
                          : label === "Phosphorus" ? phosphorus
                          : label === "Potassium" ? potassium
                          : phLevel;

              const setValue = label === "Nitrogen" ? setNitrogen
                            : label === "Phosphorus" ? setPhosphorus
                            : label === "Potassium" ? setPotassium
                            : setPhLevel;

              return (
                <View key={i}>
                  <Text style={styles.label}>{label}</Text>
                  <TextInput
                    placeholder={label}
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
          <View style={styles.loadingOverlay}>
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

  pickerContainer: { backgroundColor: "#fff", borderRadius: 10, marginBottom: 0, overflow: "hidden", flex:1 },
  picker: { color: "#aaa", fontSize: 16 },
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
