import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";

const SplashScreen = () => {
  const opacity = useRef(new Animated.Value(1)).current;
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for React Native context to be ready
    const readyTimer = setTimeout(() => {
      setIsReady(true);
    }, 100);

    return () => clearTimeout(readyTimer);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 2000, 
        useNativeDriver: true,
      }).start(() => {
        try {
          router.replace("/LoginScreen");
        } catch (error) {
          console.log("Navigation error:", error);
        }
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [isReady]);

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
