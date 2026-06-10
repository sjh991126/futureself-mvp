import * as React from "react";
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, SafeAreaView } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Border, FontFamily, FontSize, Color, Padding } from "./authStyles";

const { height } = Dimensions.get('window');

const BaseScreen = ({
    title,
    subtitle,
    onNext,
    nextDisabled = false,
    children,
    buttonText = "NEXT",
    buttonStyle = {},
    buttonTextStyle = {}
}) => {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Header - gender와 동일 구조 */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={28} color={Color.colorWhite} />
                    </TouchableOpacity>
                </View>

                {/* Title */}
                <Text style={styles.title}>{title}</Text>
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                
                {/* Content */}
                {children}
                
                {/* Next Button - gender와 동일 구조 */}
                <View style={styles.bottomContainer}>
                    {nextDisabled ? (
                        <View style={[styles.nextButton, styles.nextButtonDisabled]}>
                            <Text style={styles.nextButtonTextDisabled}>{buttonText}</Text>
                        </View>
                    ) : (
                        <TouchableOpacity 
                            style={styles.nextButton}
                            onPress={onNext}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                style={styles.nextGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                colors={['#5468FF', '#81D8D0']}
                            >
                                <Text style={[styles.nextButtonText, buttonTextStyle]}>{buttonText}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorBlack,
    },
    content: {
        flex: 1,
        paddingHorizontal: 10,
    },
    header: {
        paddingTop: 8,
        marginBottom: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: Color.colorWhite,
        marginBottom: 32,
    },
    subtitle: {
        fontSize: 16,
        color: Color.colorSilver,
        marginBottom: 16,
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 20,
        left: 12,
        right: 12,
    },
    nextButton: {
        height: 40,
        borderRadius: 10,
        overflow: 'hidden',
    },
    nextGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nextButtonDisabled: {
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    nextButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 1,
    },
    nextButtonTextDisabled: {
        fontSize: 14,
        fontWeight: '700',
        color: '#000',
        letterSpacing: 1,
    },
});

export default BaseScreen;