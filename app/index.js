import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
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

    let timeoutId;
    (async () => {
      const seen = await AsyncStorage.getItem("onboarding_seen");
      if (!seen) {
        if (!redirected.current) {
          redirected.current = true;
          router.replace("/onboarding");
          setShowSplash(false);
        }
        return;
      }

      timeoutId = setTimeout(() => {
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
      }, 500);
    })();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [profile, loadingProfile, router]);

  if (loadingProfile || showSplash) return <SplashScreen />;
  return null;
}