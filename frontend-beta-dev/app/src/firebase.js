import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { YOUR_API_KEY, YOUR_AUTH_DOMAIN, YOUR_PROJECT_ID, YOUR_STORAGE_BUCKET, YOUR_MESSAGING_SENDER_ID, YOUR_APP_ID } from '@env';
import { API_BASE_URL, TokenManager } from './config';
import { Platform } from 'react-native';

let app;
let auth;
let db;
let lastSentToken = null;

const firebaseConfig = {
    apiKey: YOUR_API_KEY,
    authDomain: YOUR_AUTH_DOMAIN,
    projectId: YOUR_PROJECT_ID,
    storageBucket: YOUR_STORAGE_BUCKET,
    messagingSenderId: YOUR_MESSAGING_SENDER_ID,
    appId: YOUR_APP_ID,
};

// 유효성 검사
function validateFirebaseConfig() {
    const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'];
    for (const field of requiredFields) {
        if (!firebaseConfig[field] || firebaseConfig[field].includes('YOUR_')) {
            console.error(`Firebase config error: ${field} is missing or invalid`);
            return false;
        }
    }
    return true;
}

function initializeFirebase() {
    if (!getApps().length) {
        try {
            if (!validateFirebaseConfig()) {
                console.error('Firebase configuration is invalid. Skipping initialization.');
                return { app: null, auth: null, db: null, messaging: null };
            }

            console.log('Initializing Firebase app...');
            app = initializeApp(firebaseConfig);
            console.log('Firebase app initialized');

            console.log('Initializing Firebase Auth...');
            auth = initializeAuth(app, {
                persistence: getReactNativePersistence(AsyncStorage)
            });
            console.log('Firebase Auth initialized');

            console.log('Initializing Firestore...');
            db = getFirestore(app);
            console.log('Firestore initialized');

            initializeFCM();
        } catch (error) {
            console.error('Failed to initialize Firebase:', error.message);
            return { app: null, auth: null, db: null, messaging: null };
        }
    } else {
        console.log('Firebase already initialized');
    }

    return { app, auth, db, messaging };
}

async function initializeFCM() {
    try {
        console.log('Initializing FCM...');

        // 권한 요청
        const authStatus = await messaging().requestPermission();
        const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
            console.log('Authorization status:', authStatus);

            // FCM 토큰 가져오기
            await messaging().registerDeviceForRemoteMessages();
            const fcmToken = await messaging().getToken();
            if (fcmToken) {
                console.log('FCM token received:', fcmToken.substring(0, 20) + '...');

                // 서버에 토큰 전송 (중복 방지)
                if (fcmToken !== lastSentToken) {
                    await sendFcmTokenToServer(fcmToken);
                    lastSentToken = fcmToken;
                } else {
                    console.log('FCM token unchanged, skipping server update');
                }
            } else {
                console.log('No FCM token available');
            }

            // 토큰 갱신 리스너 설정
            setupTokenRefreshListener();
        } else {
            console.log('Push notification permission denied');
        }

        console.log('FCM initialized successfully');
    } catch (error) {
        console.error('Failed to initialize FCM:', error.message);
    }
}

// 토큰 갱신 리스너 설정
function setupTokenRefreshListener() {
    try {
        messaging().onTokenRefresh(async (token) => {
            console.log('FCM token refreshed:', token.substring(0, 20) + '...');

            if (token !== lastSentToken) {
                await sendFcmTokenToServer(token);
                lastSentToken = token;
            }
        });
        console.log('Token refresh listener set up');
    } catch (error) {
        console.error('Failed to set up token refresh listener:', error);
    }
}

