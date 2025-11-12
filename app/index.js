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
    if (loadingProfile) return; // wait for profile

    const timeoutId = setTimeout(() => {
      if (redirected.current) return;
      redirected.current = true;

      if (profile) {
        console.log("➡️ Redirecting to (tabs)");
        router.replace("/(tabs)");
      } else {
        console.log("➡️ Redirecting to LoginScreen");
        router.replace("/LoginScreen");
      }

      setShowSplash(false);
    }, 500); // short delay for smooth transition

    return () => clearTimeout(timeoutId);
  }, [profile, loadingProfile, router]);

  if (loadingProfile || showSplash) return <SplashScreen />;
  return null;
}