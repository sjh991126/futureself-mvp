import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Dimensions, TextInput, Modal, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, Alert } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { Color, FontFamily, FontSize, Border, Padding } from "./authStyles";
import { Link, router, useLocalSearchParams } from 'expo-router';
import { signupUser } from '../src/api/signUp';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { UPLOAD_TYPES, uploadImageToS3 } from '../src/api/image';
import { loginUser } from '../src/api/login';
import LoadingSpinner from './../LoadingSpinner';
import { TokenManager } from './../src/config';
import ConfirmationModal from './../../assets/components/ConfirmationModal'
import { useDispatch } from 'react-redux';
import { checkUsernameExists } from '../src/api/user';
import { appleSignIn } from '../src/api/appleSignIn';
import { GoogleAuthManager } from '../src/api/googleSignIn';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useSingleFlightAction } from '../src/hooks/useSingleFlightAction';

const { width, height } = Dimensions.get('window');
const scale = Math.min(width, height) / 375;
const responsiveSize = (size) => Math.round(size * scale);
const SOCIAL_EMAIL_EXISTS_MESSAGE = '이미 이메일 가입된 계정입니다. 이메일 로그인 또는 계정 연결이 필요합니다.';

const setprofile = () => {
    const dispatch = useDispatch();
    const params = useLocalSearchParams();
    const { username, password, appleEmail, appleId, googleEmail, googleId, fullName, identityToken, idToken, user, imageUrl: paramImageUrl, loginMethod } = params;
    const [name, setName] = useState('');
    const [userName, setUserName] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [email, setEmail] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [alertVisible, setAlertVisible] = useState(false);
    const [showUsername, setShowUsername] = useState(false);
    const [errorMessage, setErrorMessage] = React.useState('');
    const { run: runRegister, isRunning: isRegistering } = useSingleFlightAction('auth:setprofile-register');
    const usernameFormatText = "Username must be at least 3 characters, with no spaces and special characters";

    // At least one letter, one number, and 5-13 characters long
    const usernameRegex = /^[a-zA-Z0-9_]{3,}$/;

    useEffect(() => {
        const getEmail = async () => {
            try {
                const storedEmail = await AsyncStorage.getItem('email');

                if (storedEmail) {
                    setEmail(storedEmail);
                } else {
                    setShowUsername(true);
                    if (fullName) {
                        setName(fullName);
                    }
                }
            } catch (error) {
                console.error('Failed to retrieve email from user data:', error);
            }
        };
        getEmail();
    }, []);

    const isSocialSignup = loginMethod === 'apple' || loginMethod === 'google';

    const isEmailAlreadyExistsError = (error) => {
        const status = error?.response?.status;
        const rawMessage = String(
            error?.response?.data?.message ||
            error?.response?.data?.error ||
            ''
        ).toLowerCase();

        return (
            status === 409 &&
            (rawMessage.includes('email') || rawMessage.includes('e-mail')) &&
            (rawMessage.includes('already') || rawMessage.includes('exist') || rawMessage.includes('duplicate'))
        );
    };



    const handleImagePicker = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
                preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Automatic,
            });

            if (!result.canceled && result.assets.length > 0) {
                const resizedImage = await ImageManipulator.manipulateAsync(
                    result.assets[0].uri,
                    [{ resize: { width: 800 } }],
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                );
                setSelectedImage(resizedImage.uri);
                console.log('Resized image URI:', resizedImage.uri);
            }
        } catch (error) {
            console.error('Image picker error:', error);
            Alert.alert(
                'Unable to open this photo',
                'This image may still be in iCloud or not available locally on your iPhone. Please open it in Photos first so it downloads, then try again.'
            );
        }
    };

    const handleSave = async () => {
        await runRegister(async () => {
            if (!name) {
                setAlertVisible(true);
                return;
            }

            setIsLoading(true);
            setErrorMessage('');

            try {
                let imageUrl = '';
                if (selectedImage) {
                    console.log('Uploading image...');
                    imageUrl = await uploadImageToS3(selectedImage, UPLOAD_TYPES.PROFILE);
                    console.log('Image uploaded successfully, URL:', imageUrl);
                } else if (paramImageUrl) {
                    imageUrl = paramImageUrl;
                }

                if (!showUsername && !loginMethod) {
                    const newUser = {
                        email: email,
                        password: password,
                        userName: username,
                        name: name,
                        imageUrl: imageUrl,
                        role: 'USER'
                    };

                    console.log('Sending user data:', newUser);
                    const userResponse = await signupUser(newUser);
                    console.log('User registration response:', userResponse);

                    if (userResponse) {
                        // Automatically log in the user after successful registration
                        await handleloginUser();
                    }
                } else {
                    if (!usernameRegex.test(userName)) {
                        setErrorMessage(usernameFormatText);
                        return;
                    }

                    const isUsernameExists = await checkUsernameExists(userName);
                    if (!isUsernameExists) {
                        const newUser = {
                            // Apple인 경우
                            ...(loginMethod === 'apple' && {
                                appleId: appleId,
                                email: appleEmail,

                            }),
                            // Google인 경우
                            ...(loginMethod === 'google' && {
                                googleId: googleId,
                                email: googleEmail,
                            }),
                            imageUrl: imageUrl || null,
                            userName: userName,
                            name: name,
                            role: 'USER'
                        };

                        const userResponse = await signupUser(newUser);


                        if (userResponse) {
                            // Apple 로그인
                            if (loginMethod === 'apple') {
                                const response = await appleSignIn(identityToken, user, appleEmail, fullName);
                                await TokenManager.storeTokens(response.accessToken, response.refreshToken);
                                if (response.user) {
                                    await TokenManager.storeUserData(response.user);
                                }
                            }
                            // Google 로그인
                            else if (loginMethod === 'google') {
                                console.log('🔵 Completing Google sign-in...');
                                console.log('🔵 Raw params:', {
                                    idToken: idToken ? 'exists' : 'missing',
                                    googleId,
                                    googleEmail,
                                    fullName,
                                    imageUrl: paramImageUrl
                                });

                                if (!idToken) {
                                    throw new Error('Google ID token이 없습니다. 다시 로그인해주세요.');
                                }

                                // 🔥 순수 String 값만 전달 (객체 제거)
                                const googleUserInfo = {
                                    idToken: String(idToken),
                                    email: String(googleEmail || ''),
                                    name: String(fullName || ''),
                                    picture: String(paramImageUrl || imageUrl || ''),
                                };

                                console.log('🔵 Cleaned user info for backend:', googleUserInfo);
                                console.log('🔵 Type check:', {
                                    idToken: typeof googleUserInfo.idToken,
                                    email: typeof googleUserInfo.email,
                                    name: typeof googleUserInfo.name,
                                    picture: typeof googleUserInfo.picture,
                                });

                                const result = await GoogleAuthManager.completeGoogleSignup(idToken);
                                console.log('Google login complete:', result);

                                if (result.loginSuccess) {
                                    router.push({
                                        pathname: '/homepage',
                                        params: { justRegistered: true }
                                    });
                                } else {
                                    throw new Error('로그인 완료 실패');
                                }
                            }
                        }
                    } else {
                        setErrorMessage('Username already exists.');
                    }
                }
            } catch (error) {
                console.error('Error signing up the user:', error.response?.data || error.message);
                if (isSocialSignup && isEmailAlreadyExistsError(error)) {
                    setErrorMessage(SOCIAL_EMAIL_EXISTS_MESSAGE);
                } else {
                    setErrorMessage('An unexpected error occurred. Please try again.');
                }
            } finally {
                setIsLoading(false);
            }
        });
    };

    const handleloginUser = async () => {

        try {
            const user = {
                'userName': username,
                'password': password,
            };
            const { userData } = await loginUser(user);
            console.log('User logged in:', userData);
            if (userData) {
                router.push({
                    pathname: '/homepage',
                    params: { justRegistered: true }
                });
            }
        } catch (error) {
            console.error('Error finding user:', error);
            setErrorMessage('Registration failed. Please try again.');

        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior="padding">
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <SafeAreaView style={styles.container} pointerEvents={isLoading ? 'none' : 'auto'}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                            <Ionicons name="chevron-back" size={26} color="white" />
                        </TouchableOpacity>
                        <View style={styles.headerTitleWrap}>
                            <Text style={styles.headerTitle}>Profile Setting</Text>
                        </View>
                        <View style={styles.headerRightSpacer} />
                    </View>

                    <View style={styles.profileImageContainer}>
                        <TouchableOpacity onPress={handleImagePicker}>
                            <View style={styles.profileImagePlaceholder}>
                                {selectedImage ? (
                                    <Image source={{ uri: selectedImage }} style={styles.profileImage} />
                                ) : (
                                    <Ionicons name="camera" size={responsiveSize(40)} color="#888" />
                                )}
                            </View>
                        </TouchableOpacity>
                        <Text onPress={handleImagePicker} style={styles.editCoverText}>Edit Cover</Text>
                    </View>

                    <View style={styles.infoContainer}>
                        <InfoItem
                            label="Name"
                            value={name}
                            onChangeText={setName}
                            placeholder="Enter your name"
                            inputStyle={styles.input}
                        />
                        {showUsername && (
                            <InfoItem
                                label="Username"
                                value={username}
                                onChangeText={setUserName}
                                placeholder="Enter your username"
                                inputStyle={styles.input}
                            />
                        )}
                    </View>
                    {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

                    <TouchableOpacity
                        onPress={handleSave}
                        style={[styles.saveButton, (isLoading || isRegistering) && { opacity: 0.6 }]}
                        disabled={isLoading || isRegistering}
                    >
                        <LinearGradient
                            style={{ flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 10 }}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            colors={name ? ['#5468FF', '#81D8D0'] : ['#d3d3d3', '#d3d3d3']}
                            locations={[0, 1]}
                            useAngle={true}
                            angle={45}
                            angleCenter={{ x: 0.5, y: 0.5 }}
                        >
                            <Text style={styles.saveButtonText}>{(isLoading || isRegistering) ? 'REGISTERING...' : 'REGISTER'}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    {isLoading && (
                        <View style={styles.loadingOverlay}>
                            <LoadingSpinner />
                        </View>
                    )}
                    <ConfirmationModal
                        visible={alertVisible}
                        title="Your name is empty"
                        message="Please enter your name."
                        onConfirm={() => setAlertVisible(false)}
                        confirmText="OK"
                        cancelText=''
                    />
                </SafeAreaView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
};

const InfoItem = ({ label, value, onChangeText, placeholder, editable = true, inputStyle }) => (
    <View style={styles.infoItem}>
        <Text style={styles.infoLabel}>{label}</Text>
        <TextInput
            style={[styles.infoInput, inputStyle]}
            value={value}
            onChangeText={(text) => {
                if (label === "Username") {
                    onChangeText(text.toLowerCase());
                } else {
                    onChangeText(text);
                }
            }} placeholder={placeholder}
            autoCapitalize="none"
            placeholderTextColor="#888"
            editable={editable}
        />
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    backButton: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerRow: {
        width: '95%',
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 8,
        alignSelf: 'center',
    },
    headerTitleWrap: {
        flex: 1,
        alignItems: 'center',
    },
    header: {
        // flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 10
    },
    headerTitle: {
        color: 'white',
        fontSize: responsiveSize(18),
        fontWeight: 'bold',
        textAlign: 'center',
    },
    headerRightSpacer: {
        width: 32,
        height: 32,
    },
    headerRight: {
        width: responsiveSize(40),
    },
    profileImageContainer: {
        alignItems: 'center',
        marginVertical: responsiveSize(30),
    },
    profileImage: {
        width: responsiveSize(130),
        height: responsiveSize(130),
        borderRadius: responsiveSize(65),
    },

    profileImagePlaceholder: {
        width: responsiveSize(130),
        height: responsiveSize(130),
        borderRadius: responsiveSize(65),
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ABB7C2',
        overflow: 'hidden',
    },
    editCoverText: {
        color: '#81D8D0',
        marginTop: responsiveSize(15),
        fontSize: 14,
        fontWeight: 600,
        alignSelf: 'center'
    },
    infoContainer: {
        marginVertical: responsiveSize(10),
        borderTopWidth: 0.5,
        borderTopColor: '#333',
    },
    input: {
        flex: 1,
        color: Color.colorWhite,
        paddingLeft: 30,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: responsiveSize(16),
        paddingHorizontal: responsiveSize(16),
        borderBottomWidth: 0.5,
        borderBottomColor: '#333',
    },
    infoLabel: {
        color: 'white',
        fontSize: responsiveSize(16),
        width: responsiveSize(100), // Fixed width for alignment
    },
    infoInput: {
        flex: 1,
        color: '#888',
        fontSize: responsiveSize(16),
        marginLeft: responsiveSize(8),
    },
    accountTypeButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    accountTypeText: {
        color: Color.colorWhite,
        fontSize: responsiveSize(16),
        marginRight: responsiveSize(8),
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#222',
        borderRadius: responsiveSize(10),
        padding: responsiveSize(10),
        width: '50%',
    },
    modalOption: {
        paddingVertical: responsiveSize(15),
    },
    modalOptionLine: {
        borderBottomWidth: 2,
        borderBottomColor: '#333',
    },
    modalOptionText: {
        color: 'white',
        fontSize: responsiveSize(16),
        textAlign: 'center',
    },
    saveButton: {
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
        borderRadius: 10,
        overflow: "hidden",
        position: 'absolute',
        bottom: 50,
        width: '90%',
        alignSelf: 'center',
    },
    saveButtonText: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: responsiveSize(12),
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
    infoText: {
        color: 'gray',
        marginLeft: 5,
        fontSize: FontSize.header3SemiBold_size,
    },
    errorText: {
        color: 'red',
        marginTop: 5,
        marginLeft: 5,
        fontSize: FontSize.header3SemiBold_size,
    },
});

export default setprofile;
