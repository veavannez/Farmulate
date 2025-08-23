import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";

const LoginScreen = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Logo + Subtitle Block */}
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
        placeholder="Username"
        placeholderTextColor="#aaa"
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        placeholderTextColor="#aaa"
        secureTextEntry
        style={styles.input}
      />

      {/* Login Button */}
      <TouchableOpacity style={styles.button} onPress={() => router.replace("/(tabs)")}>
        <Text style={styles.buttonText}>→ Log In</Text>
      </TouchableOpacity>

      {/* Footer Text */}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b1e0a",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 40, // spacing before inputs
  },
  logo: {
    width: 650,
    height: 165,
    marginBottom: 0, // only small gap before subtitle
  },
  subtitle: {
    color: "#ccc",
    fontSize: 16,
    marginTop: -40,
    marginBottom: 0,
  },
  input: {
    width: "90%",
    backgroundColor: "#fff",
    padding: 12,
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
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  footerText: {
    color: "#ccc",
    marginTop: 10,
  },
  link: {
    color: "#76c043",
    fontWeight: "bold",
  },
  leafLeft: {
    position: "absolute",
    bottom: 0,
    right: 180,
    width: 250,
    height: 145,
  },
  leafRight: {
    position: "absolute",
    bottom: 0,
    left: 180,
    width: 250,
    height: 120,
  },
});

export default LoginScreen;
