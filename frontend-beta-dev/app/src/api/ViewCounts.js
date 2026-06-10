import axios from 'axios';
import { API_BASE_URL, TokenManager } from '.././config';
const API_URL_1 = `${API_BASE_URL}/api/categories/view/`;
const API_URL_2 = `${API_BASE_URL}/api/places/v1/view/`;
const API_URL_3 = `${API_BASE_URL}/api/triplists/v1/view/`;

export const categoryView = async (categoryId) => {
    try {
        console.log(categoryId);
        console.log(API_URL_1)
        const token = await TokenManager.getAccessToken();
        const fullUrl = `${API_URL_1}${categoryId}`;
        console.log('Full URL:', fullUrl); // Log the full URL

        const response = await axios.post(fullUrl, null, {
            headers: {
                Authorization: `Bearer ${token}`
            },
        });
        return response.data;
    } catch (error) {
        if (error.response) {
            console.error('Error response:', error.response.data);
            console.error('Error status:', error.response.status);
            console.error('Error headers:', error.response.headers);
        } else if (error.request) {
            console.error('Error request:', error.request);
        } else {
            console.error('Error message:', error.message);
        }
        throw error;
    }
};

export const placeView = async (placeId) => {
    try {
        console.log(placeId);
        const token = await TokenManager.getAccessToken();
        const fullUrl = `${API_URL_2}${placeId}`;
        console.log('Full URL for placeView:', fullUrl); // Log the full URL

        const response = await axios.post(fullUrl, null, {
            headers: {
                Authorization: `Bearer ${token}`
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error place view', error);
        throw error;
    }
};

export const triplistView = async (tripListId) => {
    try {
        console.log(tripListId);
        const token = await TokenManager.getAccessToken();
        const fullUrl = `${API_URL_3}${tripListId}`;
        console.log('Full URL for triplistView:', fullUrl); // Log the full URL

        const response = await axios.post(fullUrl, null, {
            headers: {
                Authorization: `Bearer ${token}`
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error triplist view', error);
        throw error;
    }
};
