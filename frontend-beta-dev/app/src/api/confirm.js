import axios from 'axios';
import { API_BASE_URL } from '.././config';

export const confirm = async (email) => {
  console.log('Sending email:', email);  // Log data to be sent
  try {
    const response = await axios.post(`${API_BASE_URL}/confirm/` + email);

    if (response.status === 200) {
      console.log('Email sent successfully:', response.data);
      return true; 
    } else {
      console.error('Unexpected response status:', response.status);
      return false; 
    }
  } catch (error) {
    console.error('Error sending email', error);
    throw error;  
  }
};

