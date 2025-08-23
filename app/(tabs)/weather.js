import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

export default function WeatherScreen() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  const latitude = 14.5995; // Sampaloc, Manila
  const longitude = 120.9842;

  useEffect(() => {
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,relativehumidity_2m,dewpoint_2m,uv_index,windspeed_10m,weathercode&current_weather=true&timezone=Asia/Manila`
    )
      .then((res) => res.json())
      .then((data) => {
        const current = data.current_weather;
        const hourly = data.hourly;

        const weatherIcons = {
          0: "weather-sunny",
          1: "weather-partly-cloudy",
          2: "weather-partly-cloudy",
          3: "weather-cloudy",
          45: "weather-fog",
          48: "weather-fog",
          51: "weather-partly-rainy",
          53: "weather-rainy",
          55: "weather-pouring",
          61: "weather-rainy",
          63: "weather-rainy",
          65: "weather-pouring",
          80: "weather-rainy",
          81: "weather-pouring",
          82: "weather-lightning-rainy",
        };

        setWeather({
          temp: current.temperature,
          feelsLike: current.temperature,
          condition: current.weathercode,
          wind: current.windspeed,
          icon: weatherIcons[current.weathercode] || "weather-cloudy",
          location: "Sampaloc, Manila",
          time: new Date(current.time + "Z").toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "numeric",
            hour12: true,
            timeZone: "Asia/Manila",
          }),
          hourly,
        });

        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator size="large" color="#2e7d32" style={{ marginTop: 50 }} />;

  return (
    <ScrollView style={styles.container}>
      {/* HEADER with gradient */}
      <LinearGradient colors={["#4caf50", "#2e7d32"]} style={styles.header}>
        <Text style={styles.location}>{weather.location}</Text>
        <MaterialCommunityIcons name={weather.icon} size={90} color="#fff" />
        <Text style={styles.temp}>{Math.round(weather.temp)}°</Text>
        <Text style={styles.feelsLike}>Feels like {Math.round(weather.feelsLike)}°</Text>
        <Text style={styles.time}>{weather.time}</Text>
      </LinearGradient>

      {/* Advisory Banner */}
      <View style={styles.advisory}>
        <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#fff" />
        <Text style={styles.advisoryText}>
          🌧️ Upcoming heavy rainfall. Delay fertilizer application.
        </Text>
      </View>

      {/* Hourly Forecast */}
      <Text style={styles.sectionTitle}>Hourly Forecast</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hourlyRow}>
        {weather.hourly.time.slice(0, 6).map((time, idx) => {
          const temp = weather.hourly.temperature_2m[idx];
          const hour = new Date(time).toLocaleTimeString("en-US", {
            hour: "numeric",
            hour12: true,
            timeZone: "Asia/Manila",
          });
          return (
            <View key={time} style={styles.hourCard}>
              <Text style={styles.hourText}>{hour}</Text>
              <MaterialCommunityIcons name="weather-cloudy" size={28} color="#2e7d32" />
              <Text style={styles.hourTemp}>{Math.round(temp)}°</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Extra Metrics */}
      <Text style={styles.sectionTitle}>Today’s Details</Text>
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <MaterialCommunityIcons name="weather-sunny-alert" size={24} color="#f9a825" />
          <Text style={styles.metricLabel}>UV Index</Text>
          <Text style={styles.metricValue}>Low</Text>
        </View>
        <View style={styles.metricCard}>
          <MaterialCommunityIcons name="water-percent" size={24} color="#039be5" />
          <Text style={styles.metricLabel}>Humidity</Text>
          <Text style={styles.metricValue}>{weather.hourly.relativehumidity_2m[0]}%</Text>
        </View>
        <View style={styles.metricCard}>
          <MaterialCommunityIcons name="weather-windy" size={24} color="#4caf50" />
          <Text style={styles.metricLabel}>Wind</Text>
          <Text style={styles.metricValue}>{Math.round(weather.wind)} km/h</Text>
        </View>
        <View style={styles.metricCard}>
          <MaterialCommunityIcons name="coolant-temperature" size={24} color="#f57c00" />
          <Text style={styles.metricLabel}>Dew Point</Text>
          <Text style={styles.metricValue}>{weather.hourly.dewpoint_2m[0]}°</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },

  header: {
    borderRadius: 20,
    margin: 15,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },

  location: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 5 },
  temp: { fontSize: 70, fontWeight: "bold", color: "#fff" },
  feelsLike: { fontSize: 16, color: "#eee" },
  time: { fontSize: 14, color: "#ddd" },

  advisory: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f44336",
    padding: 12,
    marginHorizontal: 15,
    marginVertical: 15,
    borderRadius: 16,
    shadowOpacity: 0.15,
    elevation: 3,
  },
  advisoryText: { color: "#fff", marginLeft: 8, flex: 1 },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginHorizontal: 18,
    marginTop: 15,
    color: "#333",
  },

  // Hourly Forecast
  hourlyRow: {
    paddingHorizontal: 15,
    marginTop: 10,
  },
  hourCard: {
    backgroundColor: "#eaeaea", // match grey card look
    marginBottom: 15,
    borderRadius: 20,
    padding: 15,
    alignItems: "center",
    marginRight: 12,
    width: 100,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  hourText: { fontSize: 14, color: "#444", marginBottom: 4 },
  hourTemp: { fontSize: 16, fontWeight: "600", color: "#2e7d32" },

  // Today’s Details
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 15,
    marginTop: 10,
    justifyContent: "space-between",
  },
  metricCard: {
    flexBasis: "48%",
    backgroundColor: "#eaeaea", // match WeatherCard grey
    marginBottom: 12,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  metricLabel: { fontSize: 14, color: "#555", marginTop: 5 },
  metricValue: { fontSize: 16, fontWeight: "600", color: "#222" },
});
