import axios from 'axios';
import { API_BASE_URL, DeviceIdManager, TokenManager, replaySessionExpireDraftBackup } from '../config';
import { AuthError } from './errors/AuthError';

const API_URL = `${API_BASE_URL}/google-signin`;

export const GoogleAuthManager = {
    async signInWithGoogle(googleCredential) {
        try {
            console.log('🟢 1. Building request body...');
            const requestBody = this._buildRequestBody(googleCredential);
            console.log('🟢 2. Request body ready:', { hasIdToken: !!requestBody.idToken });

            const deviceId = await DeviceIdManager.getDeviceId();
            console.log('🟢 3. Device ID:', deviceId || 'none');

            console.log('🟢 4. Sending request to:', API_URL);
            const response = await axios.post(API_URL, requestBody, {
                validateStatus: (s) => (s >= 200 && s < 300) || s === 409,
                withCredentials: true,
                headers: deviceId ? { 'Device-Id': deviceId } : undefined,
            });

            console.log('🟢 5. Response status:', response.status);
            console.log('🟢 6. Response data:', response.data);

            return this._handleSignInResponse(response);
        } catch (error) {
            console.error('🔴 GoogleAuthManager Error:');
            console.error('🔴 Error response:', error?.response);
            console.error('🔴 Error status:', error?.response?.status);
            console.error('🔴 Error data:', error?.response?.data);
            console.error('🔴 Full error:', error);

            const status = error?.response?.status;
            if (status === 401) throw new AuthError('Invalid Google Sign-In', error);
            if (status === 400) throw new AuthError('Google 로그인 정보가 만료되었습니다. 다시 로그인해주세요.', error);
            if (status === 500) throw new AuthError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', error);

            // 🔥 더 자세한 에러 메시지
            const errorMsg = error?.response?.data?.message || error?.message || '알 수 없는 오류';
            throw new AuthError(`Google 로그인 중 오류가 발생했습니다: ${errorMsg}`, error);
        }
    },

    async completeGoogleDeviceSelection(selectedDeviceIds, proceed = true) {
        try {
            const response = await axios.post(
                `${API_URL}/device-selection`,
                { deviceIds: selectedDeviceIds, proceed },
                {
                    withCredentials: true,
                    validateStatus: (s) => s >= 200 && s < 300,
                }
            );
            return this._handleDeviceSelectionResponse(response);
        } catch (error) {
            const status = error?.response?.status;
            if (status === 400) throw new AuthError('Google 로그인 정보가 만료되었습니다. 다시 로그인해주세요.', error);
            if (status === 500) throw new AuthError('Google 기기 선택 처리 중 오류가 발생했습니다.', error);
            throw new AuthError('기기 선택 중 오류가 발생했습니다.', error);
        }
    },

    async completeGoogleSignup(idToken) {
        try {
            const response = await axios.post(
                API_URL,
                { idToken },
                {
                    withCredentials: true,
                    validateStatus: (s) => (s >= 200 && s < 300) || s === 409,
                }
            );
            const result = await this._handleSignInResponse(response);
            return result;
        } catch (error) {
            const status = error?.response?.status;
            if (status === 400) throw new AuthError('사용자를 찾을 수 없습니다.', error);
            throw new AuthError('Google 회원가입 완료 중 오류가 발생했습니다.', error);
        }
    },

    _buildRequestBody(googleUserInfo) {
        console.log('🟡 Raw input to _buildRequestBody:', JSON.stringify(googleUserInfo, null, 2));

        // 🔥 명시적으로 String 값만 추출
        const idToken = String(googleUserInfo?.idToken || googleUserInfo?.credential || '');
        const email = String(googleUserInfo?.email || googleUserInfo?.user?.email || '');
        const name = String(googleUserInfo?.name || googleUserInfo?.user?.name || googleUserInfo?.user?.givenName || '');
        const picture = String(googleUserInfo?.photo || googleUserInfo?.picture || googleUserInfo?.user?.photo || '');

        if (!idToken) {
            console.error('🔴 No idToken found');
            throw new AuthError('Google ID token이 없습니다.');
        }

        // 🔥 백엔드 DTO에 맞춰 순수 String만 반환
        const requestBody = {
            idToken: idToken,
            email: email,
            name: name,
            picture: picture
        };

        console.log('🟡 Final request body (all strings):', requestBody);
        console.log('🟡 Type check:', {
            idToken: typeof requestBody.idToken,
            email: typeof requestBody.email,
            name: typeof requestBody.name,
            picture: typeof requestBody.picture
        });

        return requestBody;
    },

    async _handleSignInResponse(response) {
        const { data, status } = response;

        if (data?.newUser) {
            return {
                isNewUser: true,
                googleData: {
                    googleId: data.googleId,
                    email: data.email,
                    name: data.name,
                    photo: data.picture || data.photo,
                    idToken: data.idToken,
                },
                loginMethod: 'google'
            };
        }

        if (status === 409 && data?.step === 'device_selection_required') {
            return {
                needsDeviceSelection: true,
                deviceSelection: data.deviceSelection,
                deviceId: data.deviceId,
                loginMethod: 'google',
            };
        }

        if (data?.step === 'login_complete') {
            await this._storeTokens(data);
            return { loginSuccess: true, user: data.user, loginMethod: 'google' };
        }

        if (data?.accessToken && data?.refreshToken) {
            await this._storeTokens(data);
            return { loginSuccess: true, user: data.user, loginMethod: 'google' };
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
                loginMethod: 'google',
            };
        }
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
            console.warn('Session-expire draft replay failed after Google login:', backupError);
        }
    },
};
