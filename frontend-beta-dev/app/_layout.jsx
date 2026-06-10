import * as React from 'react';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import store from './store';
import AppStateHandler from './src/AppStateHandler';
import { AiJobProvider } from './src/state/aiJobStore';
import AiJobToast from './src/components/AiJobToast';
import AiResultBridge from './src/components/AiResultBridge';
import NotificationsBridge from './src/components/NotificationsBridge';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from '@env';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

console.log = () => {};
console.warn = () => {};
console.error = () => {};

// Custom animation configuration based on screen type
const getAnimationForRoute = (route) => {
    // Instant navigation for main tabs
    const instantRoutes = [
        '/homepage',
        '/list',
        '/community_home',
        '/profile'
    ];

    // Fade animation for modal/setting screens
    const fadeRoutes = [
        '/modeselect',
        '/aifilter',
        '/locationfilter',
        '/triplist',
        '/createtriplist',
        '/manualselection',
        '/add_place',
        '/payment',
        '/login',
        '/EmailVerify',
        '/otp',
        '/setusername',
        '/setpassword',
        '/setprofile',
        '/forgotpassword',
        '/onboard_gender',
        '/onboard_age',
        '/onboard_groups',
        '/onboard_foods',
        '/onboard_country',
        '/onboard_passions',
        '/onboard_terms',
        '/editprofile',
        '/photopicker',
        '/guide',
    ];

    if (instantRoutes.includes(route)) {
        return 'none';
    }

    if (fadeRoutes.includes(route)) {
        return 'fade';
    }

    // Default to slide from right for detail pages
    return 'slide_from_right';
};

const RootLayout = () => {
    // Google Sign-In 초기화
    useEffect(() => {
        try {

            console.log('🟣 Configuring Google Sign-In...');
            console.log('🟣 GOOGLE_WEB_CLIENT_ID:', GOOGLE_WEB_CLIENT_ID ? 'exists' : 'missing');
            console.log('🟣 GOOGLE_IOS_CLIENT_ID:', GOOGLE_IOS_CLIENT_ID ? 'exists' : 'missing');

            // 환경 변수 검증
            if (!GOOGLE_WEB_CLIENT_ID || GOOGLE_WEB_CLIENT_ID.includes('YOUR_')) {
                console.warn('Google Web Client ID is not configured');
                return;
            }

            GoogleSignin.configure({
                webClientId: GOOGLE_WEB_CLIENT_ID,
                iosClientId: GOOGLE_IOS_CLIENT_ID,
                offlineAccess: true,
                forceCodeForRefreshToken: true,
            });

            console.log('Google Sign-In configured successfully');
        } catch (error) {
            console.error('Failed to configure Google Sign-In:', error);
        }
    }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <StatusBar style="light" />
                <Provider store={store}>
                    <AppStateHandler>
                        <AiJobProvider>
                        <AiResultBridge />
                        <NotificationsBridge />
                        <Stack
                            screenOptions={({ route }) => ({
                                headerShown: false,
                                animation: getAnimationForRoute(route.name),
                                animationDuration: 200,
                                contentStyle: { backgroundColor: 'black' },
                                gestureEnabled: true,
                                gestureDirection: 'horizontal',
                                presentation: 'card',
                                animationTypeForReplace: 'push',
                            })}
                        >
                            <Stack.Screen
                                name="index"
                                options={{
                                    contentStyle: { backgroundColor: 'black' },
                                    safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
                                    animation: 'fade',
                                }}
                            />
                            <Stack.Screen
                                name="(community)"
                                options={{
                                    contentStyle: { backgroundColor: 'black' },
                                    safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
                                    animation: 'none',
                                    animationDuration: 0,
                                    gestureEnabled: false
                                }}
                            />
                            <Stack.Screen
                                name="(home)"
                                options={{
                                    animation: 'none',
                                    animationDuration: 0,
                                    gestureEnabled: false
                                }}
                            />
                            <Stack.Screen name="(plan)" />
                            <Stack.Screen
                                name="(premium)"
                                options={{
                                    animation: 'slide_from_right'
                                }}
                            />
                            <Stack.Screen name="(auth)" />
                            <Stack.Screen
                                name="(library)"
                                options={{
                                    animation: 'none',
                                    animationDuration: 0,
                                    gestureEnabled: false
                                }}
                            />
                            <Stack.Screen
                                name="(profile)"
                                options={{
                                    animation: 'none',
                                    animationDuration: 0,
                                    gestureEnabled: false
                                }}
                            />
                            <Stack.Screen
                                name="(aichat)"
                                options={{
                                    animation: 'slide_from_right'
                                }}
                            />
                        </Stack>
                        <AiJobToast />
                        </AiJobProvider>
                    </AppStateHandler>
                </Provider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}

export default RootLayout;
