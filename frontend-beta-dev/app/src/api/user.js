import axios from 'axios';
import api, { API_BASE_URL, TokenManager } from '.././config';
import { endpoints } from './endpoints';

const API_URL = endpoints.users();
const LOGIN_URL = `${API_BASE_URL}/login`;

export const editUserProfile = async (newUser) => {
    try {
        const token = await TokenManager.getAccessToken();
        const response = await api.put(
            API_URL + '/profile',
            newUser,
            {
                headers: {
                    Authorization: 'Bearer ' + token, // Include the token in the header
                },
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error adding profile image', error);
        throw error;
    }
};

export const checkUsernameExists = async (username) => {
    try {
        const response = await axios.get(`${API_BASE_URL}${API_URL}/check-username?username=${username}`);
        return response.data;
    } catch (error) {
        console.error('Error checking username', error);
        throw error;
    }
};

export const checkEmailExists = async (email) => {
    try {
        const encodedEmail = encodeURIComponent(String(email || '').trim());
        const response = await axios.get(`${API_BASE_URL}${API_URL}/check-email?email=${encodedEmail}`);
        return response?.data?.exists === true;
    } catch (error) {
        console.error('Error checking email', error);
        throw error;
    }
};

// Search for users by username
export const searchUsers = async (query) => {
    const trimmedQuery = String(query || '').trim();
    if (!trimmedQuery) {
        return [];
    }

    const response = await api.get(`${API_URL}/search`, {
        params: {
            query: trimmedQuery,
        },
    });

    console.log('users:', response.data);
    return response.data;
};

// 기기 선택이 필요한 로그인 플로우 처리
export const handleDeviceSelectionFlow = async (loginData) => {
    try {
        // Use plain axios to avoid global 401 session-expiry interceptor during login.
        const response = await axios.post(LOGIN_URL, loginData);
        
        // 409 응답 처리 (기기 선택 필요)
        if (response.status === 409 && response.data.step === 'device_selection_required') {
            return {
                needsDeviceSelection: true,
                deviceSelection: response.data.deviceSelection,
                deviceId: response.data.deviceId
            };
        }
        
        // 일반 로그인 완료
        if (response.data.step === 'login_complete') {
            await TokenManager.storeTokensWithExpiration(
                response.data.accessToken,
                response.data.refreshToken,
                response.data.tokenExpiresIn
            );
            return { needsDeviceSelection: false, loginSuccess: true };
        }
        
    } catch (error) {
        throw error;
    }
};

// 기기 선택 후 로그인 완료
export const completeDeviceSelectionLogin = async (selectedDeviceIds, proceed = true) => {
    try {
        const response = await api.post(endpoints.devices('/logout-and-login'), {
            devicdIds: selectedDeviceIds, // 백엔드 오타에 맞춤
            proceed: proceed
        });
        
        if (response.data.step === 'login_complete') {
            await TokenManager.storeTokensWithExpiration(
                response.data.loginResult.accessToken,
                response.data.loginResult.refreshToken,
                900 // 15분
            );
            return response.data.loginResult;
        }
        
        return response.data;
    } catch (error) {
        console.error('Complete device selection login error:', error);
        throw error;
    }
};
