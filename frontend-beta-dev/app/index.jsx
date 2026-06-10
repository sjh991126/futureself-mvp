import * as React from "react";
import 'react-native-get-random-values';
import { useState, useRef, useEffect } from "react";
import { StyleSheet, Text, Image, TouchableOpacity, View, Dimensions, Animated } from 'react-native';
import { FontFamily } from "./indexStyles";
import { useRouter } from 'expo-router';
import LandingScreen from './LandingScreen';
import { TokenManager } from "./src/config";
import { initializeFirebase } from "./src/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get('window');
const HAS_SEEN_GUIDE_KEY = 'hasSeenGuide';

export default function Index() {
  const [animationComplete, setAnimationComplete] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  useEffect(() => {
    const initFirebase = async () => {
      try {
        console.log('Initializing Firebase...');
        const { app, auth, db, messaging } = initializeFirebase();
        console.log('Firebase initialized:', app, auth, db, messaging);
      } catch (error) {
        console.error('Error initializing Firebase:', error);
      }
    };

    initFirebase();
  }, []);


  const handleAnimationComplete = () => {
    setAnimationComplete(true);
  };

  useEffect(() => {
    const checkAuthToken = async () => {
      try {
        const token = await TokenManager.getAccessTokenSafely?.() ?? await TokenManager.getAccessToken();
        if (token) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        // console.error('Error checking auth token:', error);
      }
    };

    checkAuthToken();
  }, []);

  useEffect(() => {
    console.log('Is authenticated:', isAuthenticated);

    if (animationComplete) {
      if (isAuthenticated) {
        router.replace("/(home)/homepage");
      } else {
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      }
    }
  }, [animationComplete, isAuthenticated]);

  const handleLetsGetStarted = async () => {
    try {
      const hasSeen = await AsyncStorage.getItem(HAS_SEEN_GUIDE_KEY);
      if (hasSeen === 'true') {
        router.replace("/(auth)/login");
      } else {
        router.replace("/(auth)/guide");
      }
    } catch {
      // 문제가 있어도 최소 로그인으로 보냄
      router.replace("/(auth)/login");
    }
  };

  if (!animationComplete) {
    return <LandingScreen onAnimationComplete={handleAnimationComplete} />;
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Animated.Text style={[styles.title, { opacity: fadeAnim }]}>Seize Your Journey.</Animated.Text>
      </Animated.View>

      <Image
        source={require('../assets/logo_black.png')}
        style={[styles.trippyImage]}
        resizeMode="contain"
      />
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>

        {/* <Animated.View style={[styles.englishParent, { opacity: fadeAnim }]}>
              <TouchableOpacity style={styles.englishButton} onPress={() => { }}>
                <Image style={styles.globalicon} resizeMode="cover" source={require("../assets/globalicon_white.png")} />
                <Text style={styles.english}>English</Text>
              </TouchableOpacity>
            </Animated.View> */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <TouchableOpacity onPress={handleLetsGetStarted} style={styles.letsGetStartedParent}>
            <Text style={styles.letsGetStarted}>Let's Get Started</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 90,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    fontFamily: FontFamily.montserratBold,
    textAlign: "center",
    width: '100%',
    marginBottom: 45,
  },
  trippyImage: {
    position: 'absolute',
    height: height * 0.065,
  },
  bottomContent: {
    alignItems: 'center',
  },
  letsGetStarted: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: FontFamily.montserratBold,
    color: "black",
    textAlign: "center"
  },
  letsGetStartedParent: {
    marginTop: 180,
    shadowColor: "rgba(244, 103, 55, 0.25)",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowRadius: 2,
    elevation: 2,
    shadowOpacity: 1,
    borderRadius: 8,
    backgroundColor: "#d9d9d9",
    width: width * 0.6,
    height: height * 0.06,
    alignItems: "center",
    justifyContent: "center",

  },
  englishButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  english: {
    fontFamily: FontFamily.montserratRegular,
    fontSize: 16,
    textAlign: "center",
    color: 'white',
  },
  globalicon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  englishParent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    marginTop: 180,

  },
});
