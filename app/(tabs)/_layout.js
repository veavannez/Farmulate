import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import {
  Dimensions,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSoil } from "../../context/soilContext";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get("window").width;
  const { isProcessing } = useSoil();

  const logoSize =
    screenWidth < 400 ? { width: 120, height: 50 } : { width: 50, height: 60 };

  const TABS = [
    { name: "index", title: "Home", icon: "home" },
    { name: "weather", title: "Weather", icon: "cloud" },
    { name: "main", title: "Farmulate", icon: "leaf", isFAB: true },
    { name: "history", title: "History", icon: "time" },
    { name: "profile", title: "Profile", icon: "person" },
  ];

  const renderTab = (tab, color) => (
  <View style={[styles.tabWrapper, tab.isFAB && { flex: 0 }]}>
    <Ionicons
      name={tab.icon}
      size={24}
      color={color}
      style={styles.tabIcon} // apply marginTop
    />
    {!tab.isFAB && (
      <Text style={[styles.tabLabel, { color }]}>
        {tab.title}
      </Text>
    )}
  </View>
);


  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView style={[styles.header, { paddingTop: insets.top }]}>
        <Image
          source={require("../../assets/farmulate-logo.png")}
          style={styles.logo} // use only styles.logo
          resizeMode="contain"
          accessibilityLabel="Farmulate Logo"
        />
      </SafeAreaView>

      {/* Tabs */}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: "#2e7d32",
          tabBarInactiveTintColor: "#555",
          tabBarStyle: {
            backgroundColor: "#fff",
            height: 65,
            borderTopWidth: 0.3,
            borderTopColor: "#ccc",
            // Keep visual style unchanged while processing; clicks are blocked via listeners
          },
        }}
      >
        {TABS.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              tabBarIcon: ({ focused, color }) => {
                if (tab.isFAB) {
                  return (
                    <View style={styles.fabContainer}>
                      <Ionicons
                        name={tab.icon}
                        size={28}
                        color={focused ? "#fff" : "#76c043"}
                      />
                    </View>
                  );
                }
                return renderTab(tab, color);
              },
              // Prevent navigating while processing
              listeners: {
                tabPress: (e) => {
                  if (isProcessing) {
                    e.preventDefault();
                  }
                },
                tabLongPress: (e) => {
                  if (isProcessing) {
                    e.preventDefault();
                  }
                },
              },
            }}
          />
        ))}
      </Tabs>
      {isProcessing && <View style={styles.tabBlocker} pointerEvents="auto" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#002d00",
  },
    header: {
    backgroundColor: "#002d00",
    justifyContent: "center",      // vertically center the logo
    alignItems: "flex-start",      // keep it left-aligned
    paddingHorizontal: 5,
    height: 70,
  },
  logo: {
    height: 90, 
    marginBottom: 20,      // fill header height
    width: undefined,  // let width scale automatically
    aspectRatio: 2,    // adjust to match your logo’s natural ratio
  },
  fabContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#2e7d32",
    justifyContent: "center",
    alignItems: "center",
    marginTop: -5, // floating above the tab bar
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 8,
    elevation: 8,
  },
  tabBarStyle: {
  backgroundColor: "#fff",   
  height: 80,                // bar height
  borderTopWidth: 0.3,
  borderTopColor: "#ccc",
  paddingBottom: 15,         // add space at the bottom so icons sit lower
  paddingTop: 5,             // optional: keeps icons centered vertically
},
  tabWrapper: {
    flex: 1,        // each side tab takes equal space
    justifyContent: "center",
    alignItems: "center",
    minWidth: 60,   // ensures label fits (especially for Weather)
  },
  tabIcon: {
    marginTop: 5, // slightly lower the icon
  },
  tabLabel: {
    fontSize: 12,   // readable size
    fontWeight: "500",
    textAlign: "center",
    marginBottom: -15, // space from bottom
  },
  tabBlocker: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 65, // match tab bar height
    // Transparent overlay purely to swallow touches
    backgroundColor: 'transparent',
    zIndex: 999,
  },
});