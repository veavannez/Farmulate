import { Stack } from "expo-router";
import { SoilProvider } from "../context/SoilContext"; 

export default function RootLayout() {
  return (
    <SoilProvider>  
      <Stack>
        {/* Splash Screen */}
        <Stack.Screen name="SplashScreen" options={{ headerShown: false }} />

        {/* Auth Screens */}
        <Stack.Screen name="LoginScreen" options={{ headerShown: false }} />
        <Stack.Screen name="SignupScreen" options={{ headerShown: false }} />

        {/* Main App with Tabs */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </SoilProvider>
  );
}
