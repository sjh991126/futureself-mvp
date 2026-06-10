import React, {useEffect} from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NavBar from '../../assets/components/navbar';
import LoadingAnimation from './LoadingAnimation';
import { useAppState } from "../src/AppStateHandler";

const NotReadyPage = () => {
  const router = useRouter();
  const setLastUsedFeature = useAppState();

  const handleGoBack = () => {
    router.back();
  };

  const handleGoHome = () => {
    router.push('/homepage');
  };

  useEffect(() => {
    setLastUsedFeature('Community');
}, [setLastUsedFeature]);

  return (
    <View style={styles.container}>
      <LoadingAnimation />
      {/* <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
        <Ionicons name="chevron-back" size={26} color="#fff" />
      </TouchableOpacity> */}
      <View style={styles.contentContainer}>
        <View style={styles.spacerTop} />
        <View style={styles.content}>
          <Ionicons name="construct" size={70} color="#fff" style={styles.icon} />
          <Text style={styles.message}>
            Stay Tuned to Connect with Others!{"\n"}
            Coming Soon :)
            </Text>
          <TouchableOpacity style={styles.homeButton} onPress={handleGoHome}>
            <Text style={styles.homeButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.spacerBottom} />
      </View>
      <NavBar style={styles.navBar} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backButton: {
    position: 'absolute',
    top: 70,
    left: 20,
    zIndex: 2, 
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
    paddingVertical: 20, 
    marginTop: 33
  },
  spacerTop: {
    flex: 1,
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 2, 
  },
  spacerBottom: {
    flex: 1,
  },
  icon: {
    marginBottom: 20,
  },
  message: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  homeButton: {
    marginTop: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  navBar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    zIndex: 1000, 
  },
});

export default NotReadyPage;