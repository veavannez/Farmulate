
import React, { useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import WeatherCard from "../../components/WeatherCard";
import SoilNutrientsCard from "../../components/SoilNutrientsCard";
import { useSoil } from "../../context/soilContext";
import { supabase } from "../../lib/supabase";

export default function HomeScreen() {
  const { soilData } = useSoil();
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async () => {
    try {
      // Get current logged-in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) return;

      // Fetch user's profile from your "profiles" table
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;

      const name =
        profile.first_name && profile.last_name
          ? `${profile.first_name} ${profile.last_name}`
          : profile.first_name || "Farmer";

      setFullName(name);
    } catch (err) {
      console.error("Error fetching profile:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();

    // Listen for login/logout changes and refresh profile
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      fetchUserProfile();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.hello}>
        {loading ? "Loading..." : `Hi, ${fullName}`}
      </Text>

      <View style={styles.hr} />
      <Text style={styles.sectionTitle}>Weather Today</Text>
      <View style={styles.centerWrapper}>
        <WeatherCard />
      </View>

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Soil Nutrients</Text>
      </View>
      <View style={styles.centerWrapper}>
        <SoilNutrientsCard data={soilData} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 20,
    paddingRight: 16,
    paddingLeft: 24,
  },
  hello: {
    fontSize: 38,
    fontWeight: "900",
    color: "#1b5e20",
    marginBottom: 8,
  },
  hr: {
    height: 2,
    backgroundColor: "#1b1b1b",
    opacity: 0.3,
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111",
    flex: 1,
    marginLeft: 4,
  },
  centerWrapper: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
});
