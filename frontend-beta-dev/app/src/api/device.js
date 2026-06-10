import axios from 'axios';
import { API_BASE_URL, TokenManager } from '../config';
import { endpoints } from './endpoints';

export const DeviceManager = {
    async getDeviceList() {
        try {
            const response = await axios.get(`${API_BASE_URL}${endpoints.devices('/list')}`);
            await TokenManager.storeActiveDevices(response.data.devices);
            return response.data;
        } catch (error) {
            console.error('Get device list error:', error);
            throw error;
        }
    },
    
    async logoutDevice(deviceId) {
        try {
            const response = await axios.delete(`${API_BASE_URL}${endpoints.devices(`/${deviceId}`)}`);
            return response.data;
        } catch (error) {
            console.error('Logout device error:', error);
            throw error;
        }
    },
    
    async checkDeviceLimit(username) {
        try {
            const response = await axios.post(`${API_BASE_URL}${endpoints.devices('/check-limit')}`, {
                username
            });
            return response.data;
        } catch (error) {
            console.error('Check device limit error:', error);
            throw error;
        }
    },
    
    async getCurrentDeviceId() {
        try {
            const { DeviceIdManager } = await import('../config');
            return await DeviceIdManager.getDeviceId();
        } catch (error) {
            console.error('Get current device ID error:', error);
            throw error;
        }
    }
};
