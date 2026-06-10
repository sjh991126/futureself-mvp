import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import WebSocketService from '../api/WebSocketService';
import { TokenManager } from '../config';
import { useAiJobStore } from '../state/aiJobStore';
import { pollAiResult } from '../api/aiGenerate';

const SUBSCRIBE_RETRY_MS = 2000;
const POLL_INITIAL_DELAY_MS = 800;

/**
 * UI 없는 브릿지. 로그인 사용자에 대해 WebSocket 연결을 보장하고
 * AI 결과 채널을 구독해서 store에 반영한다.
 *
 * - 토큰이 있으면 connect, isConnected 폴링으로 subscribeToAiResult 보장.
 * - WS 재연결되면 기존 구독이 끊기므로 isConnected 변화에 다시 구독한다.
 * - AppState가 active로 돌아오면 pending job마다 폴링으로 결과 보강.
 *
 * 알림 inbox(/user/queue/notifications) 구독은 NotificationsBridge가 독립적으로
 * 담당. AI store 상태 변동과 알림 채널 구독을 격리해 한쪽이 깨져도 다른 쪽이 안전.
 */
const AiResultBridge = () => {
    const { jobs, complete, fail } = useAiJobStore();
    const subscriptionRef = useRef(null);
    const wsRef = useRef(null);
    const jobsRef = useRef(jobs);
    jobsRef.current = jobs;

    useEffect(() => {
        let cancelled = false;
        let connectTimer = null;
        let subscribeTimer = null;

        const ws = new WebSocketService(router);
        wsRef.current = ws;

        const handleAiMessage = (payload) => {
            if (!payload || !payload.requestId) return;
            const { requestId, status, result, error, type } = payload;
            if (status === 'COMPLETE') {
                complete(requestId, result, type);
            } else if (status === 'FAILED') {
                fail(requestId, error || 'AI processing failed', type);
            }
        };

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
            subscriptionRef.current = ws.subscribeToAiResult(handleAiMessage);
            // 끊김 감지를 위해 주기적으로 다시 확인 (가벼운 polling)
            subscribeTimer = setTimeout(checkAndResubscribe, SUBSCRIBE_RETRY_MS);
        };

        const checkAndResubscribe = () => {
            if (cancelled) return;
            if (!ws.isConnected()) {
                subscriptionRef.current = null;
                ensureConnectedAndSubscribed();
                return;
            }
            subscribeTimer = setTimeout(checkAndResubscribe, SUBSCRIBE_RETRY_MS);
        };

        const ensureConnectedAndSubscribed = async () => {
            if (cancelled) return;
            try {
                const userData = await TokenManager.getUserData();
                const token = await TokenManager.getAccessToken();
                if (!userData?.userName || !token) {
                    connectTimer = setTimeout(ensureConnectedAndSubscribed, SUBSCRIBE_RETRY_MS);
                    return;
                }
                if (!ws.isConnected()) {
                    try {
                        await ws.connect(userData.userName, token);
                    } catch (_) {
                        // onError 내부에서 재연결 트리거. 우리는 다음 틱에 다시 시도.
                        connectTimer = setTimeout(ensureConnectedAndSubscribed, SUBSCRIBE_RETRY_MS);
                        return;
                    }
                }
                ensureSubscribed();
            } catch (e) {
                connectTimer = setTimeout(ensureConnectedAndSubscribed, SUBSCRIBE_RETRY_MS);
            }
        };

        ensureConnectedAndSubscribed();

        // AppState foreground 복귀 시 pending 잡 폴링으로 보강
        const onAppStateChange = (next) => {
            if (next !== 'active') return;
            const pending = Object.entries(jobsRef.current)
                .filter(([, j]) => j.status === 'pending');
            pending.forEach(([requestId, job], idx) => {
                setTimeout(async () => {
                    try {
                        const result = await pollAiResult(requestId);
                        complete(requestId, result, job.type);
                    } catch (err) {
                        if (err?.response?.status === 404) {
                            // 아직 처리 중 — 그대로 둠
                            return;
                        }
                        fail(requestId, err?.response?.data?.error || err?.message || 'POLL_FAILED', job.type);
                    }
                }, POLL_INITIAL_DELAY_MS + idx * 300);
            });
            // WS 재연결도 한 번 트리거
            ensureConnectedAndSubscribed();
        };

        const sub = AppState.addEventListener('change', onAppStateChange);

        return () => {
            cancelled = true;
            if (connectTimer) clearTimeout(connectTimer);
            if (subscribeTimer) clearTimeout(subscribeTimer);
            if (subscriptionRef.current) {
                try {
                    subscriptionRef.current.unsubscribe();
                } catch (_) {}
                subscriptionRef.current = null;
            }
            sub.remove();
        };
    }, [complete, fail]);

    return null;
};

export default AiResultBridge;
