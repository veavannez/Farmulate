import { Stack } from "expo-router";
import { ProfileProvider } from "../context/profileContext";
import { SoilProvider } from "../context/SoilContext";

export default function RootLayout() {
  return (
    <ProfileProvider>
      <SoilProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SoilProvider>
    </ProfileProvider>
  );
}
