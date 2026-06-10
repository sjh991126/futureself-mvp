import React, { useState } from 'react';
import { StyleSheet, View, Image, Text, Pressable, TouchableOpacity, TextInput, Animated, SafeAreaView, ActivityIndicator, Dimensions, Keyboard, TouchableWithoutFeedback, Alert } from "react-native";
import { router, Link, useRouter } from 'expo-router';
import { Color, FontFamily, FontSize, Border, Padding } from "./authStyles";
import { LinearGradient } from 'expo-linear-gradient';
import { loginUser } from '../src/api/login';
import AppleLogo from "../../assets/icons/apple_logo.jsx";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { fetchTerms } from "../src/api/fetchterms";
import DeviceSelectionModal from "../../assets/components/DeviceSelectionModal";
import { useAppleAuth } from '../src/hooks/useAppleAuth';
import { useGoogleAuth } from '../src/hooks/useGoogleAuth';
import { useSingleFlightAction } from '../src/hooks/useSingleFlightAction';
const { width, height } = Dimensions.get('window');

const login = () => {
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const [fadeAnim] = React.useState(new Animated.Value(1));
    const [isUsernameFocused, setIsUsernameFocused] = React.useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [errorMessage, setErrorMessage] = React.useState('');
    const passwordInputRef = React.useRef(null);
    const [activeSheet, setActiveSheet] = React.useState(null);
    const bottomSheetRef = React.useRef(null);
    const [content, setContent] = React.useState('');
    const [contentHeight, setContentHeight] = React.useState(0);
    const scrollRef = React.useRef(null);
    const { signInWithApple, completeDeviceSelection, isAppleLoading, error } = useAppleAuth();
    const { signInWithGoogle, completeDeviceSelection: completeGoogleDeviceSelection, isGoogleLoading } = useGoogleAuth();
    const [loginMethod, setLoginMethod] = useState(null); // 'apple' 또는 'google'

    const [showDeviceSelection, setShowDeviceSelection] = useState(false);
    const [deviceSelectionData, setDeviceSelectionData] = useState(null);
    const router = useRouter();
    const { run: runCredentialLogin, isRunning: isCredentialLoginRunning } = useSingleFlightAction('auth:credential-login');
    const { run: runGoogleLogin, isRunning: isGoogleLoginRunning } = useSingleFlightAction('auth:google-login');
    const { run: runAppleLogin, isRunning: isAppleLoginRunning } = useSingleFlightAction('auth:apple-login');
    const bottomSheetSnapPoints = React.useMemo(() => {
        if (height < 700) {
            return ['45%', '62%'];
        }

        if (height < 850) {
            return ['42%', '58%'];
        }

        return ['38%', '52%'];
    }, []);

    const handleContentLayout = (event) => {
        const { height } = event.nativeEvent.layout;
        setContentHeight(height);
    };

    const renderBackdrop = React.useCallback(
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

    const openBottomSheet = (sheetType) => {
        setActiveSheet(sheetType);
        bottomSheetRef.current?.expand();
    };

    React.useEffect(() => {
        if (activeSheet && scrollRef.current) {
            scrollRef.current.scrollTo({ y: 0, animated: false });
        }
    }, [activeSheet]);

    React.useEffect(() => {
        const fetchAndSetContent = async () => {
            let tncNumber = '';
            switch (activeSheet) {
                case 'terms':
                    tncNumber = '1';
                    break;
                case 'ai-tools':
                    tncNumber = '2';
                    break;
                case 'privacy':
                    tncNumber = '3';
                    break;
                default:
                    return;
            }

            if (tncNumber) {
                try {
                    const fetchedContent = await fetchTerms(tncNumber);
                    setContent(fetchedContent); // Set content after fetching
                } catch (error) {
                    console.error('Failed to fetch content', error);
                }
            }
        };

        if (activeSheet) {
            fetchAndSetContent();
        }
    }, [activeSheet]);

    const renderContent = () => {
        return (
            <BottomSheetScrollView
                ref={scrollRef}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                scrollEnabled={true}
                nestedScrollEnabled={true}
                bounces={false}
            >
                <View onLayout={handleContentLayout}>
                    <Text style={styles.sheetTitle}>
                        {activeSheet === 'terms' ? 'General Terms of Use' :
                            activeSheet === 'ai-tools' ? 'Terms and Conditions of Trippy AI Tools' :
                                activeSheet === 'privacy' ? 'Trippy Privacy Policy' : ''}
                    </Text>
                    <Text style={styles.sheetText}>{content || "Loading..."}</Text>
                </View>
            </BottomSheetScrollView>
        );
    };

    const handleSheetChanges = (index) => {
        if (index === -1) {
            // bottomSheetRef.current?.close();
            setActiveSheet(null);
        }
    };

    const handleloginUser = async () => {
        await runCredentialLogin(async () => {
            setIsLoading(true);
            setErrorMessage('');

            try {
                const user = {
                    'userName': username,
                    'password': password,
                };
                const result = await loginUser(user, router);

                if (result.deviceSelection?.needsDeviceSelection) {
                    setDeviceSelectionData(result.deviceSelection);
                    setShowDeviceSelection(true);
                } else {
                    // 일반 로그인 성공 처리
                    router.push('/homepage');
                }
            } catch (error) {
                console.error('Error logging in:', error);
                if (error.response && error.response.status === 401) {
                    setErrorMessage('Your username or password is incorrect.');
                } else if (error.response?.data?.message) {
                    setErrorMessage(error.response.data.message);
                } else {
                    setErrorMessage('An error occurred. Please try again.');
                }
            } finally {
                setIsLoading(false);
            }
        });
    };

    const handleGoogleSignIn = async () => {
        await runGoogleLogin(async () => {
            try {
                const result = await signInWithGoogle();

                if (result.canceled) return;

                // 신규 사용자 - setprofile로 이동
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

                // 기기 선택 필요
                if (result.deviceSelection?.needsDeviceSelection) {
                    setLoginMethod('google');
                    setDeviceSelectionData(result.deviceSelection);
                    setShowDeviceSelection(true);
                    return;
                }

                // 로그인 성공
                if (result.loginSuccess) {
                    router.push('/homepage');
                    return;
                }
            } catch (error) {
                Alert.alert('Login Error', error.message || 'An error occurred during Google login.');
            }
        });
    };

    const handleAppleSignIn = async () => {
        await runAppleLogin(async () => {
            try {
                const result = await signInWithApple();

                // 사용자 취소
                if (result.canceled) {
                    return;
                }

                // 신규 사용자
                if (result.isNewUser) {
                    router.push({
                        pathname: '/setprofile',
                        params: {
                            appleId: result.appleData.appleId,
                            email: result.appleData.email,
                            appleEmail: result.appleData.email,
                            fullName: result.appleData.name,
                            identityToken: result.appleData.identityToken,
                            user: result.appleData.user,
                            loginMethod: 'apple',
                        }
                    });
                    return;
                }

                // 기기 선택 필요
                if (result.needsDeviceSelection) {
                    setLoginMethod('apple');
                    setDeviceSelectionData(result.deviceSelection);
                    setShowDeviceSelection(true);
                    return;
                }

                // 로그인 성공
                if (result.loginSuccess) {
                    router.push('/homepage');
                    return;
                }

            } catch (error) {
                Alert.alert('로그인 오류', error.getUserMessage());
            }
        });
    };

    /**
     * 기기 선택 완료 핸들러
     */
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
        } catch (error) {
            Alert.alert('Error in device selection', error.message);
        }
    };

    /**
     * 기기 선택 취소 핸들러
     */
    const handleDeviceSelectionCancel = () => {
        setShowDeviceSelection(false);
        setDeviceSelectionData(null);
        setLoginMethod(null);
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} disabled={!!activeSheet}>
            <SafeAreaView style={styles.container}>
                <Image style={styles.logo} resizeMode="contain" source={require("../../assets/logo_black.png")} />
                <View style={[styles.loginContainer]}>
                    <Text style={styles.title}>Login</Text>
                    <View style={{ marginVertical: 8 }}>
                        <LinearGradient
                            colors={isUsernameFocused ? ['#5468FF', '#81D8D0'] : [Color.colorSilver, Color.colorSilver]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.gradientBorder}
                        >
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Username"
                                    value={username}
                                    onChangeText={setUsername}
                                    placeholderTextColor={'#ABB7C2'}
                                    onFocus={() => setIsUsernameFocused(true)}
                                    onBlur={() => setIsUsernameFocused(false)}
                                    returnKeyType="next"
                                    autoCapitalize="none"
                                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                                />
                            </View>
                        </LinearGradient>
                    </View>
                    <View style={{ marginVertical: 8 }}>
                        <LinearGradient
                            colors={isPasswordFocused ? ['#5468FF', '#81D8D0'] : [Color.colorSilver, Color.colorSilver]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.gradientBorder}
                        >
                            <View style={styles.inputContainer}>
                                <TextInput
                                    ref={passwordInputRef}
                                    style={styles.input}
                                    placeholder="Password"
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholderTextColor={'#ABB7C2'}
                                    secureTextEntry={!showPassword}
                                    onFocus={() => setIsPasswordFocused(true)}
                                    onBlur={() => setIsPasswordFocused(false)}
                                />
                                <View style={styles.iconContainer}>
                                    <Pressable onPress={() => setShowPassword(!showPassword)}>
                                        <Ionicons name={showPassword ? "eye" : "eye-off"} size={24} color="#fff" />
                                    </Pressable>
                                </View>
                            </View>
                        </LinearGradient>
                        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
                    </View>
                    <TouchableOpacity
                        onPress={() => router.push('/forgotpassword')}
                        style={{ alignSelf: 'flex-end' }}
                    >
                        <Text style={styles.forgotPassword}>I forgot my password</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleloginUser}
                        style={styles.loginButton}
                        disabled={!username || !password || isLoading || isCredentialLoginRunning}
                    >
                        {username && password ? (
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
                                {isLoading ? (
                                    <ActivityIndicator size="small" color={Color.colorBlack} />
                                ) : (
                                    <Animated.Text style={[styles.loginButtonText, styles.logInTypo, { opacity: fadeAnim }]}>LOG IN</Animated.Text>
                                )}
                            </LinearGradient>
                        ) : (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <Text style={[styles.logIn, styles.logInTypo]}>LOG IN</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <Text style={styles.registerText}>
                        Don't have an account? <Link style={styles.registerLink} href='/EmailVerify'>Register</Link>
                    </Text>

                    <Text style={styles.orText}>or</Text>
                    <TouchableOpacity
                        style={styles.socialButton}
                        onPress={handleGoogleSignIn}
                        disabled={isGoogleLoading || isGoogleLoginRunning}
                    >
                        <View style={styles.socialButtonContent}>
                            <Image source={require('../../assets/Google.png')} style={styles.socialIcon} />
                            <Text style={styles.socialButtonText}>Continue with Google</Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.socialButton}
                        onPress={handleAppleSignIn}
                        disabled={isAppleLoading || isAppleLoginRunning}
                    >
                        <View style={styles.socialButtonContent}>
                            <AppleLogo style={styles.socialIcon} />
                            <Text style={styles.socialButtonText}>Continue with Apple</Text>
                        </View>
                    </TouchableOpacity>
                </View>
                <View style={{ marginTop: 20 }}>
                    <Text style={styles.termsText}>
                        By signing up or logging in, you acknowledge and agree to Trippy's{' '}
                        <TouchableOpacity onPress={() => openBottomSheet('terms')}>
                            <Text style={styles.link}>General Terms of Use</Text>
                        </TouchableOpacity>,{' '}
                        <TouchableOpacity onPress={() => openBottomSheet('ai-tools')}>
                            <Text style={styles.link}>Terms and Conditions of Trippy AI Tools</Text>
                        </TouchableOpacity> and{' '}
                        <TouchableOpacity onPress={() => openBottomSheet('privacy')}>
                            <Text style={styles.link}>Trippy Privacy Policy</Text>
                        </TouchableOpacity>.
                    </Text>

                </View>
                <BottomSheet
                    ref={bottomSheetRef}
                    snapPoints={bottomSheetSnapPoints}
                    index={-1}
                    enablePanDownToClose={true}
                    enableContentPanningGesture={true}
                    backdropComponent={renderBackdrop}
                    backgroundStyle={styles.bottomSheetBackground}
                    handleStyle={styles.handleStyle}
                    handleIndicatorStyle={styles.handleIndicatorStyle}
                    enableDynamicSizing={false}
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
        </TouchableWithoutFeedback>
    );
};

