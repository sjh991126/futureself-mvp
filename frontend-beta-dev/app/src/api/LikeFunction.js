import axios from 'axios';
import { API_BASE_URL, TokenManager } from '.././config'; 
const API_URL = `${API_BASE_URL}/api/like/v1/places/`;

export const LikeIncrement = async (placeId) => {
  try {
    const token = await TokenManager.getAccessToken();
    const url = `${API_URL}${placeId}`;
    console.log('Request URL:', url); // Log the URL to verify its format

    const response = await axios.put(url, {}, { // Ensure the request body is an empty object
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
    console.log('LikeIncrement Response:', response.data)
    return response.data;
  } catch (error) {
    console.error('Like/UnLike Place Failed:', error);
    throw error;
  }
};
