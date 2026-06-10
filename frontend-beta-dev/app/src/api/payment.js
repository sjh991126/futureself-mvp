import axios from 'axios';
import { API_BASE_URL } from '.././config';

const API_URL = `${API_BASE_URL}/api/create-payment-intent`;

export const createPayment = async (price) => {
    try {
        const response = await axios.post(API_URL, {
            amount: Math.round(parseFloat(price) * 100), 
            currency: 'hkd',
        }, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return response.data; 
    } catch (error) {
        console.error('Error creating payment:', error);
        throw error;
    }
};