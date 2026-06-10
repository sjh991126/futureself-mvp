import * as React from "react";
import { StyleSheet, View, Image, Text, TextInput, Animated, ActivityIndicator, TouchableOpacity, SafeAreaView, Dimensions, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { Border, FontFamily, FontSize, Color, Padding } from "./authStyles";
import { Ionicons } from '@expo/vector-icons';
import { resetPassword } from "../src/api/forgotpassword";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setLoading } from "../slices/placesSlice";

const { width, height } = Dimensions.get('window');

export default function SetPassword() {
    const params = useLocalSearchParams();
    const username = params.username;
    console.log("username", username);
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [isFocused, setIsFocused] = React.useState(false);
    const [isConfirmFocused, setIsConfirmFocused] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
    const [errorMessage, setErrorMessage] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [fadeAnim] = React.useState(new Animated.Value(1));
    const confirmPasswordRef = React.useRef(null);

    const passwordFormatText = "Password must be at least 8 characters long, containing  at least one letters and numbers";

    const handleRegister = async () => {
        setIsLoading(true);

        const passwordRegex = /^(?=.*[a-zA-Z])(?=.*[0-9])[a-zA-Z0-9\W_]{8,}$/;

        if (!passwordRegex.test(password)) {
            setErrorMessage(passwordFormatText);
            setIsLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage("Passwords do not match.");
            setIsLoading(false);
            return;
        }

        try {
            const email = await AsyncStorage.getItem('email');

            if (!email) {
                setErrorMessage('Failed to retrieve email.');
                setIsLoading(false);
                return;
            }

            if (params.from === 'reverify') {
                console.log('Password reset for:', email);
                const response = await resetPassword(email, password);
                if (response) {
                    router.push('/login');
                }
            } else {
                router.push({
                    pathname: '/setprofile',
                    params: { username, password }
                });
            }
        } catch (error) {
            setErrorMessage('Failed to reset password. Please try again.');
            setIsLoading(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior="padding">
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <SafeAreaView style={styles.container}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={26} color="white" />
                    </TouchableOpacity>
                    <View style={styles.contentContainer} pointerEvents={isLoading ? 'none' : 'auto'}>
                        <View style={styles.frameParent}>
                            <View>
                                <Text style={styles.title}>Enter your password</Text>
                                <View>
                                    <LinearGradient
                                        colors={isFocused ? ['#5468FF', '#81D8D0'] : [Color.colorSilver, Color.colorSilver]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.gradientBorder}
                                    >
                                        <View style={styles.inputContainer}>
                                            <TextInput
                                                style={styles.input}
                                                value={password}
                                                onChangeText={setPassword}
                                                placeholder="Password"
                                                placeholderTextColor={'#ABB7C2'}
                                                onFocus={() => setIsFocused(true)}
                                                onBlur={() => setIsFocused(false)}
                                                secureTextEntry={!showPassword}
                                                returnKeyType="next"
                                                onSubmitEditing={() => confirmPasswordRef.current.focus()}
                                            />
                                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                                <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="gray" />
                                            </TouchableOpacity>
                                        </View>
                                    </LinearGradient>
                                    <LinearGradient
                                        colors={isConfirmFocused ? ['#5468FF', '#81D8D0'] : [Color.colorSilver, Color.colorSilver]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.gradientBorder}
                                    >
                                        <View style={styles.inputContainer}>
                                            <TextInput
                                                ref={confirmPasswordRef}
                                                style={styles.input}
                                                value={confirmPassword}
                                                onChangeText={setConfirmPassword}
                                                placeholder="Confirm Password"
                                                placeholderTextColor={'#ABB7C2'}
                                                onFocus={() => setIsConfirmFocused(true)}
                                                onBlur={() => setIsConfirmFocused(false)}
                                                secureTextEntry={!showConfirmPassword}
                                            />
                                            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                                <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={24} color="gray" />
                                            </TouchableOpacity>
                                        </View>
                                    </LinearGradient>
                                    {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
                                </View>
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity onPress={handleRegister} style={[styles.buttonLayout]}>
                        <LinearGradient
                            style={{ flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: Border.br_3xs }}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            colors={password && confirmPassword ? ['#5468FF', '#81D8D0'] : ['#d3d3d3', '#d3d3d3']}
                            locations={[0, 1]}
                            useAngle={true}
                            angle={45}
                            angleCenter={{ x: 0.5, y: 0.5 }}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color={Color.colorBlack} />
                            ) : (
                                <Animated.Text style={[styles.nextButtonText, styles.nextTypo, { opacity: fadeAnim }]}>NEXT</Animated.Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </SafeAreaView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    backButton: {
        position: 'absolute',
        top: 56,
        left: 8,
        zIndex: 1,
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        width: '100%',
        paddingTop: 60,
    },
    frameParent: {
        alignSelf: 'center',
        width: '95%',
    },
    gradientBorder: {
        padding: 1,
        borderRadius: Border.br_3xs,
        marginBottom: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        height: height * 0.06,
        borderRadius: Border.br_3xs,
        backgroundColor: '#313131',
        alignItems: 'center',
        paddingRight: 10,
    },
    input: {
        flex: 1,
        color: Color.colorWhite,
        paddingLeft: 30,
    },
    nextTypo: {
        fontFamily: FontFamily.header3SemiBold,
        fontWeight: "600",
        fontSize: FontSize.header3SemiBold_size,
        textAlign: "left"
    },
    title: {
        fontSize: FontSize.headerBold_size,
        color: Color.colorWhite,
        fontFamily: FontFamily.headerBold,
        fontWeight: "700",
        marginVertical: 12,
        fontSize: 26
    },
    nextButtonText: {
        color: 'black',
        fontWeight: 'bold',
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
        overflow: "hidden",
        position: 'absolute',
        bottom: 50,
        width: '90%',
        alignSelf: 'center',
    },
    errorText: {
        color: 'red',
        marginLeft: 5,
        fontSize: FontSize.header3SemiBold_size,
    },
});