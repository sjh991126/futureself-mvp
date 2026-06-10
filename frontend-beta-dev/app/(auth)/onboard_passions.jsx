import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import styles from './onboard_styles';
import BaseScreen from './onboard_base';
import { onboardHobbies } from '../src/api/onboard_api';

const PassionsScreen = () => {
    const [selectedPassions, setSelectedPassions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const passions = [
        'Cafe hopping', 'Animal lover', 'Friends', 'Drinking', 'Outdoors',
        'Sports', 'Reading', 'Self care', 'Photography', 'Fashion',
        'Cycling', 'Picnicking', 'Shopping', 'Brunch', 'Golf',
        'Movies', 'Music', 'Festivals', 'Hiking', 'Beach',
        'Studying', 'Coffee', 'Night Out'
    ];

    const togglePassion = (passion) => {
        if (selectedPassions.includes(passion)) {
            setSelectedPassions(selectedPassions.filter(p => p !== passion));
        } else {
            setSelectedPassions([...selectedPassions, passion]);
        }
    };

    const handleSubmit = async () => {
        if (selectedPassions.length < 3) {
            Alert.alert("Validation Error", "Please select at least three passions.");
            return;
        }

        setIsLoading(true);
        try {
            const hobbiesString = selectedPassions.join(','); // Assuming passions are mapped to hobbies
            await onboardHobbies(hobbiesString);
            // If there's a separate API for passions, call it here
            // await onboardPassions(JSON.stringify(selectedPassions));
            router.push('/homepage'); // Navigate to Homepage
        } catch (error) {
            Alert.alert("Submission Error", "Failed to submit your passions. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <BaseScreen 
            title="My Passions"
            subtitle="Choose the interests you want Trippy to use for generating content. Choose minimum of three interests."
            onNext={handleSubmit}
            buttonText={isLoading ? "Submitting..." : "LET'S GET STARTED"}
            buttonStyle={isLoading && { opacity: 0.7 }}
            buttonTextStyle={isLoading && { color: '#CCCCCC' }}
        >
            <View style={styles.passionsContainer}>
                {passions.map((passion) => (
                    <TouchableOpacity 
                        key={passion}
                        onPress={() => togglePassion(passion)}
                        disabled={isLoading}
                    >
                        <LinearGradient
                            colors={selectedPassions.includes(passion) ? ['#5468FF', '#81D8D0'] : ['#313131', '#313131']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.passionChip}
                        >
                            <Text style={styles.passionText}>{passion}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                ))}
            </View>
        </BaseScreen>
    );
};

export default PassionsScreen;