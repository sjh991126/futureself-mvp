import axios from 'axios';
import { API_BASE_URL } from '.././config';

const API_URL = `${API_BASE_URL}/forgot-password`;

export const reconfirm = async (email) => {
    console.log('Sending email:', email); 
    try {
        const response = await axios.post(`${API_URL}/send-otp?email=` + email);
        console.log('Email sent:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error sending email', error);
        throw error;
    }
};

export const reverify = async (email, otp) => {
    try {
        const response = await axios.post(`${API_URL}/verify-otp?email=${email}&otp=${otp}`);
        console.log('reverify response', response);

        // Check if the response is valid
        if (response.status === 200 && response.data === 'OTP is valid') {
            return response.data;  
        } else {
            throw new Error('Invalid OTP'); 
        }
    } catch (error) {
        console.error('Error verifying otp', error);
        throw error; 
    }
};


// Reset password after OTP verification
export const resetPassword = async (email, password) => {
    try {
        const response = await axios.post(`${API_URL}/reset-password?email=${email}&newPassword=${password}`);
        console.log('Password reset response:', response);

        if (response.status === 200 && response.data === 'Password successfully reset') {
            return response.data;
        } else {
            throw new Error('Password reset failed');
        }
    } catch (error) {
        console.error('Error resetting password:', error);
        throw error;
    }
};