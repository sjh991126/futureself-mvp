// app/components/WelcomeScreen.jsx
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

const WelcomeScreen = ({ userName, userImage, onClose }) => {
    const router = useRouter();

    const handleGetStarted = () => {
        onClose();
        router.push('/onboard_gender');
    };

    return (
        <View style={StyleSheet.absoluteFill}>
            <BlurView intensity={15} style={StyleSheet.absoluteFill} tint='dark'>
                <View style={styles.overlay}>
                    <View style={styles.container}>
                        {userImage ? (
                            <Image source={{ uri: userImage }} style={styles.image} />
                        ) : (
                            <View style={styles.iconContainer}>
                                <Ionicons name="person-circle-outline" size={100} color="#fff" />
                            </View>
                        )}
                        <Text style={styles.welcomeText}>Welcome to Trippy</Text>
                        <Text style={styles.userName}>{userName}!</Text>
                        <Text style={styles.description}>
                            Your answers to the next few questions will help us find the perfect activities for you
                        </Text>
                        <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
                            <Text style={styles.buttonText}>Let’s Get Started</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </BlurView>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        backgroundColor: '#25282D',
        paddingVertical: 60,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: 'center',
        width: '80%',
    },
    image: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 20,
    },
    welcomeText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    userName: {
        color: '#fff',
        fontSize: 16,
        marginBottom: 10,
    },
    description: {
        color: '#fff',
        textAlign: 'center',
        marginBottom: 20,
        paddingHorizontal: 10,
    },
    button: {
        backgroundColor: '#fff',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    buttonText: {
        color: '#000',
        fontWeight: 'bold',
    },
    iconContainer: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
});

export default WelcomeScreen;