const sendFcmTokenToServer = async (fcmToken) => {
    try {
        console.log('Sending FCM token to server...');

        // 토큰 유효성 검사
        if (!fcmToken || typeof fcmToken !== 'string') {
            throw new Error('Invalid FCM token');
        }

        // 액세스 토큰 가져오기
        const { accessToken, refreshToken } = await TokenManager.getTokens();
        if (!accessToken) {
            console.log('No access token available, skipping FCM token update');
            return;
        }

        // 디바이스 ID 가져오기 (있다면)
        let deviceId;
        try {
            const { DeviceIdManager } = await import('./config');
            deviceId = await DeviceIdManager.getDeviceId();
        } catch (error) {
            console.log('DeviceIdManager not available');
        }

        // 요청 본문 구성
        const requestBody = {
            fcmToken: fcmToken,
            platform: Platform.OS,
            ...(deviceId && { deviceId })
        };

        console.log('Request body:', {
            ...requestBody,
            fcmToken: fcmToken.substring(0, 20) + '...'
        });

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            ...(deviceId && { 'Device-Id': deviceId })
        };

        // Refresh Token이 있으면 헤더에 추가
        if (refreshToken) {
            headers['Refresh-Token'] = `Bearer ${refreshToken}`;
        }

        console.log('Request headers:', {
            ...headers,
            'Authorization': `Bearer ${accessToken.substring(0, 20)}...`,
            'Refresh-Token': refreshToken ? `Bearer ${refreshToken.substring(0, 20)}...` : 'Not provided'
        });

        // 서버에 요청
        const response = await fetch(`${API_BASE_URL}/api/v1/update-fcm-token`, {

            method: 'PUT',
            headers: headers,
            body: JSON.stringify(requestBody),
        });

        // 토큰 갱신 확인 (백엔드에서 자동 갱신했는지 체크)
        if (response.headers.get('token-refreshed') === 'true') {
            const newAccessToken = response.headers.get('authorization');
            if (newAccessToken) {
                const cleanToken = newAccessToken.replace('Bearer ', '');
                await TokenManager.updateStoredToken(cleanToken);
                console.log('Access token이 자동 갱신되었습니다');
            }
        }

        // 응답 처리
        if (!response.ok) {
            const errorText = await response.text();
            try {
                const errorData = JSON.parse(errorText);

                if (errorData.error === 'REFRESH_TOKEN_MISSING') {
                    console.log('Refresh token missing - user needs to re-login');
                    // 로그아웃 처리
                    await TokenManager.clearTokens();
                    return;
                } else if (errorData.error === 'REFRESH_TOKEN_INVALID') {
                    console.log('Refresh token invalid - user needs to re-login');
                    await TokenManager.clearTokens();
                    return;
                } else if (errorData.error === 'DEVICE_MISMATCH') {
                    console.log('Device mismatch - user needs to re-login');
                    await TokenManager.clearTokens();
                    return;
                }
            } catch (parseError) {
                // JSON 파싱 실패시 일반 에러로 처리
            }
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        // const responseData = await response.json();
        console.log('FCM token sent to server successfully:', response.status);

        // 로컬에 저장 (선택사항)
        await AsyncStorage.setItem('lastSentFcmToken', fcmToken);
        await AsyncStorage.setItem('fcmTokenSentAt', new Date().toISOString());

    } catch (error) {
        console.error('Error sending FCM token to server:', error);

        // 특정 에러에 대한 처리
        if (error.message.includes('401')) {
            console.log('Authentication failed, will retry after re-login');
        } else if (error.message.includes('Network')) {
            console.log('Network error, will retry later');
            // 재시도 로직 추가 가능
        }

        // 에러를 throw하지 않음 (앱 초기화 방해하지 않기 위해)
    }
};

export const refreshFCMToken = async () => {
    try {
        // 현재 토큰 상태 확인
        const { accessToken, refreshToken } = await TokenManager.getTokens();

        if (!accessToken) {
            console.log('No access token available for FCM token refresh');
            return null;
        }

        const fcmToken = await messaging().getToken();
        if (fcmToken && fcmToken !== lastSentToken) {
            await sendFcmTokenToServer(fcmToken);
            lastSentToken = fcmToken;
            return fcmToken;
        }
        return fcmToken;
    } catch (error) {
        console.error('Error refreshing FCM token:', error);

        // 인증 에러시 토큰 클리어
        if (error.message.includes('401') || error.message.includes('REFRESH_TOKEN')) {
            await TokenManager.clearTokens();
        }

        throw error;
    }
};

export { initializeFirebase, messaging };