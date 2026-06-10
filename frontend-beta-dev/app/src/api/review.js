import axios from 'axios';
import api, { API_BASE_URL, TokenManager } from '.././config';
import { incrementUserPoints } from './userPoints';

export const uploadReview = async (placeId, body) => {
  console.log('Sending new review data:', body);  // Log data to be sent
  try {
    const response = await api.post(`/api/reviews/v1/places/${placeId}`, body);
    
    // Award points after successful review upload
    try {
      await incrementUserPoints(10);
      console.log('Review points awarded: +10 points');
    } catch (pointsError) {
      console.warn('Points system not available, review uploaded successfully');
      // Don't throw here - review was successful, points update is secondary
    }
    
    return response.data;
  } catch (error) {
    console.error('Error sending review:', error);
    throw error;
  }
};

