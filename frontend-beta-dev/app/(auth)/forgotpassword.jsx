import React, { useState, useEffect} from 'react';
import { StyleSheet, ActivityIndicator, Keyboard, View, Text, TextInput, TouchableOpacity, Image, SafeAreaView, Dimensions, KeyboardAvoidingView, TouchableWithoutFeedback, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Border, FontFamily, FontSize, Color, Padding } from "./authStyles";
import { checkEmailExists } from '../src/api/user';
import { reconfirm } from '../src/api/forgotpassword';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const forgotpassword = () => {
    const [email, setEmail] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [isValidEmail, setIsValidEmail] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [fadeAnim] = useState(new Animated.Value(1));

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    useEffect(() => {
        if (email && validateEmail(email)) {
            setIsValidEmail(true);
            setErrorMessage('');
        } else {
            setIsValidEmail(false);
        }
    }, [email]);

    const handleGetOTP = async () => {
        setIsLoading(true);

        if (!email) {
            setErrorMessage('Email is required');
            return;
        }

        if (!validateEmail(email)) {
            setErrorMessage('Please enter a valid email address');
            return;
        }

        try {
            const isEmailExists = await checkEmailExists(email);
            console.log("Email", isEmailExists);
            if (isEmailExists) {
                sendOtp(email);
            } else {
                setErrorMessage('Email doesn\'t exist.');
            }
        } catch (error) {
            console.error('Error checking email:', error);
            setErrorMessage('An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const sendOtp = async () => {
        try {
            const userResponse = await reconfirm(email);
            if (userResponse) {
                await AsyncStorage.setItem('email', email);
                router.push({
                    pathname: '/otp',
                    params: {
                        from: 'forgotpassword',
                    }
                })
                console.log('Email sent:', userResponse);
            }
        } catch (error) {
            if (error.response && error.response.status === 400) {
                setErrorMessage('User with this email doesn\'t exist.');
            } else {
                console.error('Email send failed:', error);
                setErrorMessage('An unexpected error occurred. Please try again.');
            }
        }
        finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior="padding"
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <SafeAreaView style={styles.container}>
                    {/* <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={24} color="white" />
                    </TouchableOpacity> */}
                    <Image
                        style={styles.logo}
                        resizeMode="contain"
                        source={require("../../assets/logo_black.png")}
                    />
                    <View style={styles.frameParent}>

                        <Text style={styles.title}>Forgot Password?</Text>
                        <Text style={styles.subtitle}>
                            Don't worry! It happens. {`\n`}
                            Please enter your email address.
                        </Text>
                        <LinearGradient
                            colors={isFocused ? ['#5468FF', '#81D8D0'] : ['#ABB7C2', '#ABB7C2']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.gradientBorder}
                        >
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="name@example.com"
                                    placeholderTextColor={'#ABB7C2'}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                        </LinearGradient>
                        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
                        <TouchableOpacity style={[styles.buttonLayout]} onPress={handleGetOTP}>
                            <LinearGradient
                                style={{ flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: Border.br_3xs }}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                colors={isValidEmail ? ['#5468FF', '#81D8D0'] : ['#d3d3d3', '#d3d3d3']}
                                locations={[0, 1]}
                                useAngle={true}
                                angle={45}
                                angleCenter={{ x: 0.5, y: 0.5 }}
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color={Color.colorBlack} />
                                ) : (
                                    <Animated.Text style={[styles.nextButtonText, styles.nextTypo, { opacity: fadeAnim }]}>Get OTP</Animated.Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
        padding: 10,
        justifyContent: 'center',
    },
    backButton: {
        position: 'absolute',
        top: 40,
        left: 20,
        zIndex: 1,
    },
    logo: {
        width: width * 0.6,
        alignSelf: 'center',
    },
    frameParent: {
        alignSelf: 'center',
        width: '100%',
    },
    title: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
        marginVertical: 8,
    },
    subtitle: {
        color: '#ABB7C2',
        fontSize: 14,
        marginBottom: 20,
    },
    gradientBorder: {
        padding: 1,
        borderRadius: 10,
        width: '100%',
    },
    inputContainer: {
        flexDirection: 'row',
        height: height * 0.06,
        borderRadius: 10,
        backgroundColor: '#313131',
        alignItems: 'center',
        paddingRight: 10,
    },
    input: {
        flex: 1,
        color: '#fff',
        paddingLeft: 20,
    },
    buttonLayout: {
        shadowColor: "rgba(0, 0, 0, 0.25)",
        shadowOffset: {
            width: 0,
            height: 4
        },
        shadowRadius: 4,
        elevation: 4,
        shadowOpacity: 1,
        backgroundColor: Color.colorWhite,
        height: height * 0.045,
        marginTop: height * 0.04,
        borderRadius: Border.br_3xs,
        overflow: "hidden"
    },
    nextButtonText: {
        color: 'black',
        fontWeight: 'bold',
    },
    nextTypo: {
        fontFamily: FontFamily.header3SemiBold,
        fontWeight: "600",
        fontSize: FontSize.header3SemiBold_size,
        textAlign: "left"
    },
    button: {
        backgroundColor: '#fff',
        borderRadius: 8,
        width: '100%',
        height: height * 0.06,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    buttonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorText: {
        color: 'red',
        marginTop: 5,
        marginLeft: 5,
        fontSize: FontSize.header3SemiBold_size,
    },
});

export default forgotpassword;