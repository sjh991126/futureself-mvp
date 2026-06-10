import axios from 'axios';
import { API_BASE_URL, TokenManager } from '../config';

export const BiometricAuthManager = {
    async registerBiometric(biometricData, biometricType) {
        try {
            const response = await axios.post(`${API_BASE_URL}/api/biometric/v1/register`, {
                biometricData,
                biometricType
            });
            return response.data;
        } catch (error) {
            console.error('Biometric registration error:', error);
            throw error;
        }
    },
    
    async loginWithBiometric(biometricData) {
        try {
            const response = await axios.post(`${API_BASE_URL}/api/biometric/v1/login`, {
                biometricData
            });
            
            if (response.data.success) {
                await TokenManager.storeTokensWithExpiration(
                    response.data.accessToken,
                    response.data.refreshToken,
                    900 // 15분
                );
            }
            
            return response.data;
        } catch (error) {
            console.error('Biometric login error:', error);
            throw error;
        }
    },
    
    async getBiometricList() {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/biometric/v1/list`);
            return response.data;
        } catch (error) {
            console.error('Get biometric list error:', error);
            throw error;
        }
    },
    
    async deactivateBiometric(deviceId) {
        try {
            const response = await axios.delete(`${API_BASE_URL}/api/biometric/v1/device/${deviceId}`);
            return response.data;
        } catch (error) {
            console.error('Deactivate biometric error:', error);
            throw error;
        }
    }
};
