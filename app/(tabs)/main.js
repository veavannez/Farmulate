import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActionSheetIOS,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useSoil } from "../../context/soilContext";

const MainScreen = () => {
  const [nitrogen, setNitrogen] = useState("");
  const [phosphorus, setPhosphorus] = useState("");
  const [potassium, setPotassium] = useState("");
  const [phLevel, setPhLevel] = useState("");
  const [selectedPot, setSelectedPot] = useState("default");
  const [newPotName, setNewPotName] = useState("");
  const [existingPots, setExistingPots] = useState([]);
  const [soilImage, setSoilImage] = useState(null);

  const { setSoilData } = useSoil();
  const router = useRouter();

  // 📷 Image Picker
  const pickImage = async (fromCamera = false) => {
    try {
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Camera access is needed.");
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 1,
        });
        if (!result.canceled) setSoilImage(result.assets[0].uri);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Gallery access is needed.");
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 1,
        });
        if (!result.canceled) setSoilImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Something went wrong while picking the image.");
    }
  };

  const handleImageSelection = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Take Photo", "Choose from Gallery"],
          cancelButtonIndex: 0,
        },
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
  useEffect(() => {
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
        if (data) setExistingPots(data.map((p) => p.name));
      } catch (err) {
        console.error("Error loading pots:", err);
      }
    };
    loadPots();
  }, []);

  // ☁️ Upload image to Supabase Storage
  const uploadImage = async (uri, userId) => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
      const byteCharacters = Buffer.from(base64, "base64");
      const blob = new Blob([byteCharacters], { type: "image/jpeg" });
      const fileName = `${Date.now()}-${userId}.jpg`;

      const { error } = await supabase.storage
        .from("soil-images")
        .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });

      if (error) throw error;

      const { data: publicUrl } = supabase.storage
        .from("soil-images")
        .getPublicUrl(fileName);

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
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) {
        Alert.alert("Error", "User not logged in.");
        return;
      }

      const { error } = await supabase.from("pots").insert({
        user_id: user.user.id,
        name: potName,
      });

      if (error) throw error;
      setExistingPots((prev) => [...prev, potName].sort((a, b) => a.localeCompare(b)));
    } catch (err) {
      console.error("Error saving pot:", err);
    }
  };

  // 🌾 Handle FARMULATE (no ML logic, just placeholder)
  const handleFarmulate = async () => {
    const missing = [];
    if (!nitrogen) missing.push("Nitrogen");
    if (!phosphorus) missing.push("Phosphorus");
    if (!potassium) missing.push("Potassium");
    if (!phLevel) missing.push("pH Level");

    let finalPotName = selectedPot;
    if (selectedPot === "new") {
      finalPotName = newPotName.trim();
      if (!finalPotName) missing.push("Pot/Plot Name");
    }

    if (missing.length > 0) {
      Alert.alert("Missing Fields", `Please fill in: ${missing.join(", ")}`);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Upload image if available
    let imageUrl = null;
    if (soilImage) {
      imageUrl = await uploadImage(soilImage, user.id);
    }

    if (selectedPot === "new" && finalPotName) {
      await savePot(finalPotName);
    }

    // Placeholder computed data (no ML)
    const results = {
      potName: finalPotName,
      soilTexture: "Loamy",
      soilHealth: "Good",
      nitrogen,
      phosphorus,
      potassium,
      phLevel,
      soilImage: imageUrl || soilImage,
      insight: "Balanced soil. Maintain current fertilization routine.",
      lastCrop: "Tomatoes",
      nextCrop: "Carrots",
      companions: ["Marigold", "Basil", "Lettuce"],
      avoid: ["Potatoes", "Dill"],
    };

    // Update pot
    try {
      const { error: potError } = await supabase
        .from("pots")
        .update({
          nitrogen,
          phosphorus,
          potassium,
          ph_level: phLevel,
          soil_texture: results.soilTexture,
          soil_health: results.soilHealth,
          insight: results.insight,
          last_crop: results.lastCrop,
          next_crop: results.nextCrop,
          companions: results.companions,
          avoid: results.avoid,
          soil_image_url: imageUrl,
        })
        .eq("user_id", user.id)
        .eq("name", finalPotName);

      if (potError) throw potError;
    } catch (err) {
      console.error("Error updating pot data:", err);
    }

    // Insert report
    try {
      const { error: reportError } = await supabase.from("reports").insert({
        user_id: user.id,
        pot_name: finalPotName,
        nitrogen,
        phosphorus,
        potassium,
        ph_level: phLevel,
        soil_texture: results.soilTexture,
        soil_health: results.soilHealth,
        soil_image_url: imageUrl,
        insight: results.insight,
        last_crop: results.lastCrop,
        next_crop: results.nextCrop,
        companions: results.companions,
        avoid: results.avoid,
        created_at: new Date().toISOString(),
      });

      if (reportError) throw reportError;
    } catch (err) {
      console.error("Error inserting report:", err);
    }

    setSoilData(results);
    router.push("/report");

    // Reset form
    setNitrogen("");
    setPhosphorus("");
    setPotassium("");
    setPhLevel("");
    setNewPotName("");
    setSoilImage(null);
    setSelectedPot("new");
  };

  // 🧱 UI
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.decorContainer}>
          <Image
            source={require("../../assets/leaves-decor.png")}
            style={styles.decorLeft}
            resizeMode="contain"
          />
          <Image
            source={require("../../assets/leaves-decor.png")}
            style={styles.decorRight}
            resizeMode="contain"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Soil Information</Text>

          <Text style={styles.label}>Select Pot/Plot</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedPot}
              onValueChange={(val) => setSelectedPot(val)}
              style={styles.picker}
              dropdownIconColor="#333"
            >
              <Picker.Item label=" Select Pot/Plot" value="default" color="#aaa" />
              {existingPots.map((pot, idx) => (
                <Picker.Item key={idx} label={pot} value={pot} color="#333" />
              ))}
              <Picker.Item label="🌱 Add New Pot/Plot" value="new" color="#333" />
            </Picker>
          </View>

          {selectedPot === "new" && (
            <TextInput
              placeholder="Enter new pot/plot name"
              placeholderTextColor="#aaa"
              style={styles.input}
              value={newPotName}
              onChangeText={setNewPotName}
            />
          )}

          <Text style={styles.label}>Nitrogen</Text>
          <TextInput
            placeholder="Nitrogen"
            placeholderTextColor="#aaa"
            style={styles.input}
            value={nitrogen}
            onChangeText={setNitrogen}
          />

          <Text style={styles.label}>Phosphorus</Text>
          <TextInput
            placeholder="Phosphorus"
            placeholderTextColor="#aaa"
            style={styles.input}
            value={phosphorus}
            onChangeText={setPhosphorus}
          />

          <Text style={styles.label}>Potassium</Text>
          <TextInput
            placeholder="Potassium"
            placeholderTextColor="#aaa"
            style={styles.input}
            value={potassium}
            onChangeText={setPotassium}
          />

          <Text style={styles.label}>pH Level</Text>
          <TextInput
            placeholder="pH Level"
            placeholderTextColor="#aaa"
            style={styles.input}
            value={phLevel}
            onChangeText={setPhLevel}
          />

          <TouchableOpacity style={styles.uploadBtn} onPress={handleImageSelection}>
            <Text style={styles.uploadText}>
              {soilImage ? "✅ Change Soil Image" : "📷 Add Soil Image"}
            </Text>
          </TouchableOpacity>

          {soilImage && (
            <View style={styles.previewContainer}>
              <Image
                source={{ uri: soilImage }}
                style={styles.preview}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => setSoilImage(null)}
              >
                <Text style={styles.removeText}>❌</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleFarmulate}>
          <Text style={styles.buttonText}>FARMULATE</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  pickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 15,
    overflow: "hidden",
  },
  picker: { color: "#333", fontSize: 16 },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  decorContainer: { flexDirection: "row", justifyContent: "center", marginBottom: -15 },
  decorLeft: { width: 100, height: 40, marginRight: 100 },
  decorRight: { width: 100, height: 40, transform: [{ scaleX: -1 }] },
  card: {
    width: "100%",
    backgroundColor: "#0a2f0f",
    borderRadius: 25,
    padding: 20,
    marginTop: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
  },
  uploadBtn: {
    backgroundColor: "#8bc34a",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
    marginTop: 10,
  },
  uploadText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  previewContainer: { marginTop: 10, alignItems: "center", position: "relative" },
  preview: { width: "100%", height: 150, borderRadius: 10 },
  removeBtn: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    padding: 5,
  },
  removeText: { color: "#fff", fontSize: 14 },
  label: { fontWeight: "bold", marginBottom: 5, color: "#fff" },
  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#004d00",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 20,
    width: "90%",
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});

export default MainScreen;
