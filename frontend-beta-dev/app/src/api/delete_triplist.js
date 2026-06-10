import axios from 'axios';
import api, { API_BASE_URL, TokenManager } from '.././config'; 
const API_URL = `/api/triplists/v1/`;

export const deleteTriplist = async (triplist_id) => {
  const token = await TokenManager.getAccessToken();
  try {
    const response = await api.delete(API_URL+triplist_id,
        {
            headers: {
                Authorization: `Bearer ${token}`, // Include the token in the header
            },
        }
    );
    // console.log(response)
    return response.data;
  } catch (error) {
    console.error('Error getting r', error);
    throw error;
  }
};
