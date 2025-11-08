import React, { useState, useCallback } from "react";
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
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";

const SignupScreen = () => {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isEmailValid = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());

  const isPasswordStrong = (password) => password.length >= 6;

  const handleSignUp = useCallback(async () => {
    if (!username || !firstName || !lastName || !email || !password || !confirmPassword) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }

    if (!isEmailValid(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    if (!isPasswordStrong(password)) {
      Alert.alert("Weak Password", "Password should be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password Mismatch", "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { username, first_name: firstName, last_name: lastName } },
      });

      if (authError) throw authError;

      if (authData?.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .insert([{ user_id: authData.user.id, username, first_name: firstName, last_name: lastName }]);
        if (profileError) throw profileError;
      }

      Alert.alert("Success", "Account created! Check your email to confirm.");
      router.push("/LoginScreen");
    } catch (err) {
      console.error("Signup error:", err);
      Alert.alert("Signup Failed", err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [username, firstName, lastName, email, password, confirmPassword, router]);

  const isFormValid = username && firstName && lastName && email && password && confirmPassword;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Image source={require("../assets/farmulate-logo.png")} style={styles.logo} resizeMode="contain" />
        <Text style={styles.subtitle}>Let's Get Started</Text>

        <View style={styles.card}>
          <TextInput placeholder="Username" placeholderTextColor="#aaa" style={styles.input} value={username} onChangeText={setUsername} />
          <TextInput placeholder="First Name" placeholderTextColor="#aaa" style={styles.input} value={firstName} onChangeText={setFirstName} />
          <TextInput placeholder="Last Name" placeholderTextColor="#aaa" style={styles.input} value={lastName} onChangeText={setLastName} />
          <TextInput placeholder="Email Address" placeholderTextColor="#aaa" style={styles.input} keyboardType="email-address" autoCapitalize="none" textContentType="emailAddress" value={email} onChangeText={setEmail} />

          <View style={styles.passwordContainer}>
            <TextInput placeholder="Password" placeholderTextColor="#aaa" secureTextEntry={!showPassword} style={[styles.input, { flex: 1, marginBottom: 0, paddingHorizontal: 10 }]} textContentType="password" value={password} onChangeText={setPassword} />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color="#666" style={{ marginRight: 10 }} />
            </TouchableOpacity>
          </View>

          <View style={styles.passwordContainer}>
            <TextInput placeholder="Confirm Password" placeholderTextColor="#aaa" secureTextEntry={!showConfirmPassword} style={[styles.input, { flex: 1, marginBottom: 0, paddingHorizontal: 10 }]} textContentType="password" value={confirmPassword} onChangeText={setConfirmPassword} />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={22} color="#666" style={{ marginRight: 10 }} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.button, (!isFormValid || loading) && { opacity: 0.7 }]} onPress={handleSignUp} disabled={!isFormValid || loading}>
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>→ Sign Up</Text>}
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          Already have an account? <Text style={styles.link} onPress={() => router.push("/LoginScreen")}>Log in</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1e0a" },
  scrollContainer: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  logo: { width: 250, height: 180, marginBottom: 0, marginTop: -30 },
  subtitle: { color: "#ccc", fontSize: 16, marginTop: -55, marginBottom: 30 },
  card: { width: "100%", backgroundColor: "#d9d9d9", borderRadius: 25, padding: 20, marginBottom: 15 },
  input: { backgroundColor: "#fff", color: "#000", padding: 12, borderRadius: 10, marginBottom: 15, fontSize: 16 },
  passwordContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 10, marginBottom: 15 },
  button: { backgroundColor: "#76c043", padding: 15, borderRadius: 25, alignItems: "center", marginTop: 10 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  footerText: { color: "#ccc", marginTop: 3 },
  link: { color: "#76c043", fontWeight: "bold" },
});

export default SignupScreen;
