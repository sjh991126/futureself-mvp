import api, { API_BASE_URL, TokenManager } from '../config';
import { endpoints } from './endpoints';

const API_URL = endpoints.triplists();
const INSTANT_API_URL = endpoints.triplists('/ai/instant');

export const createTripList = async (tripData) => {
    console.log("trip data recived:", tripData);
    try {
        const token = await TokenManager.getAccessToken();
        const response = await api.post(API_URL, tripData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error creating trip list', error);
        if (error.response && error.response.status === 401) {
            // Token might be expired, try to refresh
            try {
                await TokenManager.refreshAccessToken();
                // Retry the request
                const retryResponse = await api.post(API_URL, tripData);
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

export const fetchInstantTripList = async (data, signal) => {
    try {
        const response = await api.post(INSTANT_API_URL, data, { signal });
        // console.log('Instant Trip List API response:', response.data); // Log the entire response
        return response.data;
    } catch (error) {
        console.error('Error fetching instant trip list:', error);
        throw error;
    }
};

export const fetchTripListById = async (tripListId) => {
    try {
        const tripListData = await api.get(`${API_URL}/${tripListId}`);
        console.log('triplistdata', tripListData.data);
        return tripListData.data;
    } catch (error) {
        console.error('Failed to fetch trip list:', error);
    }
};
