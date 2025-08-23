import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Dimensions } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function WeatherCard() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const latitude = 14.5995; // Manila
  const longitude = 120.9842;

  useEffect(() => {
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!data.current_weather) {
          setError("Failed to fetch weather");
          setLoading(false);
          return;
        }

        const weatherCode = data.current_weather.weathercode;

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
          71: "weather-snowy",
          73: "weather-snowy",
          75: "weather-snowy-heavy",
          80: "weather-rainy",
          81: "weather-pouring",
          82: "weather-lightning-rainy",
        };

        const weatherConditions = {
          0: "Clear",
          1: "Mainly Clear",
          2: "Partly Cloudy",
          3: "Overcast",
          45: "Fog",
          48: "Rime Fog",
          51: "Light Drizzle",
          53: "Moderate Drizzle",
          55: "Heavy Drizzle",
          61: "Light Rain",
          63: "Moderate Rain",
          65: "Heavy Rain",
          71: "Light Snow",
          73: "Moderate Snow",
          75: "Heavy Snow",
          80: "Light Showers",
          81: "Moderate Showers",
          82: "Heavy Showers",
        };

        // Convert UTC time to Manila (PHT, UTC+8)
        const now = new Date(data.current_weather.time + "Z");
        const formattedTime = now.toLocaleString("en-US", {
          weekday: "short",
          hour: "numeric",
          minute: "numeric",
          hour12: true,
          timeZone: "Asia/Manila",
        });

        setWeather({
          temp: data.current_weather.temperature,
          feelsLike: data.current_weather.temperature,
          wind: data.current_weather.windspeed,
          icon: weatherIcons[weatherCode] || "weather-sunset",
          condition: weatherConditions[weatherCode] || "Unknown",
          location: "Manila, PH",
          time: formattedTime,
        });

        setLoading(false);
      })
      .catch(() => {
        setError("Network error");
        setLoading(false);
      });
  }, []);

  if (loading)
    return <ActivityIndicator size="large" color="#2e7d32" style={{ marginTop: 50 }} />;

  if (error)
    return (
      <View style={[styles.container, { width: SCREEN_WIDTH - 40 }]}>
        <Text style={{ color: "red" }}>Weather error: {error}</Text>
      </View>
    );

  return (
    <View style={[styles.container, { width: SCREEN_WIDTH - 40, flexDirection: "row" }]}>
      {/* Left: Temperature + Feels like + Condition */}
      <View style={styles.leftContainer}>
        <Text style={[styles.temp, { fontSize: SCREEN_WIDTH * 0.12 }]}>
          {Math.round(weather.temp)}°C
        </Text>
        <Text style={[styles.feelsLike, { fontSize: SCREEN_WIDTH * 0.045 }]}>
          Feels like {Math.round(weather.feelsLike)}°C
        </Text>
        <Text style={[styles.condition, { fontSize: SCREEN_WIDTH * 0.05 }]}>
          {weather.condition}
        </Text>
      </View>

      {/* Middle: Location + Time + Wind */}
      <View style={styles.middleContainer}>
        <Text style={[styles.location, { fontSize: SCREEN_WIDTH * 0.045 }]}>{weather.location}</Text>
        <Text style={[styles.time, { fontSize: SCREEN_WIDTH * 0.04 }]}>{weather.time}</Text>
        <Text style={[styles.wind, { fontSize: SCREEN_WIDTH * 0.04 }]}>
          💨 {Math.round(weather.wind)} km/h
        </Text>
      </View>

      {/* Right: Icon */}
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons
          name={weather.icon}
          size={SCREEN_WIDTH * 0.18}
          color="#2e7d32"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#E0E0E0", // grey background
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginHorizontal: 20,
    marginVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  leftContainer: {
    flex: 2,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  middleContainer: {
    flex: 1.5,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingLeft: 10,
  },
  iconContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  temp: {
    fontWeight: "bold",
    marginVertical: 2,
  },
  feelsLike: {
    color: "#6B7280",
    marginVertical: 2,
  },
  condition: {
    color: "#374151",
    marginVertical: 2,
    textAlign: "left",
  },
  location: {
    fontWeight: "bold",
  },
  time: {
    color: "#374151",
  },
  wind: {
    color: "#6B7280",
  },
});
