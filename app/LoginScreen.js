import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useProfile } from "../context/profileContext";

const LoginScreen = () => {
  const router = useRouter();
  const { setProfile } = useProfile();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);


  const handleLogin = async () => {
    if (!email || !password) {
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
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require("../assets/farmulate-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>Let's Get Started</Text>
        </View>

        {/* Inputs */}
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
        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="Password"
            placeholderTextColor="#aaa"
            secureTextEntry={!showPassword}
            style={[styles.input, { flex: 1, color: "#000", marginBottom: 0 }]}
            value={password}
            onChangeText={setPassword}
            textContentType="password"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={22}
              color="#666"
              style={{ marginRight: 10 }}
            />
          </TouchableOpacity>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.button, (!email || !password || loading) && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={!email || !password || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>→ Log In</Text>
          )}
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.footerText}>Forgot Password?</Text>
        <Text style={styles.footerText}>
          Don’t have an account?{" "}
          <Text style={styles.link} onPress={() => router.push("/SignupScreen")}>
            Sign up
          </Text>
        </Text>

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
    justifyContent: "center",
    padding: 20,
  },
  header: { alignItems: "center", marginBottom: 40 },
  logo: { width: 250, height: 180, marginBottom: 0 },
  subtitle: { color: "#ccc", fontSize: 16, marginTop: -20 },
  input: {
    width: "90%",
    backgroundColor: "#fff",
    padding: 12,
    color: "#000",
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    width: "90%",
    backgroundColor: "#76c043",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginVertical: 15,
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  footerText: { color: "#ccc", marginTop: 10 },
  link: { color: "#76c043", fontWeight: "bold" },
  leafLeft: { position: "absolute", bottom: 0, right: 180, width: 250, height: 145 },
  leafRight: { position: "absolute", bottom: 0, left: 180, width: 250, height: 120 },
});

export default LoginScreen;
