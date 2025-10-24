import { Stack } from "expo-router";
import { SoilProvider } from "../context/SoilContext"; 
import { ProfileProvider } from "../context/profileContext"; // import the ProfileProvider

export default function RootLayout() {
  return (
    <ProfileProvider>       {/* Wrap everything in ProfileProvider */}
      <SoilProvider>        {/* Then your existing SoilProvider */}
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
              headerShown: false,
              presentation: "card",
            }} 
          />
        </Stack>
      </SoilProvider>
    </ProfileProvider>
  );
}
