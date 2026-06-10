import React, { useEffect, useState, createContext, useContext, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import { router } from 'expo-router';
import { logAppExit } from './api/s3_upload';
import { TokenManager } from './config';
import WebSocketService from './api/WebSocketService';

const AppStateContext = createContext();
const MESSAGE_CACHE_LIMIT = 50;

const ensureWebSocketConnected = async () => {
    try {
        const { accessToken } = await TokenManager.getTokens();
        const userData = await TokenManager.getUserData();
        if (!accessToken || !userData?.userName) return;

        const ws = new WebSocketService(router);
        if (ws.isConnected()) return;

        await ws.connect(userData.userName, accessToken);
        console.log('🔌 WebSocket auto-connected');
    } catch (error) {
        console.warn('WebSocket auto-connect failed:', error);
    }
};

// Append an incoming message DTO to the per-room AsyncStorage cache so the
// next time the user opens that chat room they see it instantly — regardless
// of whether chatscreen was mounted when the message arrived.
const appendToRoomCache = async (incomingMessage) => {
    try {
        const roomId = incomingMessage?.chatRoomId;
        if (!roomId) return;
        const key = `chat:${roomId}:messages`;
        const raw = await AsyncStorage.getItem(key);
        const existing = raw ? (JSON.parse(raw) || []) : [];

        // Dedup by server id (or clientId fallback)
        const incomingId = incomingMessage.id;
        if (incomingId && existing.some(m => m.id === incomingId)) return;

        const next = [...existing, incomingMessage].slice(-MESSAGE_CACHE_LIMIT);
        await AsyncStorage.setItem(key, JSON.stringify(next));
    } catch (error) {
        // cache failures should never break runtime
        console.warn('appendToRoomCache failed:', error);
    }
};

const AppStateHandler = ({ children }) => {
    const user = useSelector((state) => state.user.data);
    const location = useSelector((state) => state.location.data);
    const [lastUsedFeature, setLastUsedFeature] = useState('');
    const cacheSubscriptionRef = useRef(null);

    const attachGlobalCacheSubscription = async () => {
        try {
            await ensureWebSocketConnected();

            const userData = await TokenManager.getUserData();
            if (!userData?.id) return;

            const ws = new WebSocketService(router);
            if (!ws.isConnected()) return;

            if (cacheSubscriptionRef.current) {
                cacheSubscriptionRef.current.unsubscribe();
            }
            cacheSubscriptionRef.current = ws.subscribeToChatList(
                userData.id,
                (incomingMessage) => { appendToRoomCache(incomingMessage); }
            );
        } catch (error) {
            console.warn('Global chat cache subscription failed:', error);
        }
    };

    // Global background cache of incoming messages per room.
    useEffect(() => {
        attachGlobalCacheSubscription();
        return () => {
            if (cacheSubscriptionRef.current) {
                cacheSubscriptionRef.current.unsubscribe();
                cacheSubscriptionRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const handleAppStateChange = (nextAppState) => {
            console.log(`AppState changed to ${nextAppState}`);
            if (nextAppState === 'background' || nextAppState === 'inactive') {
                if (user && location) {
                    console.log('Logging app exit', { userId: user.userId, location, lastUsedFeature });
                    logAppExit(user.userId, location, lastUsedFeature);
                }
            }
            if (nextAppState === 'active') {
                // WS may have been torn down in background; reconnect and re-attach
                attachGlobalCacheSubscription();
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
        };
    }, [user, location, lastUsedFeature]);

    return (
        <AppStateContext.Provider value={setLastUsedFeature}>
            {children}
        </AppStateContext.Provider>
    );
};

export const useAppState = () => useContext(AppStateContext);

export default AppStateHandler;