import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useRouter, usePathname } from "expo-router";
import SplashScreen from "../app/SplashScreen";

export default function Index() {
  const router = useRouter();
  const pathname = usePathname();
  const [checkingSession, setCheckingSession] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const redirected = useRef(false);

  // 🧠 Prevent this file from doing anything if it's not the root route
  if (pathname !== "/") {
    return null;
  }

  useEffect(() => {
    let timeoutId;

    const initAuth = async () => {
      console.log("🔐 Checking Supabase session...");
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.error("Supabase error:", error);

        const session = data?.session;
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (redirected.current) return;
        redirected.current = true;

        if (session) {
          console.log("➡️ Redirecting to (tabs)");
          router.replace("/(tabs)");
        } else {
          console.log("➡️ Redirecting to LoginScreen");
          router.replace("/LoginScreen");
        }
      } catch (err) {
        console.error("Error checking session:", err);
        router.replace("/LoginScreen");
      } finally {
        setCheckingSession(false);
        timeoutId = setTimeout(() => setShowSplash(false), 700);
      }
    };

    initAuth();
    return () => clearTimeout(timeoutId);
  }, []);

  if (checkingSession || showSplash) return <SplashScreen />;
  return null;
}
