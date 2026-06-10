import axios from 'axios';
import { API_BASE_URL } from '.././config'; 
const API_URL = `${API_BASE_URL}/api/v1/verify`;

export const otpverify = async (verify) => {
  console.log('Sending email and otp:', verify);  // Log data to be sent
  try {
    const response = await axios.post(API_URL, verify);
    console.log('Otp sent:', response.data);
    return response.data;
  } catch (error) {
    console.error('Otp Verify Failed:', error);
    throw error;
  }
};
