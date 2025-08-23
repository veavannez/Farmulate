import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";

const SignupScreen = () => {
  const router = useRouter();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <Image
          source={require("../assets/farmulate-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.subtitle}>Let's Get Started</Text>

        {/* Decorative leaves */}
        <View style={styles.decorContainer}>
        <Image
          source={require("../assets/leaves-decor.png")}
          style={styles.decorLeft}
          resizeMode="contain"
        />
        <Image
          source={require("../assets/leaves-decor.png")}
          style={styles.decorRight}
          resizeMode="contain"
        />
        </View>

        {/* Card with inputs */}
        <View style={styles.card}>
          <Text style={styles.label}>Username</Text>
          <TextInput placeholder="Username" placeholderTextColor="#aaa" style={styles.input} />

          <Text style={styles.label}>First Name</Text>
          <TextInput placeholder="First Name" placeholderTextColor="#aaa" style={styles.input} />

          <Text style={styles.label}>Last Name</Text>
          <TextInput placeholder="Last Name" placeholderTextColor="#aaa" style={styles.input} />

          <Text style={styles.label}>Email Address</Text>
          <TextInput placeholder="Email Address" placeholderTextColor="#aaa" style={styles.input} keyboardType="email-address" />

          <Text style={styles.label}>Password</Text>
          <TextInput placeholder="Password" placeholderTextColor="#aaa" style={styles.input} secureTextEntry />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput placeholder="Confirm Password" placeholderTextColor="#aaa" style={styles.input} secureTextEntry />

          {/* Button */}
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>→ Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Footer link */}
        <Text style={styles.footerText}>
          Already have an account?{" "}
          <Text style={styles.link} onPress={() => router.push("/LoginScreen")}>
            Log in
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#0b1e0a",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  logo: {
    width: 250,
    height: 180,
    marginBottom: 0,
    marginTop: -30,
  },
  subtitle: {
    color: "#ccc",
    fontSize: 16,
    marginTop: -60,
    marginBottom: 0,
  },
  decorLeft: {
    position: "absolute",
    bottom: 0,
    width: 150,
    height: 40,
    right: 120,
  },
  decorRight: {
    width: 150,
    height: 40,
    left: 120,
    transform: [{ scaleX: -1 }],
  },
  card: {
    width: "100%", // fits screen width
    backgroundColor: "#d9d9d9",
    borderRadius: 25,
    padding: 20,
    marginBottom: 15,
  },
  label: {
    fontWeight: "bold",
    marginBottom: 5,
    color: "#000",
  },
  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#76c043",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  footerText: {
    color: "#ccc",
    marginTop: 3,
  },
  link: {
    color: "#76c043",
    fontWeight: "bold",
  },
});

export default SignupScreen;
