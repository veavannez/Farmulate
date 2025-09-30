import { Stack } from "expo-router";
import { SoilProvider } from "../context/SoilContext"; 

export default function RootLayout() {
  return (
    <SoilProvider>  
      <Stack screenOptions={{ headerShown: false }}>
        {/* Splash Screen */}
        <Stack.Screen name="SplashScreen" />

        {/* Auth Screens */}
        <Stack.Screen name="LoginScreen" />
        <Stack.Screen name="SignupScreen" />

        {/* Main App with Tabs */}
        <Stack.Screen name="(tabs)" />

        {/* Hidden Report Screen (not in tabs) */}
        <Stack.Screen 
          name="report" 
          options={{ 
            headerShown: false,   // you already build your own header in Report.js
            presentation: "card", // change to "modal" if you want iOS slide-up
          }} 
        />
      </Stack>
    </SoilProvider>
  );
}
