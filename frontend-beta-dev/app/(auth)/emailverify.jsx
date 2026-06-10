import React, { useRef, useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Image, Text, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, TouchableOpacity, Dimensions, Keyboard, TouchableWithoutFeedback } from "react-native";
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { Border, FontFamily, FontSize, Color } from "./authStyles";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { confirm } from '../src/api/confirm';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { fetchTerms } from "../src/api/fetchterms";
import AppleLogo from "../../assets/icons/apple_logo.jsx";
import DeviceSelectionModal from "../../assets/components/DeviceSelectionModal";
import { useAppleAuth } from '../src/hooks/useAppleAuth';
import { useGoogleAuth } from '../src/hooks/useGoogleAuth';
import { checkEmailExists } from '../src/api/user';

const { width, height } = Dimensions.get('window');

export default function EmailVerify() {
    const [email, setEmail] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isValidEmail, setIsValidEmail] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSheetLoading, setIsSheetLoading] = useState(false);
    const [activeSheet, setActiveSheet] = useState(null);
    const bottomSheetRef = useRef(null);
    const [content, setContent] = useState('');

    const { signInWithApple, completeDeviceSelection } = useAppleAuth();
    const { signInWithGoogle, completeDeviceSelection: completeGoogleDeviceSelection } = useGoogleAuth();
    const [showDeviceSelection, setShowDeviceSelection] = useState(false);
    const [deviceSelectionData, setDeviceSelectionData] = useState(null);
    const [appleLoading, setAppleLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [loginMethod, setLoginMethod] = useState(null);
    const termsCache = new Map();
    const bottomSheetSnapPoints = React.useMemo(() => {
        if (height < 700) {
            return ['45%', '62%'];
        }

        if (height < 850) {
            return ['42%', '58%'];
        }

        return ['38%', '52%'];
    }, []);

    const router = useRouter();

    useFocusEffect(
        useCallback(() => {
            // 화면에 포커스될 때 submitting 상태 리셋
            setIsSubmitting(false);

            return () => {
                // cleanup (필요시)
            };
        }, [])
    );

    const openBottomSheet = (sheetType) => {
        setActiveSheet(sheetType);
        bottomSheetRef.current?.expand();
    };

    const renderBackdrop = useCallback(
        (props) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
                opacity={0.55}
                pressBehavior="close"
            />
        ),
        []
    );

    // 실시간 검증 로직 완전 제거
    useEffect(() => {
        // 이메일 형식만 간단히 체크 (버튼 활성화용)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        setIsValidEmail(emailRegex.test(email.trim()));
    }, [email]);

    useEffect(() => {
        if (!activeSheet) return;

        let mounted = true;
        const fetchAndSetContent = async () => {
            const tncNumber =
                activeSheet === 'terms' ? '1' :
                    activeSheet === 'ai-tools' ? '2' :
                        activeSheet === 'privacy' ? '3' : null;

            if (!tncNumber) return;

            if (termsCache.has(tncNumber)) {
                setContent(termsCache.get(tncNumber));
                return;
            }

            setIsSheetLoading(true);
            try {
                const fetched = await fetchTerms(tncNumber);
                if (mounted) {
                    termsCache.set(tncNumber, fetched);
                    setContent(fetched);
                }
            } catch (e) {
                console.error('Failed to fetch content', e);
            } finally {
                mounted && setIsSheetLoading(false);
            }
        };
        fetchAndSetContent();

        return () => { mounted = false; };
    }, [activeSheet]);

    const renderContent = () => (
        <BottomSheetScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 }}
            showsVerticalScrollIndicator
            keyboardDismissMode="on-drag"
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={16}
        >
            <Text style={styles.sheetTitle}>
                {activeSheet === 'terms' ? 'General Terms of Use'
                    : activeSheet === 'ai-tools' ? 'Terms and Conditions of Trippy AI Tools'
                        : activeSheet === 'privacy' ? 'Trippy Privacy Policy' : ''}
            </Text>

            <Text style={styles.sheetText}>
                {isSheetLoading ? 'Loading...' : content}
            </Text>

            <View style={{ height: 40 }} />
        </BottomSheetScrollView>
    );

    const handleSheetChanges = (index) => {
        if (index === -1) {
            setActiveSheet(null);
        }
    };

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleConfirm = async () => {
        const trimmed = (email || '').trim();

        // 1. 이메일 형식 검증
        if (!trimmed || !validateEmail(trimmed)) {
            setErrorMessage('Please enter a valid email address');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(''); // 기존 에러 메시지 클리어
        Keyboard.dismiss();

        try {
            // 2. 이메일 중복 체크
            const result = await checkEmailExists(trimmed);

            if (result) {
                setErrorMessage('This email is already registered. Please log in instead.');
                setIsSubmitting(false);
                return;
            }

            // 3. 검증 통과 - OTP 전송
            await AsyncStorage.setItem('email', trimmed);

            router.push({
                pathname: '/otp',
                params: { from: 'EmailVerify' }
            });

            // Send OTP (fire and forget)
            confirm(trimmed).catch(error => {
                console.error('Email send failed:', error);
            });
        } catch (error) {
            console.error('Email verification error:', error);
            const status = error?.response?.status;
            const rawMessage = String(
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                ''
            );
            const message = rawMessage.toLowerCase();

            if (
                status === 409 ||
                message.includes('already') ||
                message.includes('exist') ||
                message.includes('duplicate')
            ) {
                setErrorMessage('This email is already registered. Please log in instead.');
            } else if (status === 401 || status === 403) {
                setErrorMessage('Email check is unauthorized. Please contact support.');
            } else if (rawMessage) {
                setErrorMessage(rawMessage);
            } else {
                setErrorMessage('Failed to verify email. Please try again.');
            }
            setIsSubmitting(false);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            setGoogleLoading(true);
            const result = await signInWithGoogle();

            if (result.canceled) return;

            if (result.isNewUser) {
                router.push({
                    pathname: '/setprofile',
                    params: {
                        googleId: result.googleData.googleId,
                        googleEmail: result.googleData.email,
                        fullName: result.googleData.name,
                        imageUrl: result.googleData.photo,
                        idToken: result.googleData.idToken,
                        loginMethod: 'google',
                    }
                });
                return;
            }

            if (result.deviceSelection?.needsDeviceSelection) {
                setLoginMethod('google');
                setDeviceSelectionData(result.deviceSelection);
                setShowDeviceSelection(true);
                return;
            }

            if (result.loginSuccess) {
                router.push('/homepage');
                return;
            }
        } catch (error) {
            const msg = error?.getUserMessage?.() || error?.message || 'Unexpected error';
            Alert.alert('Login Error', msg);
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleAppleSignIn = async () => {
        try {
            setAppleLoading(true);
            const result = await signInWithApple();

            if (result.canceled) {
                return;
            }

            if (result.isNewUser) {
                router.push({
                    pathname: '/setprofile',
                    params: {
                        appleId: result.appleData.appleId,
                        appleEmail: result.appleData.email,
                        fullName: result.appleData.name,
                        identityToken: result.appleData.identityToken,
                        user: result.appleData.user,
                    }
                });
                return;
            }

            if (result.needsDeviceSelection) {
                setLoginMethod('apple');
                setDeviceSelectionData(result.deviceSelection);
                setShowDeviceSelection(true);
                return;
            }

            if (result.loginSuccess) {
                router.push('/homepage');
                return;
            }

        } catch (err) {
            const msg = err?.getUserMessage?.() || err?.message || 'Unexpected error';
            Alert.alert('Login Error', msg);
        } finally {
            setAppleLoading(false);
        }
    };

    const handleDeviceSelectionComplete = async (selectedDeviceIds) => {
        try {
            let result;

            if (loginMethod === 'google') {
                result = await completeGoogleDeviceSelection(selectedDeviceIds);
            } else {
                result = await completeDeviceSelection(selectedDeviceIds, true);
            }

            if (result.loginSuccess) {
                setShowDeviceSelection(false);
                setLoginMethod(null);
                router.push('/homepage');
            }
        } catch (err) {
            const msg = err?.getUserMessage?.() || err?.message || 'Unexpected error';
            Alert.alert('Device Selection Error', msg);
        }
    };

    const handleDeviceSelectionCancel = () => {
        setShowDeviceSelection(false);
        setDeviceSelectionData(null);
        setLoginMethod(null);
    };

    return (
        <SafeAreaView style={styles.container}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <View style={{ flex: 1 }}>
                    <View style={styles.centerWrap}>
                        <Image style={styles.logo} resizeMode="contain" source={require("../../assets/logo_black.png")} />

                        <View style={styles.frameParent}>
                            <View>
                                <View>
                                    <Text style={styles.whatsYourEmail}>What's your email address?</Text>
                                    <LinearGradient
                                        colors={isFocused ? ['#5468FF', '#81D8D0'] : [Color.colorSilver, Color.colorSilver]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.gradientBorder}
                                    >
                                        <View style={styles.inputContainer}>
                                            <TextInput
                                                style={styles.input}
                                                value={email}
                                                onChangeText={(t) => {
                                                    setEmail(t);
                                                    // 입력 중에는 에러 메시지만 클리어
                                                    if (errorMessage) {
                                                        setErrorMessage('');
                                                    }
                                                }}
                                                placeholder="name@example.com"
                                                placeholderTextColor={'#ABB7C2'}
                                                onFocus={() => setIsFocused(true)}
                                                onBlur={() => setIsFocused(false)}
                                                keyboardType="email-address"
                                                autoCapitalize="none"
                                                autoCorrect={false}
                                                textContentType="emailAddress"
                                                accessibilityLabel="Email address input"
                                                returnKeyType="done"
                                                onSubmitEditing={handleConfirm}
                                            />
                                        </View>
                                    </LinearGradient>
                                    {errorMessage ? (
                                        <View style={styles.errorContainer}>
                                            <Text style={styles.errorText}>{errorMessage}</Text>
                                        </View>
                                    ) : null}
                                </View>
                                <TouchableOpacity
                                    onPress={handleConfirm}
                                    style={[styles.buttonLayout]}
                                    disabled={!isValidEmail || isSubmitting}
                                    accessibilityLabel="Send verification email"
                                    accessibilityRole="button"
                                    accessibilityState={{
                                        disabled: !isValidEmail || isSubmitting
                                    }}
                                >
                                    <LinearGradient
                                        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: Border.br_3xs }}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        colors={isValidEmail && !isSubmitting
                                            ? ['#5468FF', '#81D8D0']
                                            : ['#FFFFFF', '#FFFFFF']}
                                        locations={[0, 1]}
                                        useAngle={true}
                                        angle={45}
                                        angleCenter={{ x: 0.5, y: 0.5 }}
                                    >
                                        {isSubmitting ? (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <ActivityIndicator size="small" color="#000" />
                                                <Text style={styles.nextButtonText}>Verifying...</Text>
                                            </View>
                                        ) : (
                                            <Text style={styles.nextButtonText}>NEXT</Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                            <Text style={[styles.haveAnAccountContainer]}>
                                <Text style={styles.haveAnAccount}>{`Have an account? `}</Text>
                                <Link style={styles.logIn} href="/login">Log in</Link>
                            </Text>
                            <Text style={[styles.or]}>or</Text>
                            <TouchableOpacity
                                style={[styles.socialButton, googleLoading && { opacity: 0.6 }]}
                                onPress={handleGoogleSignIn}
                                disabled={googleLoading}
                            >
                                <View style={styles.socialButtonContent}>
                                    {googleLoading ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Image source={require('../../assets/Google.png')} style={styles.socialIconImg} resizeMode="contain" />
                                    )}
                                    {!googleLoading && <Text style={styles.socialButtonText}>Continue with Google</Text>}
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.socialButton, appleLoading && { opacity: 0.6 }]}
                                onPress={handleAppleSignIn}
                                disabled={appleLoading}
                            >
                                <View style={styles.socialButtonContent}>
                                    {appleLoading ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <AppleLogo width={20} height={20} />
                                    )}
                                    {!appleLoading && <Text style={styles.socialButtonText}>Continue with Apple</Text>}
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={{ marginBottom: 20, paddingHorizontal: 10 }}>
                        <Text style={styles.termsText}>
                            By signing up or logging in, you acknowledge and agree to Trippy's
                            <Text style={styles.link} onPress={() => openBottomSheet('terms')}> General Terms of Use</Text>,
                            <Text style={styles.link} onPress={() => openBottomSheet('ai-tools')}> Terms and Conditions of Trippy AI Tools</Text> and
                            <Text style={styles.link} onPress={() => openBottomSheet('privacy')}> Trippy Privacy Policy</Text>.
                        </Text>
                    </View>
                </View>
            </TouchableWithoutFeedback >

            <BottomSheet
                ref={bottomSheetRef}
                snapPoints={bottomSheetSnapPoints}
                index={-1}
                enablePanDownToClose={true}
                onChange={handleSheetChanges}
                backdropComponent={renderBackdrop}
                backgroundStyle={styles.bottomSheetBackground}
                handleStyle={styles.handleStyle}
                handleIndicatorStyle={styles.handleIndicatorStyle}
                enableDynamicSizing={false}
                keyboardBehavior="interactive"
                keyboardBlurBehavior="restore"
                android_keyboardInputMode="adjustResize"
                enableContentPanningGesture={true}
            >
                {renderContent()}
            </BottomSheet>
            <DeviceSelectionModal
                visible={showDeviceSelection}
                deviceSelection={deviceSelectionData}
                onDeviceSelected={handleDeviceSelectionComplete}
                onCancel={handleDeviceSelectionCancel}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    centerWrap: {
        flexGrow: 1,
        paddingHorizontal: 10,
        paddingTop: 52,
        justifyContent: 'center'
    },
    backButton: {
        position: 'absolute',
        top: 40,
        left: 20,
        zIndex: 1,
    },
    logo: {
        width: width * 0.5,
        height: Math.max(44, height * 0.075),
        alignSelf: 'center'
    },
    gradientBorder: {
        padding: 1,
        borderRadius: Border.br_3xs,
    },
    inputContainer: {
        flexDirection: 'row',
        height: Math.min(56, Math.max(44, height * 0.06)),
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
    whatsYourEmail: {
        fontSize: FontSize.headerBold_size,
        color: Color.colorWhite,
        fontFamily: FontFamily.headerBold,
        fontWeight: "700",
        marginVertical: 16
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
        height: 40,
        marginTop: 32,
        borderRadius: Border.br_3xs,
        overflow: "hidden"
    },
    buttonDisabled: { opacity: 0.4 },
    haveAnAccount: {
        fontFamily: FontFamily.textRegular
    },
    logIn: {
        color: 'white',
        fontWeight: 'bold',
    },
    haveAnAccountContainer: {
        textAlign: 'center',
        color: 'white',
        marginTop: 20,
    },
    or: {
        textAlign: 'center',
        marginVertical: 20,
        color: 'white',
    },
    frameParent: {
        width: '100%',
        marginTop: 36,
    },
    socialButton: {
        borderWidth: 1,
        borderColor: Color.colorSilver,
        borderRadius: Border.br_3xs,
        backgroundColor: '#313131',
        height: 48,
        paddingHorizontal: 16,
        marginVertical: 8,
        justifyContent: 'center'
    },
    socialButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8
    },
    socialIconImg: {
        width: 20,
        height: 20,
    },
    socialButtonText: {
        color: 'white',
        fontWeight: '400',
    },
    errorText: {
        color: 'red',
        marginTop: 5,
        marginLeft: 5,
        fontSize: FontSize.header3SemiBold_size,
    },
    termsText: {
        fontSize: 10,
        color: '#888',
        textAlign: 'center',
        marginHorizontal: 0,
        marginTop: 10,
    },
    link: {
        fontSize: 10,
        textDecorationLine: 'underline',
        color: '#888',
    },
    contentContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
        paddingTop: 20,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 12,
    },
    sheetText: {
        fontSize: 14,
        color: '#888',
        textAlign: 'left',
        lineHeight: 20,
        minHeight: 200,
    },
    bottomSheetBackground: {
        backgroundColor: '#121212',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    handleStyle: {
        backgroundColor: '#121212',
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        paddingVertical: 10,
    },
    handleIndicatorStyle: {
        width: 40,
        height: 5,
        backgroundColor: '#ccc',
        borderRadius: 2.5,
        marginTop: 10,
    },
    errorContainer: {
        marginTop: 8,
    },
    loginLink: {
        marginTop: 8,
    },
    loginLinkText: {
        color: '#5468FF',
        fontSize: 14,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
});
