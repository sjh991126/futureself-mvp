import axios from 'axios';
import api, { API_BASE_URL, TokenManager } from '../config';
import { getDeviceId } from '../utils/deviceId';
import { endpoints } from './endpoints';
const API_URL = endpoints.triplists('/user');

export const getTriplist = async () => {
    try {
        console.log('Fetching trip list...');
        const response = await api.get(API_URL, {
        });
        return response.data;
    } catch (error) {
        console.error('Error getting my triplists', error);
        if (error.response && error.response.status === 401) {
            // Token might be expired, try to refresh
            try {
                await TokenManager.refreshAccessToken();
                // Retry the request
                const newToken = await TokenManager.getAccessToken();
                const retryResponse = await axios.get(API_URL, {
                    headers: {
                        Authorization: `Bearer ${newToken}`,
                    },
                });
                return retryResponse.data;
            } catch (refreshError) {
                console.error('Error refreshing token', refreshError);
                // redirect to login screen here
                throw refreshError;
            }
        }
        throw error;
    }
};

export const getTriplistByCategory = async (category, page = 0, size = 10) => {
    
    try {
        const categoryEndpoints = {
            'Personal': endpoints.triplists('/personal'),
            'Collaborate': endpoints.triplists('/collaborate'),
            'Past Trips': endpoints.triplists('/past'),
            'Drafts': endpoints.drafts()
        };
        
        const isDrafts = category === 'Drafts';
        const params = isDrafts
            ? { page, size, type: 'autosave' }
            : { page, size, sort: 'lastModifiedAt,DESC' };
        const headers = isDrafts
            ? { 'Device-Id': await getDeviceId() }
            : undefined;

        const response = await api.get(categoryEndpoints[category], { params, headers });
        
        console.log(`Fetched ${category} trip lists:`, response.data);
        return response.data;
    } catch (error) {
        console.error(`Error fetching ${category} trip lists:`, error);
        throw error;
    }
};
