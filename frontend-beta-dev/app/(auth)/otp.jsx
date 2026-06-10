import * as React from "react";
import {
    StyleSheet,
    View,
    Image,
    Text,
    TextInput,
    TouchableOpacity,
    Animated,
    SafeAreaView,
    Dimensions,
    KeyboardAvoidingView
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { FontFamily, FontSize, Color, Border } from "../indexStyles";
import { useRouter, Link, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { otpverify } from '../src/api/otpverify';
import { confirm } from '../src/api/confirm';
import { Ionicons } from '@expo/vector-icons';
import { Keyboard, TouchableWithoutFeedback } from 'react-native';
import LoadingSpinner from './../LoadingSpinner';
import ToastMessage from './ToastMessage';
import { reverify } from "../src/api/forgotpassword";

const { width, height } = Dimensions.get('window');

export default function otp() {
    const { from } = useLocalSearchParams();
    const textInputRefs = React.useRef([]);
    const [otp, setOtp] = React.useState(Array(6).fill(""));
    const [fadeAnim] = React.useState(new Animated.Value(1));
    const [email, setEmail] = React.useState('');
    const [errorMessage, setErrorMessage] = React.useState('');
    const [timer, setTimer] = React.useState(1);
    const [canResend, setCanResend] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [showToast, setShowToast] = React.useState(false);
    const [toastMessage, setToastMessage] = React.useState('');

    const router = useRouter();

    const showToastMessage = (message) => {
        setToastMessage(message);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    React.useEffect(() => {
        const getEmail = async () => {
            const storedEmail = await AsyncStorage.getItem('email');
            if (storedEmail) {
                setEmail(storedEmail);
                console.log(storedEmail);
            }
        };
        getEmail();
    }, []);

    React.useEffect(() => {
        let countdown;
        if (timer > 0) {
            countdown = setInterval(() => {
                setTimer(prevTimer => prevTimer - 1);
            }, 1000);
        } else {
            setCanResend(true);
            clearInterval(countdown);
        }
        return () => clearInterval(countdown);
    }, [timer]);

    const handleOtpChange = (text, index) => {
        const newOtp = [...otp];
        if (text) {
            if (newOtp[index]) {
                // If the current textbox is filled, keep the existing value
                if (index < 5 && newOtp[index + 1] === '') {
                    // Move the cursor to the next empty textbox
                    textInputRefs.current[index + 1].focus();
                }
            } else {
                // If the current textbox is not filled, update the value and move the cursor to the next textbox
                newOtp[index] = text;
                setOtp(newOtp);
                if (index < 5 && newOtp[index + 1] === '') {
                    textInputRefs.current[index + 1].focus();
                }
            }
        } else {
            if (index > 0) {
                // If the current textbox is not filled, move the cursor to the previous textbox
                textInputRefs.current[index - 1].focus();
            }
            newOtp[index] = '';
            setOtp(newOtp);
        }
    };

    const isOtpComplete = otp.every(val => val.length === 1);

    const handleOtpVerify = async () => {
        try {
            const otpString = otp.join('');
            if (from === 'forgotpassword') {
                // Call reverify for forgot password
                const response = await reverify(email, otpString);
                if (response === 'OTP is valid') {
                    router.push({
                        pathname: '/setpassword',
                        params: {
                            from: 'reverify',
                        }
                    });
                } else {
                    setErrorMessage('Invalid OTP. Please try again.');
                }
            } else {
                // Normal OTP verification
                const verify = {
                    'email': email,
                    'emailCode': otpString
                };
                const userResponse = await otpverify(verify);
                if (userResponse) {
                    router.push('/setusername');
                }
            }
        } catch (error) {
            setErrorMessage('Invalid OTP. Please try again.');
            console.error('OTP Verification Failed:', error);
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace') {
            if (otp[index]) {
                // If the current textbox is filled, erase the value and keep the cursor in the same textbox
                const newOtp = [...otp];
                newOtp[index] = '';
                setOtp(newOtp);
            } else if (index > 0) {
                // If the current textbox is not filled, move the cursor to the previous textbox and erase its value
                textInputRefs.current[index - 1].focus();
                const newOtp = [...otp];
                newOtp[index - 1] = '';
                setOtp(newOtp);
            }
        }
    };


    const handleConfirm = async () => {
        if (!canResend) return;

        try {
            setIsLoading(true);
            if (from === 'forgotpassword') {
                const response = await fetch(`${API_BASE_URL}/forgot-password/send-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                });
                if (response.ok) {
                    setIsLoading(false);
                    setTimer(60);  // Reset the timer to 60 seconds
                    setCanResend(false);
                    showToastMessage('Verification code has been sent');
                } else {
                    throw new Error('Failed to send OTP');
                }
            } else {
                const userResponse = await confirm(email);
                if (userResponse) {
                    setIsLoading(false);
                    setTimer(60);
                    setCanResend(false);
                    showToastMessage('Verification code has been sent');
                }
            }
        } catch (error) {
            console.error('Email send failed:', error);
            setIsLoading(false);
        }
    };
    const formatTime = () => {
        const minutes = Math.floor(timer / 60);
        const seconds = timer % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <KeyboardAvoidingView
            style={styles.wholeContainer}
            behavior="padding"
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <SafeAreaView style={styles.container}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={26} color="white" />
                    </TouchableOpacity>

                    <View style={styles.contentContainer} pointerEvents={isLoading ? 'none' : 'auto'}>
                        <Image style={styles.logo} resizeMode="contain" source={require("../../assets/logo_black.png")} />
                        <View style={styles.verificationSection}>
                            <View style={styles.frameWrapper}>
                                <View>
                                    <View>
                                        <Text style={[styles.enterYourVerification]}>
                                            Enter your verification code
                                        </Text>
                                        <View style={[styles.codeSentToNameexamplecomWrapper]}>
                                            <Text style={styles.codeTypo}>Code sent to: </Text>
                                            <Text style={styles.codeTypo}>{email}</Text>
                                        </View>
                                    </View>
                                    <View style={{ marginVertical: 8 }}>
                                        <View style={[styles.frameFlexBox]}>
                                            {otp.map((_, index) => (
                                                <TouchableOpacity
                                                    key={index}
                                                    onPress={() => textInputRefs.current[index].focus()}
                                                >
                                                    <LinearGradient
                                                        colors={otp[index] ? ['#5468FF', '#81D8D0'] : [Color.colorSilver, Color.colorSilver]}
                                                        start={{ x: 0, y: 0 }}
                                                        end={{ x: 1, y: 0 }}
                                                        style={[
                                                            styles.gradientBorder,
                                                            { marginHorizontal: 4 }
                                                        ]}
                                                    >
                                                        <View style={styles.inputContainer}>
                                                            <TextInput
                                                                ref={(input) => { textInputRefs.current[index] = input; }}
                                                                style={[styles.text, styles.codeTypo, { color: Color.colorWhite }]}
                                                                keyboardType="numeric"
                                                                maxLength={1}
                                                                value={otp[index]}
                                                                onChangeText={(text) => handleOtpChange(text, index)}
                                                                onKeyPress={(e) => handleKeyPress(e, index)}
                                                                returnKeyType="done"
                                                            />
                                                        </View>
                                                    </LinearGradient>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
                                        <View style={{ alignItems: 'left' }}>
                                            <TouchableOpacity onPress={handleConfirm} disabled={!canResend}>
                                                <Text style={[styles.sendCodeAgain, styles.codeTypo, { color: canResend ? Color.colorWhite : 'gray' }]}>
                                                    Send code again {canResend ? '' : `(${formatTime()})`}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <TouchableOpacity style={[styles.verifyWrapper]} onPress={handleOtpVerify}>
                                        {isOtpComplete ? (
                                            <LinearGradient
                                                style={{ flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: Border.br_3xs }}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                colors={['#5468FF', '#81D8D0']}
                                                locations={[0, 1]}
                                                useAngle={true}
                                                angle={45}
                                                angleCenter={{ x: 0.5, y: 0.5 }}
                                            >
                                                <Animated.Text style={[styles.verify, styles.codeTypo, { color: 'black', opacity: fadeAnim }]}>VERIFY</Animated.Text>
                                            </LinearGradient>
                                        ) : (
                                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                                <Text style={[styles.verify, styles.codeTypo, { color: 'black' }]}>VERIFY</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                    {isLoading && (
                        <View style={styles.loadingOverlay}>
                            <LoadingSpinner />
                        </View>
                    )}
                    {showToast && <ToastMessage message={toastMessage} />}
                </SafeAreaView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    wholeContainer: {
        flex: 1,
        backgroundColor: 'black',
        alignContent: 'center'
    },
    container: {
        flex: 1,
        backgroundColor: 'black',
        padding: 20,
        alignContent: 'center'
    },
    backButton: {
        position: 'absolute',
        top: 56,
        left: 20,
        zIndex: 1,
    },
    contentContainer: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 96,
        paddingHorizontal: 20,
        width: '100%',
    },
    logo: {
        width: width * 0.5,
        marginTop: 54,
        marginBottom: 48,
    },
    verificationSection: {
        flex: 1,
        width: '100%',
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginTop: -42,
    },
    frameWrapper: {
        width: '95%',
        alignItems: 'center',
        marginTop: 0,
    },
    frameFlexBox: {
        flexDirection: "row",
        alignItems: "center",
    },
    gradientBorder: {
        padding: 1,
        borderRadius: Border.br_3xs,
    },
    inputContainer: {
        flexDirection: 'row',
        height: height * 0.06,
        width: height * 0.06,
        borderRadius: Border.br_3xs,
        backgroundColor: '#313131',
        alignItems: 'center',
        paddingRight: 10,
    },
    codeTypo: {
        color: "#989898",
        fontFamily: FontFamily.header3SemiBold,
        fontWeight: "600",
        fontSize: 12
    },
    enterYourVerification: {
        fontSize: FontSize.headerBold_size,
        color: Color.colorWhite,
        fontFamily: FontFamily.headerBold,
        fontWeight: "700",
        marginTop: 16,
        marginBottom: 8
    },
    codeSentToNameexamplecomWrapper: {
        justifyContent: "left",
        marginBottom: 16
    },
    text: {
        left: 23,
        fontSize: FontSize.header2SemiBold_size,
        textAlign: "left",
        color: Color.colorBlack,
        top: 18,
        position: "absolute"
    },
    sendCodeAgain: {
        marginVertical: 24,
        fontSize: FontSize.textSemiBold_size,
        textAlign: "left",
        color: Color.colorBlack
    },
    verify: {
        fontSize: FontSize.header3SemiBold_size,
        color: Color.colorBlack,
        textAlign: "left",
        position: "absolute"
    },
    verifyWrapper: {
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
        borderRadius: Border.br_3xs,
        overflow: "hidden"
    },
    errorText: {
        color: 'red',
        marginTop: 10,
        fontSize: FontSize.header3SemiBold_size,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
});
