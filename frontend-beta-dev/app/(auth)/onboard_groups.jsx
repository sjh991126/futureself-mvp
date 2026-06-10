import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, Alert } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import BaseScreen from './onboard_base';
import { onboardGroupTypes } from '../src/api/onboard_api';

const { width } = Dimensions.get('window');

const GroupsScreen = () => {
    const router = useRouter();

    const [selectedGroups, setSelectedGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const options = [
        { label: 'Solo', value: 'Solo', icon: '👤' },
        { label: 'Couple', value: 'Couple', icon: '💕' },
        { label: 'Friends', value: 'Friends', icon: '👥' },
        { label: 'Family', value: 'Family', icon: '👪' },
        { label: 'With Pet', value: 'With Pet', icon: '🐶🐱' }
    ];

    const toggleGroup = (value) => {
        if (selectedGroups.includes(value)) {
            setSelectedGroups(selectedGroups.filter(g => g !== value));
        } else {
            setSelectedGroups([...selectedGroups, value]);
        }
    };

    const handleNext = async () => {
        if (selectedGroups.length === 0) {
            Alert.alert("Validation Error", "Please select at least one group.");
            return;
        }

        setIsLoading(true);
        try {
            const groupsString = selectedGroups.join(',');
            console.log(`Submitting groups: ${groupsString}`);
            await onboardGroupTypes(groupsString);
            router.push('/onboard_foods');
        } catch (error) {
            console.error("Error submitting group preferences:", error);
            if (error.response) {
                console.error("Response data:", error.response.data);
                console.error("Response status:", error.response.status);
            } else {
                console.error("Error message:", error.message);
            }
            Alert.alert("Submission Error", "Failed to submit your group preferences. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <BaseScreen 
            title="What groups do you hang out with?"
            onNext={handleNext}
            buttonText={isLoading ? "Submitting..." : "NEXT"}
            buttonStyle={isLoading && { opacity: 0.7 }}
            buttonTextStyle={isLoading && { color: '#CCCCCC' }}
        >
            <View style={styles.groupsContainer}>
                {options.map((option, index) => (
                    <TouchableOpacity 
                        key={option.value}
                        onPress={() => toggleGroup(option.value)}
                        disabled={isLoading}
                    >
                        <LinearGradient
                            colors={selectedGroups.includes(option.value) ? ['#5468FF', '#81D8D0'] : ['#313131', '#313131']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[
                                styles.groupOption,
                                selectedGroups.includes(option.value) && styles.groupOptionSelected,
                                index < 3 ? styles.firstRow : styles.secondRow
                            ]}
                        >
                            <Text style={styles.groupIcon}>{option.icon}</Text>
                            <Text style={styles.groupText}>{option.label}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                ))}
            </View>
        </BaseScreen>
    );
};

const styles = StyleSheet.create({
    groupsContainer: {
        width: '100%',
        alignItems: 'center',
        marginTop: 10,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    groupOption: {
        width: 113,
        height: 113,
        borderRadius: 10,
        margin: 10,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
    },
    groupOptionSelected: {
        // You can add additional styles for selected state if desired
    },
    groupIcon: {
        fontSize: 30,
        marginBottom: 5,
    },
    groupText: {
        color: 'white',
        fontSize: 16,
        fontWeight: "700",
        textAlign: 'center',
    },
    firstRow: {
        // Optional: Styles specific to the first row
    },
    secondRow: {
        // Optional: Styles specific to the second row
    },
});

export default GroupsScreen;