import { useEffect, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { router } from 'expo-router';
import WebSocketService from '../api/WebSocketService';

const SUBSCRIBE_RETRY_MS = 1500;
export const NOTIFICATION_EVENT = 'trippy:notification';

/**
 * UI 없는 브릿지. 알림 inbox 채널(/user/queue/notifications)을 root에서 항상 활성화한다.
 * notification 화면이 mount/unmount되며 subscription이 흔들리는 race를 막기 위해
 * subscribe는 root에서 한 번 걸어두고, 메시지는 DeviceEventEmitter로 화면에 전달한다.
 */
const NotificationsBridge = () => {
    const subscriptionRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        let connectTimer = null;
        let subscribeTimer = null;

        const ws = new WebSocketService(router);

        const ensureSubscribed = () => {
            if (cancelled) return;
            if (!ws.isConnected()) {
                subscribeTimer = setTimeout(ensureSubscribed, SUBSCRIBE_RETRY_MS);
                return;
            }
            if (subscriptionRef.current) {
                try { subscriptionRef.current.unsubscribe(); } catch (_) {}
                subscriptionRef.current = null;
            }
            subscriptionRef.current = ws.subscribeToNotifications((incoming) => {
                DeviceEventEmitter.emit(NOTIFICATION_EVENT, incoming);
            });
            // 끊김 감지 위해 가벼운 polling으로 connection 상태 확인 후 재구독
            subscribeTimer = setTimeout(checkAndResubscribe, SUBSCRIBE_RETRY_MS);
        };

        const checkAndResubscribe = () => {
            if (cancelled) return;
            if (!ws.isConnected()) {
                subscriptionRef.current = null;
                ensureSubscribed();
                return;
            }
            subscribeTimer = setTimeout(checkAndResubscribe, SUBSCRIBE_RETRY_MS);
        };

        ensureSubscribed();

        return () => {
            cancelled = true;
            if (connectTimer) clearTimeout(connectTimer);
            if (subscribeTimer) clearTimeout(subscribeTimer);
            if (subscriptionRef.current) {
                try { subscriptionRef.current.unsubscribe(); } catch (_) {}
                subscriptionRef.current = null;
            }
        };
    }, []);

    return null;
};

export default NotificationsBridge;
