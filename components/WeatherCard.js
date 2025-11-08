import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import * as Location from "expo-location";
import LottieView from "lottie-react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const scale = SCREEN_WIDTH / 390;

// ✅ Tropical weather code-to-text and icon mapping (for the Philippines)
const tropicalWeatherMap = {
  // Thunderstorms
  95: { text: "Thunderstorm", icon: "weather-lightning" },
  96: { text: "Thunderstorm with Light Rain", icon: "weather-lightning-rainy" },
  99: { text: "Thunderstorm with Heavy Rain", icon: "weather-lightning-rainy" },

  // Drizzle & Light Rain
  51: { text: "Light Drizzle", icon: "weather-partly-rainy" },
  53: { text: "Moderate Drizzle", icon: "weather-rainy" },
  55: { text: "Heavy Drizzle", icon: "weather-pouring" },

  // Rain
  61: { text: "Light Rain", icon: "weather-rainy" },
  63: { text: "Moderate Rain", icon: "weather-rainy" },
  65: { text: "Heavy Rain", icon: "weather-pouring" },

  // Showers
  80: { text: "Light Showers", icon: "weather-partly-rainy" },
  81: { text: "Moderate Showers", icon: "weather-rainy" },
  82: { text: "Heavy Showers", icon: "weather-pouring" },

  // Atmospheric
  45: { text: "Foggy", icon: "weather-fog" },
  48: { text: "Hazy Fog", icon: "weather-fog" },
  71: { text: "Mist", icon: "weather-fog" },
  721: { text: "Haze", icon: "weather-hazy" },
  762: { text: "Volcanic Ash", icon: "weather-cloudy-alert" },
  771: { text: "Windy Squalls", icon: "weather-windy" },
  781: { text: "Tornado or Waterspout", icon: "weather-tornado" },

  // Clear & Cloudy
  0: { text: "Clear Sky", icon: "weather-sunny" },
  1: { text: "Mainly Clear", icon: "weather-partly-cloudy" },
  2: { text: "Partly Cloudy", icon: "weather-partly-cloudy" },
  3: { text: "Overcast", icon: "weather-cloudy" },

  // Extreme Tropical
  900: { text: "Tornado", icon: "weather-tornado" },
  901: { text: "Tropical Storm", icon: "weather-hurricane" },
  902: { text: "Typhoon", icon: "weather-hurricane" },
  905: { text: "Windy", icon: "weather-windy" },
  962: { text: "Super Typhoon", icon: "weather-hurricane" },
};

const WeatherCard = () => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [localTime, setLocalTime] = useState("");

  const fetchWeather = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission denied");
        return;
      }

      const { coords } = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = coords;

      const placemarks = await Location.reverseGeocodeAsync({ latitude, longitude });
      const place = placemarks[0] || {};
      const locationName = `${place.city || place.district || "Unknown"}, ${place.region || ""}`;

      // ✅ Open-Meteo (uses weathercode)
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=sunrise,sunset&timezone=auto`
      );
      const data = await res.json();

      if (!data?.current_weather) {
        setError("Failed to fetch weather");
        return;
      }

      const weatherCode = data.current_weather.weathercode;
      const mapped = tropicalWeatherMap[weatherCode] || { text: "Unclassified Weather", icon: "weather-cloudy-alert" };

      const sunrise = data.daily?.sunrise?.[0]?.split("T")[1]?.slice(0, 5) || "—";
      const sunset = data.daily?.sunset?.[0]?.split("T")[1]?.slice(0, 5) || "—";

      setWeather({
        temp: data.current_weather.temperature,
        wind: data.current_weather.windspeed,
        icon: mapped.icon,
        condition: mapped.text,
        location: locationName,
        sunrise,
        sunset,
      });
    } catch (err) {
      console.error("Weather fetch error:", err);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchWeather]);

  useEffect(() => {
    const updateTime = () => {
      setLocalTime(
        new Date().toLocaleTimeString("en-US", {
          weekday: "short",
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  if (loading)
    return (
      <View style={{ alignItems: "center", justifyContent: "center", marginTop: 40 }}>
        <LottieView
          source={require("../assets/animations/spinner.json")}
          autoPlay
          loop
          style={{ width: 70, height: 70 }}
        />
        <Text style={{ marginTop: 10, color: "#6B7280", fontWeight: "600" }}>
          Fetching weather...
        </Text>
      </View>
    );

  return (
    <View style={[styles.container, { width: SCREEN_WIDTH - 40 * scale, flexDirection: "row" }]}>
      <View style={styles.leftContainer}>
        <Text style={[styles.temp, { fontSize: 48 * scale }]}>
          {Math.round(weather.temp)}°C
        </Text>
        <Text
          style={[styles.condition, { fontSize: 20 * scale }]}
          numberOfLines={0}           // ✅ allow unlimited lines
        >
          {weather.condition}
        </Text>

        <View style={styles.sunContainer}>
          <View style={styles.sunItem}>
            <MaterialCommunityIcons name="weather-sunset-up" size={20 * scale} color="#f59e0b" />
            <Text style={[styles.sunText, { fontSize: 14 * scale }]}>{weather.sunrise}</Text>
          </View>
          <View style={styles.sunItem}>
            <MaterialCommunityIcons name="weather-sunset-down" size={20 * scale} color="#f97316" />
            <Text style={[styles.sunText, { fontSize: 14 * scale }]}>{weather.sunset}</Text>
          </View>
        </View>
      </View>

      <View style={styles.middleContainer}>
        <Text style={[styles.location, { fontSize: 16 * scale }]}>{weather.location}</Text>
        <Text style={[styles.time, { fontSize: 14 * scale }]}>{localTime}</Text>
        <View style={styles.windContainer}>
          <MaterialCommunityIcons name="weather-windy" size={20 * scale} color="#6B7280" />
          <Text style={[styles.windText, { fontSize: 14 * scale }]}>
            {Math.round(weather.wind)} km/h
          </Text>
        </View>
      </View>

      <View style={styles.iconContainer}>
        <MaterialCommunityIcons
          name={weather.icon}
          size={70 * scale}
          color="#2e7d32"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#E0E0E0",
    borderRadius: 20 * scale,
    padding: 16 * scale,
    alignItems: "center",
    marginHorizontal: 20 * scale,
    marginVertical: 10 * scale,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 * scale },
    shadowOpacity: 0.1,
    shadowRadius: 8 * scale,
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
    paddingLeft: 10 * scale,
  },
  iconContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  temp: {
    fontWeight: "bold",
    marginVertical: 2 * scale,
    marginTop: 5 * scale,
  },
 condition: {
  color: "#374151",
  marginVertical: 2 * scale,
  fontWeight: "600",
  flexShrink: 1,
  flexWrap: "wrap",
  width: "100%",             // ensures full-width wrapping
  textAlign: "left",
  includeFontPadding: false, // avoids clipping on Android
  textAlignVertical: "center",
  lineHeight: 26 * scale,    // gives breathing room between lines
},
  sunContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12 * scale,
    marginTop: 6 * scale,
  },
  sunItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4 * scale,
  },
  sunText: {
    color: "#6B7280",
  },
  location: {
    fontWeight: "bold",
  },
  time: {
    color: "#374151",
    marginVertical: 2 * scale,
  },
  windContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4 * scale,
    marginTop: 2 * scale,
  },
  windText: {
    color: "#6B7280",
  },
});

export default WeatherCard;
