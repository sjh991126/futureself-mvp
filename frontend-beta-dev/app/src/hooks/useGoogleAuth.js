import { useState } from 'react';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GoogleAuthManager } from '../api/googleSignIn';

export const useGoogleAuth = () => {
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [error, setError] = useState(null);

    const signInWithGoogle = async () => {
        setIsGoogleLoading(true);
        setError(null);

        try {
            console.log('🔵 1. Checking Play Services...');
            await GoogleSignin.hasPlayServices();

            console.log('🔵 2. Starting Google Sign-In...');
            const userInfo = await GoogleSignin.signIn();

            console.log('🔵 3. Raw Google userInfo:', JSON.stringify(userInfo, null, 2));

            // 🔥 데이터 추출
            const idToken = userInfo?.idToken || userInfo?.data?.idToken;
            const user = userInfo?.user || userInfo?.data?.user || userInfo;

            console.log('🔵 4. Extracted user:', JSON.stringify(user, null, 2));

            if (!idToken) {
                console.error('❌ No idToken found');
                throw new Error('Google Sign-In did not return an ID token');
            }

            // 🔥 순수 String 값만 추출 (객체 제거)
            const googleUserInfo = {
                idToken: String(idToken),
                email: String(user.email || ''),
                name: String(user.name || user.givenName || ''),
                photo: String(user.photo || ''),
                // user 객체 전체는 포함하지 않음!
            };

            console.log('🔵 5. Cleaned Google user info:', googleUserInfo);
            console.log('🔵 6. Calling backend...');

            const result = await GoogleAuthManager.signInWithGoogle(googleUserInfo);

            console.log('🔵 7. Backend response:', result);

            // 신규 사용자인 경우
            if (result.isNewUser) {
                result.googleData = {
                    ...result.googleData,
                    idToken: String(idToken),
                };
            }

            return result;

        } catch (error) {
            console.error('❌ Google Sign-In Error:', error);
            console.error('❌ Error details:', JSON.stringify(error, null, 2));

            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                return { canceled: true };
            } else if (error.code === statusCodes.IN_PROGRESS) {
                setError('로그인이 진행 중입니다');
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                setError('Google Play Services를 사용할 수 없습니다');
            } else {
                setError(error.message || '알 수 없는 오류가 발생했습니다');
            }
            throw error;
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const completeDeviceSelection = async (selectedDeviceIds) => {
        setIsGoogleLoading(true);
        setError(null);

        try {
            console.log('🔵 Completing device selection with IDs:', selectedDeviceIds);
            const result = await GoogleAuthManager.completeGoogleDeviceSelection(
                selectedDeviceIds,
                true
            );
            console.log('🔵 Device selection result:', result);
            return result;
        } catch (error) {
            console.error('❌ Device selection error:', error);
            setError(error.message);
            throw error;
        } finally {
            setIsGoogleLoading(false);
        }
    };

    return {
        signInWithGoogle,
        completeDeviceSelection,
        isGoogleLoading,
        error
    };
};