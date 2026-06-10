import api from '../config';
import { useState, useCallback, useRef } from 'react';

/**
 * 알림 목록 조회 (페이지네이션)
 */
export const fetchNotifications = async (page = 0, size = 10) => {

    try {
        const response = await api.get('/api/notifications/v1', {
            params: {
                page,
                size
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching notifications:', error);
        throw error;
    }
};

/**
 * 필터링된 알림 조회
 */
export const fetchFilteredNotifications = async (page = 0, size = 10, type = null, isRead = null) => {
    try {
        const params = { page, size };
        if (type) params.type = type;
        if (isRead !== null) params.isRead = isRead;

        const response = await api.get('/api/notifications/v1/filter', {
            params
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching filtered notifications:', error);
        throw error;
    }
};

/**
 * 읽지 않은 알림 개수 조회
 */
export const fetchUnreadCount = async () => {
    try {
        const response = await api.get('/api/notifications/v1/unread-count');
        return response.data.unreadCount;
    } catch (error) {
        console.error('Error fetching unread count:', error);
        throw error;
    }
};

/**
 * 모든 알림 읽음 처리 
 */
export const markAllAsRead = async () => {
    try {
        const response = await api.patch('/api/notifications/v1/read-all', {});
        console.log('All notifications marked as read:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error marking all as read:', error);
        throw error;
    }
};

/**
 * 특정 알림 읽음 처리
 */
export const markAsRead = async (notificationId) => {
    try {
        const response = await api.patch(`/api/notifications/v1/${notificationId}/read`, {});
        console.log('Notification marked as read:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error marking as read:', error);

        if (error.response?.status === 404) {
            throw new Error('Notification not found');
        } else if (error.response?.status === 403) {
            throw new Error('Access denied');
        }
        throw error;
    }
};

/**
 * 알림 상태 업데이트
 */
export const updateNotificationStatus = async (notificationId, status) => {
    try {
        const response = await api.patch(`/api/notifications/v1/${notificationId}/status`, null, {
            params: {
                status: status,
            }
        });

        console.log('Notification status updated successfully:', response.data);
        return response.data;

    } catch (error) {
        console.error('Error updating notification status:', error);

        if (error.response?.status === 400) {
            throw new Error(`Invalid status: ${status}`);
        } else if (error.response?.status === 404) {
            throw new Error('Notification not found');
        } else if (error.response?.status === 403) {
            throw new Error('Access denied');
        }
        throw error;
    }
};

/**
 * 특정 알림 삭제
 */
export const deleteNotification = async (notificationId) => {
    try {
        const response = await api.delete(`/api/notifications/v1/${notificationId}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting notification:', error);

        if (error.response?.status === 404) {
            throw new Error('Notification not found');
        } else if (error.response?.status === 403) {
            throw new Error('Access denied');
        }
        throw error;
    }
};

/**
 * 무한 스크롤을 위한 헬퍼 함수
 */
export const useInfiniteNotifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState(null);
    const loadingRef = useRef(false);

    const normalizeNotificationPage = (data, pageNum, pageSize = 10) => {
        if (Array.isArray(data?.content)) {
            const list = data.content;
            if (typeof data.last === 'boolean') {
                return { list, hasNext: !data.last };
            }
            if (typeof data.totalPages === 'number' && Number.isFinite(data.totalPages)) {
                return { list, hasNext: pageNum < (data.totalPages - 1) };
            }
            return { list, hasNext: list.length >= pageSize };
        }
        if (Array.isArray(data?.notifications)) {
            const list = data.notifications;
            if (typeof data.hasMore === 'boolean') {
                return { list, hasNext: data.hasMore };
            }
            if (typeof data.totalPages === 'number' && Number.isFinite(data.totalPages)) {
                const currentPage = Number.isFinite(data.page) ? data.page : pageNum;
                return { list, hasNext: currentPage < (data.totalPages - 1) };
            }
            return { list, hasNext: list.length >= pageSize };
        }
        if (Array.isArray(data)) {
            return { list: data, hasNext: data.length >= pageSize };
        }
        return { list: [], hasNext: false };
    };

    const loadNotifications = useCallback(async (pageNum = 0, reset = false) => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        setLoading(true);
        setError(null);

        try {
            const data = await fetchNotifications(pageNum, 10);
            const { list, hasNext } = normalizeNotificationPage(data, pageNum, 10);
            if (reset) {
                setNotifications(list);
            } else {
                setNotifications(prev => [...prev, ...list]);
            }
            setHasMore(hasNext);
            setPage(pageNum);
        } catch (err) {
            setError(err.message);
            console.error('Failed to load notifications:', err);
            throw err;
        } finally {
            loadingRef.current = false;
            setLoading(false);
        }
    }, []);

    const loadMore = useCallback(async () => {
        if (!loadingRef.current && hasMore) {
            try {
                await loadNotifications(page + 1);
            } catch (_) {}
        }
    }, [hasMore, page, loadNotifications]);

    const refresh = useCallback(async () => {
        await loadNotifications(0, true);
    }, [loadNotifications]);

    return {
        notifications,
        setNotifications,
        loading,
        hasMore,
        error,
        loadMore,
        refresh,
        loadNotifications
    };
};

/**
 * 알림 관련 유틸리티 함수들
 */
export const NotificationUtils = {
    /**
     * 읽지 않은 알림만 필터링
     */
    getUnreadNotifications: (notifications) => {
        return notifications.filter(n => !n.isRead);
    },

    /**
     * 타입별로 알림 그룹화
     */
    groupByType: (notifications) => {
        return notifications.reduce((groups, notification) => {
            const type = notification.type;
            if (!groups[type]) {
                groups[type] = [];
            }
            groups[type].push(notification);
            return groups;
        }, {});
    },

    /**
     * 날짜별로 알림 그룹화
     */
    groupByDate: (notifications) => {
        return notifications.reduce((groups, notification) => {
            const date = new Date(notification.createdAt).toDateString();
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(notification);
            return groups;
        }, {});
    },

    /**
     * 상대 시간 표시
     */
    getRelativeTime: (createdAt) => {
        const now = new Date();
        const created = new Date(createdAt);
        const diffInSeconds = Math.floor((now - created) / 1000);

        if (diffInSeconds < 60) {
            return '방금 전';
        } else if (diffInSeconds < 3600) {
            return `${Math.floor(diffInSeconds / 60)}분 전`;
        } else if (diffInSeconds < 86400) {
            return `${Math.floor(diffInSeconds / 3600)}시간 전`;
        } else {
            return `${Math.floor(diffInSeconds / 86400)}일 전`;
        }
    }
};
