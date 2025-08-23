import React, { useEffect, useRef } from "react";
import { Animated, View, Image, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

const SplashScreen = () => {
  const opacity = useRef(new Animated.Value(1)).current;
  const router = useRouter();

  useEffect(() => {
    setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 5000,
        useNativeDriver: true,
      }).start(() => {
        router.replace("/LoginScreen"); // go to login
      });
    }, 2000);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <Image
        source={require("../assets/farmulate-logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
    </Animated.View>
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
