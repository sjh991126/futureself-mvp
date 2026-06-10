import api from '../config';
import { endpoints } from './endpoints';

// Block a user. Optional reason (max 500 chars).
// Backend also auto-unfollows in both directions, cancels any pending follow
// request, and notifies the moderation inbox via email. Calling on an already
// blocked user is idempotent.
export const blockUser = async (targetUserId, reason) => {
    if (!targetUserId) throw new Error('blockUser: targetUserId is required');

    const body = reason ? { reason: String(reason).slice(0, 500) } : {};
    try {
        const response = await api.post(endpoints.blocks(`/${targetUserId}`), body);
        return response.data;
    } catch (error) {
        console.error('Error blocking user:', error?.response?.data || error.message);
        throw error;
    }
};

// Unblock a user.
export const unblockUser = async (targetUserId) => {
    if (!targetUserId) throw new Error('unblockUser: targetUserId is required');

    try {
        const response = await api.delete(endpoints.blocks(`/${targetUserId}`));
        return response.data;
    } catch (error) {
        console.error('Error unblocking user:', error?.response?.data || error.message);
        throw error;
    }
};

// List of users I have blocked (used by the "Blocked Users" settings screen).
export const getBlockedUsers = async () => {
    try {
        const response = await api.get(endpoints.blocks());
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error('Error fetching blocked users:', error?.response?.data || error.message);
        throw error;
    }
};

// Returns { blocked: boolean }. Used to toggle Block/Unblock on profile.
export const getBlockStatus = async (targetUserId) => {
    if (!targetUserId) return { blocked: false };

    try {
        const response = await api.get(endpoints.blocks(`/status/${targetUserId}`));
        return response.data || { blocked: false };
    } catch (error) {
        console.error('Error fetching block status:', error?.response?.data || error.message);
        return { blocked: false };
    }
};
