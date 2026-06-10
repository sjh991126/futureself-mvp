import axios from 'axios';
import api, { API_BASE_URL, TokenManager } from '../config';

const API_BASE_PATH = `${API_BASE_URL}/api/users/v1`;

// Get user's quests and user points
export const getUserQuests = async () => {
  try {
    const token = await TokenManager.getAccessToken();
    const userData = await TokenManager.getUserData();
    const userId = userData?.id;
    
    if (!userId) {
      throw new Error('User ID not found');
    }

    const response = await api.get(`/api/quests/v1`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting user quests:', error);
    throw error;
  }
};

// Request new quests (override existing ones)
export const requestNewQuests = async () => {
  try {
    const token = await TokenManager.getAccessToken();
    const userData = await TokenManager.getUserData();
    const userId = userData?.id;
    
    if (!userId) {
      throw new Error('User ID not found');
    }

    const response = await axios.post(`${API_BASE_URL}/api/quests/v1?userId=${userId}`, {}, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error requesting new quests:', error);
    throw error;
  }
};

// Assign weekly quests for specific user (admin function)
export const assignWeeklyQuests = async (userId) => {
  try {
    const token = await TokenManager.getAccessToken();
    const response = await axios.post(`${API_BASE_URL}/api/quests/v1?userId=${userId}`, {}, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error assigning weekly quests:', error);
    throw error;
  }
};

// Complete a quest and return new user points and level
export const completeQuest = async (activityType) => {
  try {
    const token = await TokenManager.getAccessToken();
    const userData = await TokenManager.getUserData();
    const userId = userData?.id;
    
    if (!userId) {
      throw new Error('User ID not found');
    }

    const response = await axios.post(`${API_BASE_URL}/api/quests/v1/complete?userId=${userId}&activityType=${activityType}`, {}, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error completing quest:', error);
    throw error;
  }
}; 
