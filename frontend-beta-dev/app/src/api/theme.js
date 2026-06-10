import axios from 'axios';
import api, { API_BASE_URL, TokenManager } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = `${API_BASE_URL}/api/theme/v1`;

// 테마 사용 로깅
export const logThemeUsage = async (themeId) => {
    try {
        const token = await TokenManager.getAccessToken();
        const response = await api.post(
            `/api/theme/v1/usage`,
            {
                themeId,
                timestamp: new Date().toISOString()
            },
        );
        return response.status === 200;
    } catch (error) {
        console.error('Error logging theme usage:', error);
        return false;
    }
};

// 테마 순서 업데이트 로깅
export const logThemeOrderUpdate = async (themeOrder) => {
    try {
        const token = await TokenManager.getAccessToken();
        const response = await axios.post(
            `${API_URL}/order-update`,
            {
                themeOrder: themeOrder.map(theme => ({
                    id: theme.id
                })),
                timestamp: new Date().toISOString()
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            }
        );
        return response.status === 200;
    } catch (error) {
        console.error('Error logging theme order:', error);
        return false;
    }
};

export const saveThemeOrder = async (currentThemes) => {
    try {
        // 1. AsyncStorage에 저장
        const themeOrder = currentThemes.map(theme => theme.id);
        await AsyncStorage.setItem('userThemeOrder', JSON.stringify(themeOrder));

        // 2. 서버에 순서 업데이트 및 분석 데이터 전송
        const token = await TokenManager.getAccessToken();
        const response = await axios.post(
            `${API_URL}/order-update`,
            {
                themeOrder: currentThemes.map(theme => ({
                    id: theme.id
                })),
                timestamp: new Date().toISOString()
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            }
        );
        return response.status === 200;
    } catch (error) {
        console.error('Error saving theme order:', error);
        return false;
    }
};

export const resetThemeOrder = async () => {
    try {
        await AsyncStorage.removeItem('userThemeOrder');
        return true;
    } catch (error) {
        console.error('Error resetting theme order:', error);
        return false;
    }
};
