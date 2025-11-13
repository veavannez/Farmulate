import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

const { width } = Dimensions.get("window");
const scale = (size) => Math.round((width / 375) * size);

export default function OnboardingScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const scrollRef = useRef(null);
  const [lang, setLang] = useState("en");
  
  // Animated values for smooth transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const t = useMemo(() => {
    const dict = {
      en: {
        slides: [
          {
            key: "measure",
            icon: "gauge",
            title: "Measure & Input Soil Data",
            subtitle:
              "Enter N–P–K and pH from your sensor. Capture or upload a soil phototo to analyze soil texture.",
          },
          {
            key: "recommend",
            icon: "sprout",
            title: "Get Smart Crop Picks",
            subtitle:
              "We combine your NPK/pH and soil texture to analyze and recommend suitable crops and companion planting.",
          },
          {
            key: "track",
            icon: "history",
            title: "Track, Filter, and Check Weather",
            subtitle:
              "Organize by pots/plots, review past results, and view local weather to time farm work.",
          },
        ],
        buttons: { skip: "Skip", back: "Back", next: "Next", getStarted: "Get Started" },
        langEN: "EN",
        langFIL: "FIL",
      },
      fil: {
        slides: [
          {
            key: "measure",
            icon: "gauge",
            title: "Sukatin at I-input ang Datos",
            subtitle:
              "Ilagay ang N–P–K at pH mula sa iyong sensor. Magkuha o mag-upload ng litrato ng lupa para ma-analisa ang tekstura.",
          },
          {
            key: "recommend",
            icon: "sprout",
            title: "Matalinong Rekomendasyon ng Pananim",
            subtitle:
              "Pinag-uugnay namin ang NPK/pH at tekstura ng lupa upang magmungkahi ng angkop na pananim.",
          },
          {
            key: "track",
            icon: "history",
            title: "Subaybayan, I-filter, at Tingnan ang Panahon",
            subtitle:
              "Ayusin ayon sa paso/plot, balikan ang mga resulta, at tingnan ang lokal na panahon para tamang oras ng gawain.",
          },
        ],
        buttons: { skip: "Laktawan", back: "Bumalik", next: "Susunod", getStarted: "Simulan" },
        langEN: "EN",
        langFIL: "FIL",
      },
    };
    return dict[lang];
  }, [lang]);

  const slides = t.slides;

  const goNext = () => {
    if (index < slides.length - 1) {
      // Animate transition
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.7, duration: 150, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
      
      scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
      setIndex((i) => i + 1);
    } else {
      completeOnboarding();
    }
  };

  const goPrev = () => {
    if (index > 0) {
      // Animate transition
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.7, duration: 150, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
      
      scrollRef.current?.scrollTo({ x: (index - 1) * width, animated: true });
      setIndex((i) => i - 1);
    }
  };

  const onScroll = (e) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / width);
    if (i !== index) setIndex(i);
  };

  const skip = () => completeOnboarding();

  const completeOnboarding = async () => {
    await AsyncStorage.setItem("onboarding_seen", "1");
    router.replace("/LoginScreen");
  };

  // Handle Android back behavior: if on first slide, allow default, else go prev
  useEffect(() => {
    // Animate icon on slide change
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [index]);

  return (
    <View style={styles.container}>
      {/* Gradient overlay for depth */}
      <LinearGradient
        colors={['#0b1e0a', '#0f2b0d', '#0b1e0a']}
        style={styles.gradientBg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Decorative leaves - large background elements */}
      <Image
        source={require("../../assets/leaves-decor.png")}
        style={styles.leafTopRight}
        resizeMode="contain"
      />
      <Image
        source={require("../../assets/leaf-right.png")}
        style={styles.leafTopLeft}
        resizeMode="contain"
      />
      <Image
        source={require("../../assets/leaf-left.png")}
        style={styles.leafBottomRight}
        resizeMode="contain"
      />
      <Image
        source={require("../../assets/leaf-right.png")}
        style={styles.leafBottomLeft}
        resizeMode="contain"
      />

      {/* Top bar with language toggle and Skip */}
      <View style={styles.topBar}>
        <View style={styles.langRow}>
          <TouchableOpacity 
            onPress={() => setLang("en")}
            style={[styles.langButton, lang === "en" && styles.langButtonActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.langItem, lang === "en" && styles.langItemActive]}>{t.langEN}</Text>
          </TouchableOpacity>
          <View style={styles.langSeparator} />
          <TouchableOpacity 
            onPress={() => setLang("fil")}
            style={[styles.langButton, lang === "fil" && styles.langButtonActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.langItem, lang === "fil" && styles.langItemActive]}>{t.langFIL}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          onPress={skip} 
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.skipButton}
          activeOpacity={0.7}
        >
          <Text style={styles.skip}>{t.buttons.skip}</Text>
        </TouchableOpacity>
      </View>

  {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
      >
        {slides.map((s, idx) => (
          <View key={s.key} style={[styles.slide, { width }]}>            
            <Animated.View 
              style={[
                styles.card,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: index === idx ? scaleAnim : 0.95 }]
                }
              ]}
            >
              <Animated.View 
                style={[
                  styles.iconWrap,
                  { transform: [{ scale: index === idx ? scaleAnim : 1 }] }
                ]}
              >
                <MaterialCommunityIcons name={s.icon} size={scale(80)} color="#76c043" />
              </Animated.View>
              <Text style={styles.title}>{s.title}</Text>
              <Text style={styles.subtitle}>{s.subtitle}</Text>
              
              {/* Progress indicator text */}
              <View style={styles.progressTextWrap}>
                <Text style={styles.progressText}>{idx + 1} / {slides.length}</Text>
              </View>
            </Animated.View>
          </View>
        ))}
      </ScrollView>

      

      {/* Dots */}
      <View style={styles.dotsRow}>
        {slides.map((_, i) => (
          <TouchableOpacity 
            key={i} 
            onPress={() => {
              scrollRef.current?.scrollTo({ x: i * width, animated: true });
              setIndex(i);
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.dot, i === index && styles.dotActive]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomRow}>
        {index > 0 ? (
          <TouchableOpacity 
            onPress={goPrev} 
            style={styles.navBtn}
            activeOpacity={0.7}
          >
            <View style={styles.navBtnContent}>
              <MaterialCommunityIcons 
                name="chevron-left" 
                size={20} 
                color="#76c043" 
              />
              <Text style={styles.navText}>{t.buttons.back}</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.navBtnPlaceholder} />
        )}

        <TouchableOpacity 
          onPress={goNext} 
          style={index === slides.length - 1 ? styles.ctaBtnEnhanced : styles.ctaBtn}
          activeOpacity={0.85}
        >
          {index === slides.length - 1 ? (
            <LinearGradient
              colors={['#8cd447', '#76c043', '#69b038']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              <View style={styles.ctaBtnContent}>
                <Text style={styles.ctaTextEnhanced}>{t.buttons.getStarted}</Text>
                <MaterialCommunityIcons name="arrow-right" size={22} color="#fff" />
              </View>
            </LinearGradient>
          ) : (
            <View style={styles.ctaBtnContent}>
              <Text style={styles.ctaText}>{t.buttons.next}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1e0a" },
  gradientBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  topBar: { 
    paddingHorizontal: 20, 
    paddingTop: 50, 
    paddingBottom: 16,
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    zIndex: 10,
  },
  langRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 4,
  },
  langButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  langButtonActive: {
    backgroundColor: 'rgba(118, 192, 67, 0.2)',
  },
  langItem: { 
    fontSize: 13, 
    color: '#aaa',
    fontWeight: '600',
  },
  langItemActive: { 
    color: '#76c043', 
    fontWeight: '700',
  },
  langSeparator: {
    width: 1,
    height: 16,
    backgroundColor: '#555',
    marginHorizontal: 4,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  skip: { 
    color: "#76c043", 
    fontWeight: "700", 
    fontSize: scale(13),
    letterSpacing: 0.5,
  },
  slide: {
    flex: 1,
    paddingHorizontal: scale(24),
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#ffffff",
    paddingVertical: scale(36),
    paddingHorizontal: scale(28),
    borderRadius: scale(24),
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    width: "100%",
    maxWidth: scale(360),
    borderWidth: 1,
    borderColor: 'rgba(118, 192, 67, 0.1)',
  },
  iconWrap: {
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    backgroundColor: "#f0f9eb",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: scale(24),
    borderWidth: 3,
    borderColor: 'rgba(118, 192, 67, 0.2)',
  },
  title: { 
    fontSize: scale(26), 
    fontWeight: "800", 
    color: "#0b1e0a", 
    textAlign: "center", 
    marginBottom: scale(14),
    letterSpacing: -0.5,
  },
  subtitle: { 
    fontSize: scale(15), 
    color: "#5a6c57", 
    textAlign: "center", 
    lineHeight: scale(24),
    fontWeight: '500',
  },
  progressTextWrap: {
    marginTop: scale(20),
    paddingTop: scale(16),
    borderTopWidth: 1,
    borderTopColor: 'rgba(118, 192, 67, 0.15)',
  },
  progressText: {
    fontSize: scale(12),
    color: '#76c043',
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 1,
  },
  dotsRow: { 
    flexDirection: "row", 
    justifyContent: "center", 
    marginTop: scale(24),
    marginBottom: scale(16),
  },
  dot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: "#4a5a4a", 
    marginHorizontal: 6,
    opacity: 0.5,
  },
  dotActive: { 
    backgroundColor: "#76c043", 
    width: 32, 
    opacity: 1,
    shadowColor: '#76c043',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(20),
    paddingVertical: scale(24),
    paddingBottom: scale(32),
    zIndex: 10,
  },
  navBtn: { 
    paddingVertical: scale(12), 
    paddingHorizontal: scale(16),
    borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.08)',
    minWidth: scale(90),
  },
  navBtnPlaceholder: {
    width: scale(90),
  },
  navBtnDisabled: { 
    opacity: 0.4,
  },
  navBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  navText: { 
    color: "#76c043", 
    fontWeight: "700", 
    fontSize: scale(15),
  },
  navTextDisabled: { 
    color: "#4a5a4a",
  },
  ctaBtn: {
    backgroundColor: "#76c043",
    paddingVertical: scale(14),
    paddingHorizontal: scale(24),
    borderRadius: scale(14),
    shadowColor: "#76c043",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
    minWidth: scale(130),
    alignItems: 'center',
  },
  ctaBtnEnhanced: {
    borderRadius: scale(30),
    overflow: 'hidden',
    shadowColor: "#76c043",
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    minWidth: scale(180),
  },
  ctaGradient: {
    paddingVertical: scale(16),
    paddingHorizontal: scale(32),
    borderRadius: scale(30),
    minWidth: scale(180),
  },
  ctaBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: { 
    color: "#fff", 
    fontWeight: "800", 
    fontSize: scale(15),
    letterSpacing: 0.5,
  },
  ctaTextEnhanced: { 
    color: "#fff", 
    fontWeight: "800", 
    fontSize: scale(18),
    letterSpacing: 0.5,
  },
  
  // Leaf decorations - large background fills
  leafTopRight: {
    position: "absolute",
    top: -40,
    right: -120,
    width: 380,
    height: 380,
    opacity: 0.25,
    transform: [{ rotate: "65deg" }],
  },
  leafTopLeft: {
    position: "absolute",
    top: "8%",
    left: -140,
    width: 420,
    height: 360,
    opacity: 0.22,
    transform: [{ rotate: "-95deg" }],
  },
  leafBottomRight: {
    position: "absolute",
    bottom: 80,
    right: -110,
    width: 400,
    height: 380,
    opacity: 0.28,
    transform: [{ rotate: "-110deg" }],
  },
  leafBottomLeft: {
    position: "absolute",
    bottom: 60,
    left: -130,
    width: 440,
    height: 400,
    opacity: 0.3,
    transform: [{ rotate: "85deg" }],
  },
});
