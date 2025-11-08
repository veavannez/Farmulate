// app/_layout.js
import { Stack } from "expo-router";
import { ProfileProvider } from "../context/profileContext";
import { SoilProvider } from "../context/soilContext";

export default function Layout() {
  return (
    <ProfileProvider>
      <SoilProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SoilProvider>
    </ProfileProvider>
  );
}
