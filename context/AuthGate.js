import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

export default function AuthGate({ children }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const router = useRouter();

  useEffect(() => {
    let subscription;

    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      const currentSession = data?.session;
      setSession(currentSession);

      if (!currentSession) {
        router.replace("/LoginScreen");
      }

      setLoading(false);

      subscription = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
        if (!newSession) router.replace("/LoginScreen");
      }).subscription;
    };

    checkAuth();

    return () => subscription?.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#76c043" />
      </View>
    );
  }

  if (!session) return null;

  return children;
}
