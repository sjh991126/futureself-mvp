import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LoadingGif from "./../assets/animations/LoadingAnimation.gif";

const LoadingScreen = ({ onCancel, visible = true }) => {
    // If not visible, don't render anything
    if (!visible) return null;

    // Array of loading messages to cycle through
    const loadingMessages = [
        'Generating the best trip list',
        'Finding optimal routes for you',
        'Arranging attractions by location',
    ];

    // State to keep track of current message index
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

    // State for dots animation
    const [dots, setDots] = useState('');

    // Switch to next message every 5 seconds
    useEffect(() => {
        const messageInterval = setInterval(() => {
            setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
        }, 4000);

        return () => clearInterval(messageInterval);
    }, []);

    // Animate dots every 500ms (0 -> ... -> .. -> ... -> repeat)
    useEffect(() => {
        const dotsInterval = setInterval(() => {
            setDots((prevDots) => {
                if (prevDots.length >= 3) return '';
                return prevDots + '.';
            });
        }, 500);

        return () => clearInterval(dotsInterval);
    }, []);

    return (
        <View style={styles.container}>
            {/* GIF Image */}
            <Image
                source={LoadingGif}
                style={styles.gifImage}
                resizeMode="contain"
            />

            {/* Loading Message with animated dots */}
            <Text style={styles.loadingText}>
                {loadingMessages[currentMessageIndex]}{dots}
            </Text>

            {/* Cancel Button with Gradient */}
            <TouchableOpacity
                onPress={onCancel}
                activeOpacity={0.7}
                style={styles.buttonContainer}
            >
                <LinearGradient
                    colors={['#5468FF', '#81D8D0']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradient}
                >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    gifImage: {
        width: 400,
        height: 400,
    },
    loadingText: {
        fontSize: 20,
        fontWeight: '500',
        color: 'white',
        marginBottom: 36,
        textAlign: 'center',
    },
    buttonContainer: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    gradient: {
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 12,
    },
    cancelButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
});

export default LoadingScreen;