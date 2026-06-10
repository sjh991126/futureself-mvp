import axios from 'axios';
import { API_BASE_URL, DeviceIdManager, TokenManager, replaySessionExpireDraftBackup } from '../config';
import { AuthError } from './errors/AuthError';

const API_URL = `${API_BASE_URL}/apple-signin`;

export const AppleAuthManager = {
    async signInWithApple(appleCredential) {
        try {
            const requestBody = this._buildRequestBody(appleCredential);
            const deviceId = await DeviceIdManager.getDeviceId();

            const response = await axios.post(API_URL, requestBody, {
                // 409도 정상 흐름으로 받기
                validateStatus: (s) => (s >= 200 && s < 300) || s === 409,
                withCredentials: true, // 쿠키 유지
                headers: deviceId ? { 'Device-Id': deviceId } : undefined,
            });

            return this._handleSignInResponse(response);
        } catch (error) {
            // 상태별 메시지 맵핑
            const status = error?.response?.status;
            if (status === 401) throw new AuthError('Invalid Apple Sign-In', error);
            if (status === 400) throw new AuthError('Apple 로그인 정보가 만료되었습니다. 다시 로그인해주세요.', error);
            if (status === 500) throw new AuthError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', error);
            throw new AuthError('Apple 로그인 중 오류가 발생했습니다.', error);
        }
    },

    async completeAppleDeviceSelection(selectedDeviceIds, proceed = true) {
        try {
            const response = await axios.post(
                `${API_URL}/device-selection`,
                {
                    // 오타 수정
                    deviceIds: selectedDeviceIds,
                    proceed,
                },
                {
                    withCredentials: true, // 세션 쿠키 필요
                    validateStatus: (s) => s >= 200 && s < 300,
                }
            );

            return this._handleDeviceSelectionResponse(response);
        } catch (error) {
            const status = error?.response?.status;
            if (status === 400) throw new AuthError('Apple 로그인 정보가 만료되었습니다. 다시 로그인해주세요.', error);
            if (status === 500) throw new AuthError('Apple 기기 선택 처리 중 오류가 발생했습니다.', error);
            throw new AuthError('기기 선택 중 오류가 발생했습니다.', error);
        }
    },

    _buildRequestBody(appleCredential) {
        const { identityToken, user, email, fullName } = appleCredential;
        const requestBody = { identityToken, user, email };

        if (fullName?.givenName && fullName?.familyName) {
            requestBody.fullName = `${fullName.givenName} ${fullName.familyName}`;
        } else if (fullName?.givenName) {
            requestBody.fullName = fullName.givenName;
        } else if (fullName?.familyName) {
            requestBody.fullName = fullName.familyName;
        }
        return requestBody;
    },

    async _handleSignInResponse(response) {
        const { data, status } = response;

        // 신규 사용자
        if (data?.newUser) {
            return { isNewUser: true, appleData: data, loginMethod: 'apple' };
        }

        // 409: 기기 선택 필요
        if (status === 409 && data?.step === 'device_selection_required') {
            return {
                needsDeviceSelection: true,
                deviceSelection: data.deviceSelection,
                deviceId: data.deviceId,
                loginMethod: 'apple',
            };
        }

        // 일반 로그인 완료
        if (data?.step === 'login_complete') {
            await this._storeTokens(data);
            return { loginSuccess: true, user: data.user, loginMethod: 'apple' };
        }

        // 호환성 유지: step 없이 토큰만 내려오는 경우
        if (data?.accessToken && data?.refreshToken) {
            await this._storeTokens(data);
            return { loginSuccess: true, user: data.user, loginMethod: 'apple' };
        }

        throw new AuthError('알 수 없는 로그인 응답 형식입니다.');
    },

    async _handleDeviceSelectionResponse(response) {
        const { data } = response;

        if (data?.step === 'login_complete') {
            await this._storeTokens(data);
            return {
                loginSuccess: true,
                user: data.user,
                deviceLoggedOut: data.deviceLoggedOut,
                loginMethod: 'apple',
            };
        }

        // login_cancelled 등 그대로 반환
        return data;
    },

    async _storeTokens(data) {
        if (data?.tokenExpiresIn) {
            await TokenManager.storeTokensWithExpiration(
                data.accessToken,
                data.refreshToken,
                data.tokenExpiresIn
            );
        } else {
            await TokenManager.storeTokens(data.accessToken, data.refreshToken);
        }
        if (data?.user) await TokenManager.storeUserData(data.user);
        try {
            await replaySessionExpireDraftBackup();
        } catch (backupError) {
            console.warn('Session-expire draft replay failed after Apple login:', backupError);
        }
    },
};

// 기존 함수 호환성 유지
export const appleSignIn = async (identityToken, user, email, fullName) => {
    console.warn('appleSignIn 함수는 deprecated됩니다. AppleAuthManager.signInWithApple을 사용해주세요.');

    const credential = { identityToken, user, email, fullName };
    const result = await AppleAuthManager.signInWithApple(credential);

    // 기존 응답 형식으로 변환
    if (result.isNewUser) {
        return result.appleData;
    } else if (result.loginSuccess) {
        return result.user;
    }

    return result;
};
