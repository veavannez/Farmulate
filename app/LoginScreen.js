
import { useRouter } from "expo-router";
import { useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useProfile } from "../context/profileContext";

const LoginScreen = () => {
  const router = useRouter();
  const { setProfile } = useProfile();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ Memoized validation (more efficient)
  const isFormValid = useMemo(
    () => email.trim() !== "" && password.trim() !== "",
    [email, password]
  );

  const handleLogin = async () => {
    if (!isFormValid) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error || !data?.user) throw error || new Error("Invalid credentials");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", data.user.id)
        .single();

      if (profileError) throw profileError;

      setProfile(profileData);
      router.replace("/(tabs)");
    } catch (err) {
      console.error("Login error:", err);
      Alert.alert("Login Failed", err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#0b1e0a" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* 🌱 Header Section */}
        <View style={styles.header}>
          <Image
            source={require("../assets/farmulate-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>Let’s Get Started</Text>
        </View>

        {/* 📧 Email Input */}
        <TextInput
          placeholder="Email"
          placeholderTextColor="#aaa"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
        />

        {/* 🔒 Password Input */}
        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="Password"
            placeholderTextColor="#aaa"
            secureTextEntry={!showPassword}
            style={[styles.input, styles.passwordInput]}
            value={password}
            onChangeText={setPassword}
            textContentType="password"
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={22}
              color="#666"
              style={{ marginRight: 10 }}
            />
          </TouchableOpacity>
        </View>

        {/* 🚪 Login Button */}
        <TouchableOpacity
          style={[styles.button, (!isFormValid || loading) && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={!isFormValid || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>→ Log In</Text>
          )}
        </TouchableOpacity>

        {/* ✨ Signup Button (Modern UX) */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/SignupScreen")}
        >
          <Text style={styles.secondaryButtonText}>Create an Account</Text>
        </TouchableOpacity>

        {/* Decorative Leaves */}
        <Image
          source={require("../assets/leaf-left.png")}
          style={styles.leafLeft}
          resizeMode="contain"
        />
        <Image
          source={require("../assets/leaf-right.png")}
          style={styles.leafRight}
          resizeMode="contain"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: 120,
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 50,
  },
  logo: {
    width: 250,
    height: 180,
    marginBottom: -60,
  },
  subtitle: {
    color: "#ccc",
    fontSize: 16,
  },
  input: {
    width: "90%",
    backgroundColor: "#fff",
    color: "#000",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 2,
  },
  passwordInput: {
    flex: 1,
    marginBottom: 0,
    paddingHorizontal: 10,
    color: "#000",
  },
  button: {
    width: "90%",
    backgroundColor: "#76c043",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 20,
    marginVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  secondaryButton: {
    width: "90%",
    borderColor: "#76c043",
    borderWidth: 1.5,
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 5,
  },
  secondaryButtonText: {
    color: "#76c043",
    fontSize: 16,
    fontWeight: "600",
  },
  leafLeft: {
    position: "absolute",
    bottom: -3,
    right: 180,
    width: 250,
    height: 145,
  },
  leafRight: {
    position: "absolute",
    bottom: -7,
    left: 180,
    width: 250,
    height: 120,
  },
});

export default LoginScreen;
