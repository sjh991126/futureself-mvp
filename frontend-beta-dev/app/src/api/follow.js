import axios from "axios";
import { API_BASE_URL, TokenManager } from "../config";

// 팔로우 요청 응답 API 함수들
export const acceptFollowRequest = async (requestId) => {
    const token = await TokenManager.getAccessToken();
    const url = `${API_BASE_URL}/api/follows/v1/requests/${requestId}/accept`;

    try {
        const response = await axios.post(url, null, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error accepting follow request:', error);
        throw error;
    }
};

export const rejectFollowRequest = async (requestId) => {
    const token = await TokenManager.getAccessToken();
    const url = `${API_BASE_URL}/api/follows/v1/requests/${requestId}/reject`;

    try {
        const response = await axios.post(url, null, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error rejecting follow request:', error);
        throw error;
    }
};