import React, { useEffect, useRef } from "react";
import { View, Image, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const LandingScreen = ({ onAnimationComplete }) => {
    const boxAnimation = useRef(new Animated.Value(0)).current;
    const logoAnimation = useRef(new Animated.Value(0)).current;
    const boxRiseAnimation = useRef(new Animated.Value(200)).current;
    const blackBoxAnimation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            // box comes up
            Animated.timing(boxRiseAnimation, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
                easing: Easing.out(Easing.back(1.5)),
            }),
            Animated.delay(100),
            // box rotate&enlarge
            Animated.timing(boxAnimation, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
                easing: Easing.inOut(Easing.ease),
            }),
            Animated.delay(100),
            // box rotates&shrink
            Animated.timing(boxAnimation, {
                toValue: 2,
                duration: 400,
                useNativeDriver: true,
                easing: Easing.inOut(Easing.ease),
            }),
            Animated.delay(100),
            // box move right
            Animated.parallel([
                Animated.timing(boxAnimation, {
                    toValue: 3,
                    duration: 400,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.ease),
                }),
                Animated.timing(logoAnimation, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.ease),
                }),
                Animated.timing(blackBoxAnimation, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.ease),
                }),
            ]),
            Animated.delay(100),
            Animated.parallel([
                Animated.timing(boxAnimation, {
                    toValue: 4,
                    duration: 500,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.ease),
                }),
            ]),
        ]).start(() => {
            onAnimationComplete();
        });

    }, []);

    // animation
    const boxRotate = boxAnimation.interpolate({
        inputRange: [0, 1, 2, 3],
        outputRange: ['0deg', '135deg', '270deg', '270deg'],
    });

    const boxScale = boxAnimation.interpolate({
        inputRange: [0, 1, 2, 3],
        outputRange: [5 / 3, 2.5, 1, 1],
    });

    const boxTranslateX = boxAnimation.interpolate({
        inputRange: [0, 1, 2, 3, 4],
        outputRange: [0, 0, 0, 0, -SCREEN_WIDTH * 0.14],
    });

    const boxTranslateY = boxAnimation.interpolate({
        inputRange: [0, 2, 3, 4],
        outputRange: [0, 0, SCREEN_HEIGHT * 3653 / 24600, SCREEN_HEIGHT * 3653 / 24600],
    });

    const logoTranslateX = logoAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [SCREEN_WIDTH * 0.5, 0],
    });
    const blackBoxTranslateX = blackBoxAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, SCREEN_WIDTH * 0.4],
    });
    
    return (
        <View style={styles.container}>
            <View style={styles.boxesContainer}>
                <Animated.View
                    style={[
                        styles.box,
                        {
                            transform: [
                                { translateY: boxRiseAnimation },
                                { rotate: boxRotate },
                                { scale: boxScale },
                                { translateY: boxTranslateY },
                                { translateX: boxTranslateX },
                            ],
                        },
                    ]}
                >
                    <LinearGradient
                        colors={['#5468FF', '#81D8D0']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradient}
                    />
                </Animated.View>
                <Animated.View
                    style={[
                        styles.blackBox,
                        {
                            transform: [
                                { translateX: blackBoxTranslateX }

                            ]
                        }
                    ]} />
            </View>
            <Animated.View
                style={[
                    styles.logoContainer,
                    {
                        transform: [
                            { translateX: logoTranslateX }
                        ],
                    }
                ]}
            >
                <Image
                    source={require('../assets/logo_black.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </Animated.View>
            <Animated.View
            style={ [styles.blackBoxBeneathLogo,
                {
                    transform: [
                        { translateX: logoTranslateX }
                    ],
                }
            ]} />
            

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    boxesContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        height: SCREEN_HEIGHT * 0.065,
        zIndex: 2,
    },
    box: {
        width: SCREEN_HEIGHT * 0.065,
        height: SCREEN_HEIGHT * 0.065,
        overflow: 'hidden',
        zIndex: 4
    },
    blackBox: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.065,
        overflow: 'hidden',
        backgroundColor: 'black',
        zIndex: 3,
        position: 'absolute',
        left: '50%',
    },
    gradient: {
        flex: 1,
    },
    logoContainer: {
        position: 'absolute',
        height: SCREEN_HEIGHT * 0.065,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        height: '100%',
        resizeMode: 'contain',
        zIndex: 1,
    },
    blackBoxBeneathLogo: {
        position: 'absolute',
        top: SCREEN_HEIGHT * 0.5325,
        left: '50%',
        right: 0,
        height: SCREEN_HEIGHT * 0.065,
        backgroundColor: 'black',
        zIndex: 5,
    },
});

export default LandingScreen;