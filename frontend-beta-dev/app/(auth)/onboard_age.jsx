import React, { useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, Keyboard, TouchableWithoutFeedback, ActivityIndicator, Alert } from "react-native";
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import BaseScreen from './onboard_base';
import { onboardBirthday } from '../src/api/onboard_api';

const { width, height } = Dimensions.get('window');

const AgeScreen = () => {
    const [month, setMonth] = useState('');
    const [day, setDay] = useState('');
    const [year, setYear] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const monthRef = useRef(null);
    const dayRef = useRef(null);
    const yearRef = useRef(null);

    const isValidMonth = (value) => {
        const monthNum = parseInt(value);
        return monthNum > 0 && monthNum <= 12;
    };

    const isValidDay = (value) => {
        const dayNum = parseInt(value);
        return dayNum > 0 && dayNum <= 31;
    };

    const isValidYear = (value) => {
        return value.length === 4;
    };

    const handleMonthChange = (value) => {
        if (value.length <= 2 && /^\d*$/.test(value)) {
            setMonth(value);
            if (value.length === 2 && isValidMonth(value)) {
                dayRef.current?.focus();
            }
        }
    };

    const handleDayChange = (value) => {
        if (value.length <= 2 && /^\d*$/.test(value)) {
            setDay(value);
            if (value.length === 2 && isValidDay(value)) {
                yearRef.current?.focus();
            }
        }
    };

    const handleYearChange = (value) => {
        if (value.length <= 4 && /^\d*$/.test(value)) {
            setYear(value);
            if (value.length === 4 && isValidYear(value)) {
                Keyboard.dismiss();
            }
        }
    };

    const getFormattedDate = () => {
        return `${year}${month.padStart(2, '0')}${day.padStart(2, '0')}`;
    };

    const handleNext = async () => {
        if (!isValidMonth(month) || !isValidDay(day) || !isValidYear(year)) {
            Alert.alert("Validation Error", "Please enter a valid birthday.");
            return;
        }

        const formattedDate = getFormattedDate();

        setIsLoading(true);
        try {
            await onboardBirthday(formattedDate);
            router.push('/onboard_groups'); // Navigate to Groups Screen
        } catch (error) {
            Alert.alert("Submission Error", "Failed to submit your birthday. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const getDisplayCharacters = (value, length) => {
        const chars = value.split('');
        const result = new Array(length).fill('');
        chars.forEach((char, index) => {
            if (index < length) {
                result[index] = char;
            }
        });
        return result;
    };

    const monthChars = getDisplayCharacters(month, 2);
    const dayChars = getDisplayCharacters(day, 2);
    const yearChars = getDisplayCharacters(year, 4);

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <BaseScreen
                title="Your birthday?"
                onNext={handleNext}
                nextDisabled={!isValidMonth(month) || !isValidDay(day) || !isValidYear(year) || isLoading}
                buttonText={isLoading ? "Submitting..." : "NEXT"}
                buttonStyle={isLoading && { opacity: 0.7 }}
                buttonTextStyle={isLoading && { color: '#CCCCCC' }}
            >
                <View style={styles.inputContainer}>
                    <View style={styles.dateContainer}>
                        {/* Month */}
                        <TouchableOpacity
                            style={styles.inputGroup}
                            onPress={() => monthRef.current?.focus()}
                            activeOpacity={0.7}
                        >
                            <TextInput
                                ref={monthRef}
                                style={[styles.hiddenInput]}
                                value={month}
                                onChangeText={handleMonthChange}
                                keyboardType="number-pad"
                                maxLength={2}
                            />
                            {monthChars.map((char, index) => (
                                <View key={`month-${index}`} style={styles.charContainer}>
                                    <Text style={styles.inputText}>
                                        {char || 'M'}
                                    </Text>
                                    <View style={styles.underline} />
                                </View>
                            ))}
                        </TouchableOpacity>

                        <Text style={styles.separator}>/</Text>

                        {/* Day */}
                        <TouchableOpacity
                            style={styles.inputGroup}
                            onPress={() => dayRef.current?.focus()}
                            activeOpacity={0.7}
                        >
                            <TextInput
                                ref={dayRef}
                                style={[styles.hiddenInput]}
                                value={day}
                                onChangeText={handleDayChange}
                                keyboardType="number-pad"
                                maxLength={2}
                            />
                            {dayChars.map((char, index) => (
                                <View key={`day-${index}`} style={styles.charContainer}>
                                    <Text style={styles.inputText}>
                                        {char || 'D'}
                                    </Text>
                                    <View style={styles.underline} />
                                </View>
                            ))}
                        </TouchableOpacity>

                        <Text style={styles.separator}>/</Text>

                        {/* Year */}
                        <TouchableOpacity
                            style={styles.inputGroup}
                            onPress={() => yearRef.current?.focus()}
                            activeOpacity={0.7}
                        >
                            <TextInput
                                ref={yearRef}
                                style={[styles.hiddenInput]}
                                value={year}
                                onChangeText={handleYearChange}
                                keyboardType="number-pad"
                                maxLength={4}
                            />
                            {yearChars.map((char, index) => (
                                <View key={`year-${index}`} style={styles.charContainer}>
                                    <Text style={styles.inputText}>
                                        {char || 'Y'}
                                    </Text>
                                    <View style={styles.underline} />
                                </View>
                            ))}
                    </TouchableOpacity>
                </View>
            </View>
        </BaseScreen>
        </TouchableWithoutFeedback >
    );
};

const styles = StyleSheet.create({
    inputContainer: {
        width: '100%',
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
    },
    hiddenInput: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        opacity: 0,
        zIndex: 1,
    },
    charContainer: {
        alignItems: 'center',
        marginHorizontal: 2,
    },
    inputText: {
        color: 'white',
        fontSize: 24,
        height: 40,
        opacity: 0.8,
    },
    underline: {
        width: 24,
        height: 1,
        backgroundColor: 'white',
        marginTop: 2,
    },
    separator: {
        color: 'white',
        fontSize: 24,
        marginHorizontal: 8,
        opacity: 0.8,
    },
});

export default AgeScreen;