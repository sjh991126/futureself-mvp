import React from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import LottieView from 'lottie-react-native';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

const LoadingAnimation = () => {
  return (
    <View style={styles.container}>
      <LottieView
        source={require('../../assets/animations/loading.json')}
        autoPlay
        loop
        style={styles.animation}
      />
      <BlurView intensity={80} style={styles.blurContainer} tint='dark'/>
      <BlurView intensity={100} style={styles.blurContainer} tint='light'/>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    zIndex: 1, // Ensure it is above other components
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  animation: {
    width: width,
    height: height,
  },
});

export default LoadingAnimation;