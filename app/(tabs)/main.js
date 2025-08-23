import React, { useState } from "react";
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
import { useSoil } from "../../context/SoilContext"; // 👈 import hook

const MainScreen = () => {
  const [nitrogen, setNitrogen] = useState("");
  const [phosphorus, setPhosphorus] = useState("");
  const [potassium, setPotassium] = useState("");
  const [phLevel, setPhLevel] = useState("");
  const [soilImage, setSoilImage] = useState(null);

  const { setSoilData } = useSoil(); // 👈 get setter from context

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
      Alert.alert(
        "Select Image",
        "Choose an option",
        [
          { text: "Take Photo", onPress: () => pickImage(true) },
          { text: "Choose from Gallery", onPress: () => pickImage(false) },
          { text: "Cancel", style: "cancel" },
        ]
      );
    }
  };

  const handleFarmulate = () => {
  const missing = [];
  if (!nitrogen) missing.push("Nitrogen");
  if (!phosphorus) missing.push("Phosphorus");
  if (!potassium) missing.push("Potassium");
  if (!phLevel) missing.push("pH Level");
  if (!soilImage) missing.push("Soil Image");

  if (missing.length > 0) {
    Alert.alert(
      "Missing Fields",
      `Please fill in the following: ${missing.join(", ")}.`
    );
    return;
  }

  const newData = { nitrogen, phosphorus, potassium, phLevel, soilImage };
  setSoilData(newData);
  Alert.alert("Success", "Soil Information submitted!");

  setNitrogen("");
  setPhosphorus("");
  setPotassium("");
  setPhLevel("");
  setSoilImage(null);
};

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Decorative leaves */}
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

        {/* Card with inputs */}
        <View style={styles.card}>
          <Text style={styles.title}>Soil Information</Text>

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

          {/* Single Image Button */}
          <TouchableOpacity style={styles.uploadBtn} onPress={handleImageSelection}>
            <Text style={styles.uploadText}>
              {soilImage ? "✅ Change Soil Image" : "📷 Add Soil Image"}
            </Text>
          </TouchableOpacity>

          {/* Preview with Remove option */}
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

        {/* Farmulate button (separated) */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleFarmulate}
        >
          <Text style={styles.buttonText}>FARMULATE</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#ffff",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  decorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: -15,
  },
  decorLeft: {
    width: 100,
    height: 40,
    marginRight: 100,
  },
  decorRight: {
    width: 100,
    height: 40,
    transform: [{ scaleX: -1 }],
  },
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
  label: {
    fontWeight: "bold",
    marginBottom: 5,
    color: "#fff",
  },
  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  uploadBtn: {
    backgroundColor: "#8bc34a",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
    marginTop: 10,
  },
  uploadText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  previewContainer: {
    marginTop: 10,
    alignItems: "center",
    position: "relative",
  },
  preview: {
    width: "100%",
    height: 150,
    borderRadius: 10,
  },
  removeBtn: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    padding: 5,
  },
  removeText: {
    color: "#fff",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#004d00",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 20,
    width: "90%",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default MainScreen;
