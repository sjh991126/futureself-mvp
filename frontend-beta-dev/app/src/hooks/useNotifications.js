import { useState, useEffect, useRef, useCallback } from 'react';
import messaging from '@react-native-firebase/messaging';
import notifee, { EventType } from '@notifee/react-native';
import { fetchNotifications, markAsRead } from '../api/notification';
import { refreshFCMToken } from '../firebase';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

export const useNotifications = () => {
    const router = useRouter();
    const [notifications, setNotifications] = useState([]);
    const [hasUnread, setHasUnread] = useState(false);
    const processedIds = useRef(new Map());
    const currentRunId = useRef(0);
    const notificationHandled = useRef(false);

    // 중복 체크
    const isDuplicate = useCallback((id, windowMs = 60000) => {
        const last = processedIds.current.get(id);
        const now = Date.now();
        if (last && now - last < windowMs) return true;

        processedIds.current.set(id, now);

        // 메모리 관리: 200개 초과 시 오래된 항목 삭제
        if (processedIds.current.size > 200) {
            const entries = Array.from(processedIds.current.entries());
            entries
                .filter(([_, timestamp]) => now - timestamp > windowMs)
                .forEach(([id]) => processedIds.current.delete(id));
        }

        return false;
    }, []);

    // 알림 목록 업데이트
    const updateNotifications = useCallback(async () => {
        try {
            const data = await fetchNotifications();
            const list = data.content || data || [];
            setNotifications(list);

            const unreadCount = list.filter(n => !n.isRead).length;
            setHasUnread(unreadCount > 0);
            await notifee.setBadgeCount(unreadCount);

            return list;
        } catch (error) {
            console.error('Failed to update notifications:', error);
            return [];
        }
    }, []);

    // 포그라운드 메시지 처리
    const handleForegroundMessage = useCallback(async (remoteMessage) => {
        try {
            console.log('Foreground message:', remoteMessage.messageId);

            await updateNotifications();

            if (remoteMessage.notification) {
                const notificationId = String(
                    remoteMessage.messageId ||
                    remoteMessage?.data?.notificationId ||
                    ''
                );

                if (!notificationId || isDuplicate(notificationId)) return;

                await notifee.displayNotification({
                    id: notificationId,
                    title: remoteMessage.notification.title,
                    body: remoteMessage.notification.body,
                    data: remoteMessage.data,
                    android: {
                        channelId: 'default',
                        pressAction: { id: 'default' },
                    },
                    ios: {
                        foregroundPresentationOptions: {
                            badge: true,
                            sound: true,
                            banner: true,
                            list: true,
                        },
                    },
                });
            }
        } catch (error) {
            console.error('Error handling foreground message:', error);
        }
    }, [updateNotifications, isDuplicate]);

    // 백그라운드/종료 상태에서 알림으로 앱 열기
    const handleBackgroundNotification = useCallback(async (remoteMessage) => {
        try {
            if (!remoteMessage) return;

            const runId = ++currentRunId.current;
            const { screen, id, notificationId } = remoteMessage.data || {};

            if (screen && id && notificationId) {
                await updateNotifications();
                await markAsRead(notificationId);

                if (runId === currentRunId.current) {
                    router.push({
                        pathname: screen,
                        params: { from: 'noti', id }
                    });
                }
            }
        } catch (error) {
            console.error('Error handling background notification:', error);
        }
    }, [updateNotifications, router]);

    // 알림 클릭 처리
    const handleNotificationPress = useCallback(async (notification) => {
        if (notification?.data && !notificationHandled.current) {
            notificationHandled.current = true;

            try {
                const { screen, id, notificationId } = notification.data;

                if (screen && id && notificationId) {
                    await markAsRead(notificationId);
                    await updateNotifications();

                    router.push({
                        pathname: screen,
                        params: { from: 'noti', id }
                    });
                }
            } catch (error) {
                console.error('Error handling notification press:', error);
            } finally {
                notificationHandled.current = false;
            }
        }
    }, [updateNotifications, router]);

    // FCM 리스너 설정
    useEffect(() => {
        let isMounted = true;
        const unsubscribers = [];

        const setupNotifications = async () => {
            try {
                await refreshFCMToken();

                if (isMounted) {
                    // 포그라운드 메시지
                    unsubscribers.push(
                        messaging().onMessage(handleForegroundMessage)
                    );

                    // 백그라운드에서 앱 열기
                    unsubscribers.push(
                        messaging().onNotificationOpenedApp(handleBackgroundNotification)
                    );

                    // Notifee 포그라운드 이벤트
                    unsubscribers.push(
                        notifee.onForegroundEvent(({ type, detail }) => {
                            if (type === EventType.PRESS) {
                                handleNotificationPress(detail.notification);
                            }
                        })
                    );

                    // 종료 상태에서 알림으로 앱 열기
                    const initialNotification = await messaging().getInitialNotification();
                    if (initialNotification) {
                        handleBackgroundNotification(initialNotification);
                    }
                }
            } catch (error) {
                console.error('Error setting up notifications:', error);
            }
        };

        setupNotifications();

        return () => {
            isMounted = false;
            unsubscribers.forEach(unsub => {
                try {
                    if (typeof unsub === 'function') unsub();
                } catch (error) {
                    console.error('Error during unsubscribe:', error);
                }
            });
        };
    }, [handleForegroundMessage, handleBackgroundNotification, handleNotificationPress]);

    // 화면 포커스 시 알림 새로고침
    useFocusEffect(
        useCallback(() => {
            updateNotifications();
        }, [updateNotifications])
    );

    return {
        notifications,
        hasUnread,
        updateNotifications,
    };
};