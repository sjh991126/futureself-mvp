import * as React from "react";
import { StyleSheet, View, Text, TextInput, Animated, ActivityIndicator, TouchableOpacity, SafeAreaView, Dimensions, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import { Border, FontFamily, FontSize, Color, Padding } from "./authStyles";
import { checkUsernameExists } from '../src/api/user';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function SetUsername() {
    const [username, setUsername] = React.useState('');
    const [isFocused, setIsFocused] = React.useState(false);
    const [fadeAnim] = React.useState(new Animated.Value(1));
    const [errorMessage, setErrorMessage] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);

    const usernameFormatText = "Username must be at least 3 characters, with no spaces and special characters";

    const handleConfirm = async () => {
        setIsLoading(true);

        const usernameRegex = /^[a-zA-Z0-9_]{3,}$/;

        if (!usernameRegex.test(username)) {
            setErrorMessage(usernameFormatText);
            setIsLoading(false);
            return;
        }

        try {
            const isUsernameExists = await checkUsernameExists(username);
            if (!isUsernameExists) {
                router.push({
                    //temporary change to onboarding screen
                    // pathname: '/onboard_gender',
                    pathname: '/setpassword',
                    params: {
                        from: 'setusername',
                        username: username,
                    }
                })
            } else {
                setErrorMessage('Username already exists.');
            }
        } catch (error) {
            console.error('Error checking username:', error);
            setErrorMessage('An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior="padding"
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <SafeAreaView style={styles.container}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={26} color="white" />
                    </TouchableOpacity>
                    <View style={styles.contentContainer} pointerEvents={isLoading ? 'none' : 'auto'}>
                        <View style={styles.frameParent}>
                            <View>
                                <Text style={styles.title}>Enter your username</Text>
                                <View style={{ marginVertical: 4 }}>
                                    <LinearGradient
                                        colors={isFocused ? ['#5468FF', '#81D8D0'] : [Color.colorSilver, Color.colorSilver]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.gradientBorder}
                                    >
                                        <View style={styles.inputContainer}>
                                            <TextInput
                                                style={styles.input}
                                                value={username}
                                                onChangeText={(text) => setUsername(text.toLowerCase())}
                                                placeholder="Username"
                                                placeholderTextColor={'#ABB7C2'}
                                                onFocus={() => setIsFocused(true)}
                                                onBlur={() => setIsFocused(false)}
                                                autoCapitalize="none"
                                            />
                                        </View>
                                    </LinearGradient>
                                    <Text style={styles.infoText}>Must be at least 4 characters long</Text>
                                    {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
                                </View>
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity onPress={handleConfirm} style={[styles.buttonLayout]}>
                        <LinearGradient
                            style={{ flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: Border.br_3xs }}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            colors={username ? ['#5468FF', '#81D8D0'] : ['#d3d3d3', '#d3d3d3']}
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
};

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
    infoText: {
        fontStyle: 'italic',
        fontSize: 12,
        color: '#fff',
        marginTop: 10,
        marginLeft: 5,
    },
    errorText: {
        color: 'red',
        marginTop: 5,
        marginLeft: 5,
        fontSize: FontSize.header3SemiBold_size,
    },
});