export default login;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
    },
    logo: {
        width: width * 0.5,
        alignSelf: 'center',
    },
    loginContainer: {
        alignSelf: 'center',
        width: '95%',
    },
    title: {
        fontSize: FontSize.headerBold_size,
        color: Color.colorWhite,
        fontFamily: FontFamily.headerBold,
        fontWeight: "700",
        marginVertical: 16
    },
    input: {
        flex: 1,
        color: Color.colorWhite,
        paddingLeft: 30,
    },
    passwordParentLayout: {
        flexDirection: 'row',
        height: height * 0.06,
        borderWidth: 1,
        borderColor: Color.colorSilver,
        borderStyle: "solid",
        borderRadius: Border.br_3xs,
        backgroundColor: '#313131',
        alignItems: 'center',
        marginVertical: 8,
        paddingRight: 10,
    },
    gradientBorder: {
        padding: 1,
        borderRadius: Border.br_3xs,
    },
    inputContainer: {
        flexDirection: 'row',
        height: height * 0.06,
        borderRadius: Border.br_3xs,
        backgroundColor: '#313131',
        alignItems: 'center',
        paddingRight: 10,
    },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        height: 24,
        paddingRight: 10,
        paddingLeft: 10
    },
    forgotPassword: {
        textAlign: 'right',
        color: 'gray',
        marginTop: 4,
    },
    logIn: {
        color: Color.colorBlack,
        position: "absolute"
    },
    logInTypo: {
        fontFamily: FontFamily.header3SemiBold,
        fontWeight: "600",
        fontSize: FontSize.header3SemiBold_size,
        textAlign: "left"
    },
    loginButton: {
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
    loginButtonText: {
        color: 'black',
        fontWeight: 'bold',
    },
    registerText: {
        textAlign: 'center',
        color: 'white',
        marginTop: 20,
    },
    registerLink: {
        color: 'white',
        fontWeight: 'bold',
    },
    orText: {
        textAlign: 'center',
        marginVertical: 20,
        color: 'white',
    },
    socialButton: {
        borderWidth: 1,
        borderColor: Color.colorSilver,
        borderStyle: "solid",
        borderRadius: Border.br_3xs,
        backgroundColor: '#313131',
        paddingVertical: 10,
        paddingHorizontal: 15,
        marginVertical: 8,
    },
    socialButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    socialIcon: {
        width: 24,
        height: 24,
        marginRight: 8,
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
        marginHorizontal: 20,
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
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingBottom: 40,
        paddingTop: 20,
        width: width - 32,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
    },
    sheetText: {
        fontSize: 14,
        color: '#888',
        textAlign: 'left',
        lineHeight: 20,
    },
    bottomSheetBackground: {
        backgroundColor: '#121212',
    },
    handleStyle: {
        backgroundColor: '#121212',
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
    },
    handleIndicatorStyle: {
        width: 40,
        height: 5,
        backgroundColor: '#ccc',
        borderRadius: 2.5,
        marginTop: 10,
    },
})
