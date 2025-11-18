import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import LottieView from "lottie-react-native";
import { useEffect, useState } from "react";
import { Dimensions, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

const { width } = Dimensions.get("window");
const scale = (size) => Math.round((width / 375) * size);

export default function WeatherScreen() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [localTime, setLocalTime] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // 🌴 Tropical weather codes (Philippines)
  const tropicalWeatherMap = {
    95: { icon: "weather-lightning", text: "Thunderstorm" },
    96: { icon: "weather-lightning-rainy", text: "Thunderstorm with Light Rain" },
    99: { icon: "weather-lightning-rainy", text: "Thunderstorm with Heavy Rain" },
    51: { icon: "weather-partly-rainy", text: "Light Drizzle" },
    53: { icon: "weather-rainy", text: "Moderate Drizzle" },
    55: { icon: "weather-pouring", text: "Heavy Drizzle" },
    61: { icon: "weather-rainy", text: "Light Rain" },
    63: { icon: "weather-rainy", text: "Moderate Rain" },
    65: { icon: "weather-pouring", text: "Heavy Rain" },
    80: { icon: "weather-partly-rainy", text: "Light Showers" },
    81: { icon: "weather-rainy", text: "Moderate Showers" },
    82: { icon: "weather-pouring", text: "Heavy Showers" },
    0: { icon: "weather-sunny", text: "Clear Sky" },
    1: { icon: "weather-partly-cloudy", text: "Mainly Clear" },
    2: { icon: "weather-partly-cloudy", text: "Partly Cloudy" },
    3: { icon: "weather-cloudy", text: "Overcast" },
    45: { icon: "weather-fog", text: "Foggy" },
    48: { icon: "weather-fog", text: "Hazy Fog" },
    721: { icon: "weather-hazy", text: "Hazy" },
    762: { icon: "weather-cloudy-alert", text: "Volcanic Ash" },
    771: { icon: "weather-windy", text: "Windy Squalls" },
    781: { icon: "weather-tornado", text: "Tornado or Waterspout" },
    901: { icon: "weather-hurricane", text: "Tropical Storm" },
    902: { icon: "weather-hurricane", text: "Typhoon" },
    962: { icon: "weather-hurricane", text: "Super Typhoon" },
  };

  const weatherAdvice = (code) => {
    if ([61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code))
      return "🌧️ Expect rain or thunderstorms. Avoid spraying pesticides or applying fertilizer.";
    if ([0, 1, 2].includes(code))
      return "☀️ Great weather! Ideal time for drying crops or field work.";
    if ([3, 45, 48, 721].includes(code))
      return "🌫️ Cloudy or hazy. Monitor humidity and visibility.";
    if ([901, 902, 962].includes(code))
      return "🌀 Storm or typhoon warning. Secure crops and stay indoors.";
    return "🌤️ Conditions are stable. Proceed with regular farm operations.";
  };

  const fetchWeather = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLoading(false);
        return;
      }

      let { coords } = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = coords;
      let placemarks = await Location.reverseGeocodeAsync({ latitude, longitude });
      let place = placemarks[0];
      let locationName = `${place.city || place.district || ""}, ${place.region || ""}`;

      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,relativehumidity_2m,dewpoint_2m,uv_index,windspeed_10m,weathercode&current_weather=true&timezone=auto`
      );
      const data = await res.json();

      const current = data.current_weather;
      const hourly = data.hourly;
      const now = new Date();

      const upcomingHours = hourly.time
        .map((t, i) => ({ time: t, i }))
        .filter(({ time }) => new Date(time) >= now);

      const mapped = tropicalWeatherMap[current.weathercode] || {
        icon: "weather-cloudy-alert",
        text: "Unclassified Weather",
      };

      setWeather({
        temp: current.temperature,
        conditionText: mapped.text,
        conditionCode: current.weathercode,
        wind: current.windspeed,
        icon: mapped.icon,
        location: locationName || data.timezone,
        hourly,
        upcomingHours,
        advice: weatherAdvice(current.weathercode),
      });

      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchWeather();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      setLocalTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading || !weather)
    return (
      <View style={styles.loadingContainer}>
        <LottieView
          source={require("../../assets/animations/spinner.json")}
          autoPlay
          loop
          style={{ width: width * 0.18, height: width * 0.18 }}
        />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );

  // 🎨 Dynamic colors
  const colorScheme = (() => {
    if ([901, 902, 962].includes(weather.conditionCode)) {
      return {
        header: ["#2e7d32", "#1b5e20"], // deep green stormy tone
        advisory: "#2e7d32",
        icon: "#1b5e20",
      };
    }
    if ([61, 63, 65, 80, 81, 82, 95, 96, 99].includes(weather.conditionCode)) {
      return {
        header: ["#43a047", "#2e7d32"], // medium green for rain
        advisory: "#388e3c",
        icon: "#2e7d32",
      };
    }
    return {
      header: ["#66bb6a", "#43a047"], // lighter fresh green for clear days
      advisory: "#43a047",
      icon: "#388e3c",
    };
  })();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#2e7d32"
          colors={["#2e7d32"]}
        />
      }
    >
      {/* HEADER */}
      <LinearGradient colors={colorScheme.header} style={styles.header}>
        <Text style={styles.location}>{weather.location}</Text>
        <MaterialCommunityIcons name={weather.icon} size={scale(100)} color="#fff" />
        <Text style={styles.temp}>{Math.round(weather.temp)}°</Text>
        <Text style={styles.conditionText}>{weather.conditionText}</Text>
        <Text style={styles.time}>{localTime}</Text>
      </LinearGradient>

      {/* ADVISORY */}
      <View style={[styles.advisory, { backgroundColor: colorScheme.advisory }]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={scale(20)} color="#fff" />
        <Text style={styles.advisoryText}>{weather.advice}</Text>
      </View>

      {/* HOURLY FORECAST */}
      <Text style={styles.sectionTitle}>Hourly Forecast</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hourlyRow}>
        {weather.upcomingHours.slice(0, 6).map(({ time, i }) => {
          const temp = weather.hourly.temperature_2m[i];
          const code = weather.hourly.weathercode[i];
          const condition = tropicalWeatherMap[code] || { icon: "weather-cloudy", text: "" };
          const hour = new Date(time).toLocaleTimeString("en-US", {
            hour: "numeric",
            hour12: true,
          });
          return (
            <View key={time} style={styles.hourCard}>
              <Text style={styles.hourText}>{hour}</Text>
              <MaterialCommunityIcons name={condition.icon} size={scale(26)} color={colorScheme.icon} />
              <Text style={styles.hourTemp}>{Math.round(temp)}°</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* DETAILS */}
      <Text style={styles.sectionTitle}>Today’s Details</Text>
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <MaterialCommunityIcons name="weather-sunny-alert" size={scale(22)} color="#f9a825" />
          <Text style={styles.metricLabel}>UV Index</Text>
          <Text style={styles.metricValue}>Low</Text>
        </View>
        <View style={styles.metricCard}>
          <MaterialCommunityIcons name="water-percent" size={scale(22)} color="#039be5" />
          <Text style={styles.metricLabel}>Humidity</Text>
          <Text style={styles.metricValue}>{weather.hourly.relativehumidity_2m[0]}%</Text>
        </View>
        <View style={styles.metricCard}>
          <MaterialCommunityIcons name="weather-windy" size={scale(22)} color="#4caf50" />
          <Text style={styles.metricLabel}>Wind</Text>
          <Text style={styles.metricValue}>{Math.round(weather.wind)} km/h</Text>
        </View>
        <View style={styles.metricCard}>
          <MaterialCommunityIcons name="coolant-temperature" size={scale(22)} color="#f57c00" />
          <Text style={styles.metricLabel}>Dew Point</Text>
          <Text style={styles.metricValue}>{weather.hourly.dewpoint_2m[0]}°</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    fontSize: scale(14),
    color: "#6B7280",
    marginTop: 10,
    fontWeight: "500",
  },
  header: {
    borderRadius: scale(20),
    margin: scale(15),
    padding: scale(20),
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  location: { fontSize: scale(18), fontWeight: "bold", color: "#fff", marginBottom: 5 },
  temp: { fontSize: scale(45), fontWeight: "bold", color: "#fff" },
  conditionText: {
    fontSize: scale(16),
    color: "#eee",
    marginBottom: 4,
    textAlign: "center",
    flexWrap: "wrap",
    width: "100%",
    lineHeight: scale(18),
  },
  time: { fontSize: scale(17), color: "#ddd" },
  advisory: {
    flexDirection: "row",
    alignItems: "center",
    padding: scale(10),
    marginHorizontal: scale(15),
    marginVertical: scale(15),
    borderRadius: scale(16),
    shadowOpacity: 0.15,
    elevation: 3,
  },
  advisoryText: { color: "#fff", marginLeft: scale(8), flex: 1, fontSize: scale(13.5) },
  sectionTitle: {
    fontSize: scale(18),
    fontWeight: "700",
    marginHorizontal: scale(18),
    marginTop: scale(10),
    color: "#333",
  },
  hourlyRow: { paddingHorizontal: scale(15), marginTop: scale(10) },
  hourCard: {
    backgroundColor: "#eaeaea",
    marginBottom: scale(15),
    borderRadius: scale(20),
    padding: scale(15),
    alignItems: "center",
    marginRight: scale(12),
    width: width * 0.23,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  hourText: { fontSize: scale(13), color: "#444", marginBottom: 4 },
  hourTemp: { fontSize: scale(15), fontWeight: "600", color: "#2e7d32" },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: scale(15),
    marginTop: scale(10),
    justifyContent: "space-between",
  },
  metricCard: {
    flexBasis: "48%",
    backgroundColor: "#eaeaea",
    marginBottom: scale(12),
    borderRadius: scale(16),
    padding: scale(16),
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  metricLabel: { fontSize: scale(13), color: "#555", marginTop: 5 },
  metricValue: { fontSize: scale(15), fontWeight: "600", color: "#222" },
});
