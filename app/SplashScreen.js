import React, { useEffect, useRef } from "react";
import { Animated, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

const SplashScreen = () => {
  const opacity = useRef(new Animated.Value(1)).current;
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 2000, 
        useNativeDriver: true,
      }).start(() => router.replace("/LoginScreen"));
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require("../assets/farmulate-logo.png")}
        style={[styles.logo, { opacity }]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b1e0a",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 220,
    height: 220,
  },
});

export default SplashScreen;
