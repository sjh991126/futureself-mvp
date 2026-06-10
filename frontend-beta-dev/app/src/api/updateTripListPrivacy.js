import axios from 'axios';
import { API_BASE_URL, TokenManager } from '.././config';

export const updateTripListPrivacy = async (tripListId, isPublic) => {
    try {
        const token = await TokenManager.getAccessToken();
        const url = `${API_BASE_URL}/api/triplists/v1/privacy/${tripListId}/${isPublic}`;
        
        console.log(token)
        console.log('API URL:', url);

        const response = await axios.put(url, {}, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        });
        return response.data;
    } catch (error) {
        if (error.response) {
            // Log the response data if available
            console.error('Error response data:', error.response.data);
            console.error('Error response status:', error.response.status);
            console.error('Error response headers:', error.response.headers);
        } else {
            // Log the error message if no response is available
            console.error('Error message:', error.message);
        }
        throw error;
    }
};
