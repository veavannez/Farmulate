import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "expo-router";
import SplashScreen from "../app/SplashScreen";
import { useProfile } from "../context/profileContext";

export default function Index() {
  const router = useRouter();
  const pathname = usePathname();
  const redirected = useRef(false);

  const { profile, loadingProfile } = useProfile();
  const [showSplash, setShowSplash] = useState(true);

  if (pathname !== "/") return null;

  useEffect(() => {
    let timeoutId;

    const redirectUser = () => {
      if (redirected.current) return;
      redirected.current = true;

      if (profile) {
        console.log("➡️ Redirecting to (tabs)");
        router.replace("/(tabs)");
      } else {
        console.log("➡️ Redirecting to LoginScreen");
        router.replace("/LoginScreen");
      }
    };

    // Wait for profile loading + splash screen
    if (!loadingProfile) {
      timeoutId = setTimeout(() => {
        redirectUser();
        setShowSplash(false);
      }, 1000); // short delay for smooth splash
    }

    return () => clearTimeout(timeoutId);
  }, [profile, loadingProfile, router]);

  if (loadingProfile || showSplash) return <SplashScreen />;
  return null;
}
