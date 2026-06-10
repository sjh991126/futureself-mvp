import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Link } from 'expo-router';
import { Color, FontFamily, FontSize, Border, Padding } from "./planStyles";
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const scale = Math.min(width, height) / 375;
const responsiveSize = (size) => Math.round(size * scale);

const modeselect = () => {
    const [selectedOption, setSelectedOption] = useState(null);
    const options = ['AI', 'Manual'];

    const handleOptionSelect = (option) => {
        setSelectedOption(option);
    };

    const handleNextPress = () => {
        if (selectedOption === 'AI') {
            router.push('/aifilter');
        } else if (selectedOption === 'Manual') {
            router.push('/manualselection');
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.push('/homepage')} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={26} color="white" />
                    </TouchableOpacity>
                </View>
                <View style={styles.optionsContainer}>
                    <Text style={styles.headerText}>Select Trip Generation Type</Text>
                    {options.map((option, index) => (
                        <TouchableOpacity
                            key={index}
                            onPress={() => handleOptionSelect(option)}
                        >
                            {selectedOption === option ? (
                                <LinearGradient
                                    colors={['#5468FF', '#81D8D0']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.option}
                                >
                                    <View style={styles.optionContent}>
                                        <View style={[styles.circle, styles.selectedCircle]} />
                                        <Text style={styles.selectedOptionText}>{option}</Text>
                                    </View>
                                </LinearGradient>
                            ) : (
                                <View style={styles.option}>
                                    <View style={styles.optionContent}>
                                        <View style={styles.circle} />
                                        <Text style={styles.optionText}>{option}</Text>
                                    </View>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
                <TouchableOpacity
                    onPress={selectedOption ? handleNextPress : null}
                    disabled={!selectedOption}
                >
                    {selectedOption ? (
                        <LinearGradient
                            colors={['#5468FF', '#81D8D0']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.gradientButton}  // Apply the gradient to the button style
                        >
                            <View style={styles.nextButton}>
                                <Text style={styles.enabledNextButtonText}>NEXT</Text>
                            </View>
                        </LinearGradient>
                    ) : (
                        <View style={styles.gradientButton}>
                            <View style={styles.nextButton}>
                                <Text style={styles.disabledNextButtonText}>NEXT</Text>
                            </View>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'space-between',
        backgroundColor: 'black',
    },

    header: {
        flexDirection: 'row',
        paddingVertical: 10,
    },
    backButton: {
        marginLeft: 10
    },
    headerText: {
        alignSelf: 'center',
        paddingVertical: 18,
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    optionsContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    option: {
        marginVertical: 8,
        marginHorizontal: 30,
        borderRadius: 40,
        overflow: 'hidden',
        backgroundColor: Color.buttonColor
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        // paddingVertical: 10,
        paddingHorizontal: 15,
    },
    circle: {
        width: 12,
        height: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'white',
        marginRight: 10,
    },
    selectedCircle: {
        backgroundColor: 'white',
        borderColor: 'white',
    },
    gradient: {
        // borderRadius: 40,
        // justifyContent: 'center',

    },
    // optionText: {
    //     color: 'black',
    //     fontSize: 12,
    //     fontWeight: 'bold',
    // },
    // selectedOptionText: {
    //     color: 'white',
    //     fontSize: 12,
    //     fontWeight: 'bold',
    // },
    optionText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        // textAlign: 'center',
        paddingVertical: 10,
    },
    selectedOptionText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        // textAlign: 'center',
        paddingVertical: 10,
    },
    gradientButton: {
        marginBottom: 20,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.50)',
        alignSelf: 'center'
    },
    nextButton: {
        borderRadius: responsiveSize(20),
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 8,
    },
    disabledNextButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: "600",
        textAlign: 'center',
    },
    enabledNextButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: "600",
        textAlign: 'center',
    },
});

export default modeselect;
