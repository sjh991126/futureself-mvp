import React from 'react';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { View, Animated, Easing, StyleSheet } from 'react-native';

const LoadingSpinner = () => {
    const rotateAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 1000,
                easing: Easing.bezier(0.4, 0.2, 0.7, 1.0), // 가속 유지하고 감속 줄임
                useNativeDriver: true,
            })
        ).start();
    }, [rotateAnim]);

    const rotateInterpolation = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    // 회전 애니메이션을 SVG 내부의 그라디언트에 적용하기 위한 스타일
    const AnimatedSvg = Animated.createAnimatedComponent(Svg);
    
    return (
        <View style={styles.spinnerContainer}>
            <AnimatedSvg 
                height="52" 
                width="52" 
                viewBox="0 0 100 100"
                style={{ transform: [{ rotate: rotateInterpolation }] }}
            >
                <Defs>
                    <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor="#5468FF"/>
                        <Stop offset="100%" stopColor="#81D8D0"/>
                    </LinearGradient>
                </Defs>
                <Circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="url(#grad)"
                    strokeWidth="13"
                    fill="transparent"
                    strokeLinecap="round"
                />
            </AnimatedSvg>
        </View>
    );
};

const styles = StyleSheet.create({
    spinnerContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 100,
        height: 100,
    },
});

export default LoadingSpinner;