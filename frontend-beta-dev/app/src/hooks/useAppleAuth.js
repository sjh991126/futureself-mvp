import { useState, useCallback, useRef, useEffect } from 'react';

import * as AppleAuthentication from 'expo-apple-authentication';
import { AppleAuthManager } from '../api/appleSignIn';
import { AuthError } from '../api/errors/AuthError';

/**
 * Apple 로그인 훅
 */
export const useAppleAuth = () => {
    const isMountedRef = useRef(true);
    const [isAppleLoading, setIsAppleLoading] = useState(false);
    const [error, setError] = useState(null);

    const isAppleCancellationError = useCallback((authError) => {
        const errorCode = authError?.code;
        const errorMessage = authError?.message || '';

        return errorCode === 'ERR_REQUEST_CANCELED'
            || errorCode === 'ERR_CANCELED'
            || errorMessage.includes('canceled the authorization attempt')
            || errorMessage.includes('authorization request wasn’t handled')
            || errorMessage.includes("authorization request wasn't handled");
    }, []);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    /**
     * Apple 로그인 실행
     */
    const signInWithApple = useCallback(async () => {
        setIsAppleLoading(true);
        setError(null);

        try {
            // Apple Sign-In 가용성 확인
            const isAvailable = await AppleAuthentication.isAvailableAsync();
            if (!isAvailable) {
                throw new AuthError('이 기기에서는 Apple 로그인을 사용할 수 없습니다.');
            }

            // Apple 인증 요청
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            console.log('Apple credential:', credential);

            // 토큰 확인
            if (!credential.identityToken) {
                throw new AuthError('Apple 인증 토큰을 받을 수 없습니다.');
            }

            // 로그인 처리
            const result = await AppleAuthManager.signInWithApple(credential);
            console.log('Apple sign-in result:', result);

            if (!isMountedRef.current) return;

            return result;

        } catch (error) {
            console.error('Apple Sign-In Error:', error);
            if (!isMountedRef.current) return;


            // 사용자 취소/시트 닫힘은 에러로 처리하지 않음
            if (isAppleCancellationError(error)) {
                return { canceled: true };
            }

            const authError = error instanceof AuthError ? error : new AuthError('Apple 로그인 중 오류가 발생했습니다.', error);
            setError(authError);
            throw authError;
        } finally {
            setIsAppleLoading(false);
        }
    }, [isAppleCancellationError]);

    /**
     * 기기 선택 완료
     */
    const completeDeviceSelection = useCallback(async (selectedDeviceIds, proceed = true) => {
        setIsAppleLoading(true);
        setError(null);

        try {
            const result = await AppleAuthManager.completeAppleDeviceSelection(selectedDeviceIds, proceed);
            return result;
        } catch (error) {
            console.error('Apple device selection error:', error);
            const authError = error instanceof AuthError ? error : new AuthError('기기 선택 중 오류가 발생했습니다.', error);
            setError(authError);
            throw authError;
        } finally {
            setIsAppleLoading(false);
        }
    }, []);

    /**
     * 에러 초기화
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        signInWithApple,
        completeDeviceSelection,
        isAppleLoading,
        error,
        clearError
    };
};
