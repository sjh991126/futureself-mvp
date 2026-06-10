import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, Alert } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import BaseScreen from './onboard_base';
import { onboardFoodPrefs } from '../src/api/onboard_api';

const FoodScreen = () => {
    const [selectedFoods, setSelectedFoods] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const options = [
        'Chinese', 'Western', 'Japanese', 'Korean',
        'Indian', 'Local', 'Thai', 'Vegetarian',
        'Vietnamese', 'Other'
    ];

    const toggleFood = (food) => {
        if (selectedFoods.includes(food)) {
            setSelectedFoods(selectedFoods.filter(f => f !== food));
        } else {
            setSelectedFoods([...selectedFoods, food]);
        }
    };

    const handleNext = async () => {
        if (selectedFoods.length < 3) {
            Alert.alert("Validation Error", "Please select at least three food preferences.");
            return;
        }

        setIsLoading(true);
        try {
            const foodPrefsString = selectedFoods.join(',')
            await onboardFoodPrefs(foodPrefsString);
            router.push('/onboard_country'); // Navigate to Country Screen
        } catch (error) {
            Alert.alert("Submission Error", "Failed to submit your food preferences. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <BaseScreen 
            title="Food you LOVE"
            onNext={handleNext}
            buttonText={isLoading ? "Submitting..." : "NEXT"}
            buttonStyle={isLoading && { opacity: 0.7 }}
            buttonTextStyle={isLoading && { color: '#CCCCCC' }}
        >
            <Text style={styles.subtitle}>
                Choose the interests you want Trippy to use for generating content. Choose minimum of three interests.
            </Text>
            <View style={styles.foodContainer}>
                {options.map((food) => (
                    <TouchableOpacity 
                        key={food}
                        onPress={() => toggleFood(food)}
                        disabled={isLoading}
                    >
                        <LinearGradient
                            colors={selectedFoods.includes(food) ? ['#5468FF', '#81D8D0'] : ['#313131', '#313131']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[
                                styles.foodChip,
                                selectedFoods.includes(food) && styles.foodChipSelected
                            ]}
                        >
                            <Text style={styles.foodText}>{food}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                ))}
            </View>
        </BaseScreen>
    );
};

const styles = StyleSheet.create({
    foodContainer: {
        width: '100%',
        alignItems: 'flex-start',
        marginTop: 10,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    foodChip: {
        minWidth: 60,
        height: 40,
        borderRadius: 20,
        margin: 5,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    foodChipSelected: {
        // Optional: Additional styles when selected
    },
    foodText: {
        color: 'white',
        fontSize: 14,
        fontWeight: "500",
    },
    subtitle: {
        fontSize: 16,
        color: 'white',
        textAlign: 'left',
        width: 300,
        marginBottom: 8,
    },
});

export default FoodScreen;