import axios from 'axios';
import api, { API_BASE_URL, TokenManager } from '../config';

const API_URL = `${API_BASE_URL}/api/userPoints/v1`;

// Get user points
export const getUserPoints = async () => {
  try {
    const token = await TokenManager.getAccessToken();
    const response = await axios.get(API_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting user points:', error);
    throw error;
  }
};

// Increment user points (PATCH)
export const incrementUserPoints = async (pointsToAdd) => {
  try {
    const token = await TokenManager.getAccessToken();
    const response = await api.patch('/api/userPoints/v1', 
      { increment: pointsToAdd },
    );
    return response.data;
  } catch (error) {
    console.error('Error incrementing user points:', error);
    throw error;
  }
};

// Set user points (PUT) - for admin/reset purposes
export const setUserPoints = async (totalPoints) => {
  try {
    const token = await TokenManager.getAccessToken();
    const response = await axios.put(API_URL, 
      { points: totalPoints },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error setting user points:', error);
    throw error;
  }
}; 
