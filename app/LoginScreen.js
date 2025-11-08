import { useRouter } from "expo-router";
import { useState, useCallback } from "react";
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
import { useProfile } from "../context/profileContext";
import { supabase } from "../lib/supabase";
import { Ionicons } from "@expo/vector-icons";

const LoginScreen = () => {
  const router = useRouter();
  const { setProfile } = useProfile();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = useCallback(async () => {
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

      // Handle null profile gracefully
      setProfile(profileData || { user_id: data.user.id });
      router.replace("/(tabs)");
    } catch (err) {
      console.error("Login error:", err);
      Alert.alert("Login Failed", err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [email, password, router, setProfile]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image
            source={require("../assets/farmulate-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>Let's Get Started</Text>
        </View>

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
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
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

        <TouchableOpacity
          style={[styles.button, (!email || !password || loading) && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={!email || !password || loading}
        >
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>→ Log In</Text>}
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Don’t have an account?{" "}
          <Text style={styles.link} onPress={() => router.push("/SignupScreen")}>
            Sign up
          </Text>
        </Text>

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
  container: { flex: 1, backgroundColor: "#0b1e0a" },
  scrollContainer: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  header: { alignItems: "center", marginBottom: 40 },
  logo: { width: 250, height: 180, marginBottom: 0 },
  subtitle: { color: "#ccc", fontSize: 16, marginTop: -50, marginBottom: 5 },
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
  passwordContainer: { flexDirection: "row", alignItems: "center", width: "90%", backgroundColor: "#fff", borderRadius: 10, marginBottom: 15, paddingHorizontal: 2 },
  button: { width: "90%", backgroundColor: "#76c043", padding: 15, borderRadius: 25, alignItems: "center", marginVertical: 15 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  footerText: { color: "#ccc", marginTop: 10 },
  link: { color: "#76c043", fontWeight: "bold" },
  leafLeft: { position: "absolute", bottom: 0, right: 180, width: 250, height: 145 },
  leafRight: { position: "absolute", bottom: 0, left: 180, width: 250, height: 120 },
});

export default LoginScreen;
