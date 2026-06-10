import * as SecureStore from 'expo-secure-store';
import SockJS from 'sockjs-client';
import webstomp from 'webstomp-client';
import api, { API_BASE_URL, TokenManager } from '../config';
import { endpoints } from './endpoints';

// create chatroom
export const createChatRoom = async (chatRoomRequest) => {
    console.log("Chat Room Request Data:", chatRoomRequest);
    try {
        const response = await api.post(endpoints.chat('/room'), chatRoomRequest);
        return response.data;
    } catch (error) {
        console.error('Error creating chat room:', error);
        throw error;
    }
};

// Function to add participants to a chat room
export const addParticipants = async (roomId, participantIds) => {
    try {
        const response = await api.post(
            endpoints.chat(`/room/${roomId}/add-participants`),
            participantIds
        );

        if (response.status === 200) {
            console.log('Updated Chat Room:', response.data);
            return response.data;
        } else {
            throw new Error('Failed to add participants');
        }
    } catch (error) {
        console.error('Error adding participants:', error);
        throw error;
    }
};

export const getChatRoomByTripListId = async (tripListId) => {
    try {
        const response = await api.get(endpoints.chat(`/room/${tripListId}`));

        if (response.status === 200) {
            console.log('Chat room retrieved:', response.data);
            return response.data;
        } else {
            throw new Error('Failed to retrieve chat room');
        }
    } catch (error) {
        console.error('Error retrieving chat room:', error);
        throw error;
    }
};

export const createOrGetDirectMessageRoom = async (otherUserId) => {
    try {
        // First try to get an existing DM room
        const response = await api.get(endpoints.chatDirect(`/${otherUserId}`));

        // If a room exists, return it
        if (response.data && response.data.roomId) {
            return response.data;
        }

        // If no room exists, create one
        const createResponse = await api.post(endpoints.chatDirect(), {
            otherUserId: otherUserId
        });

        return createResponse.data;
    } catch (error) {
        // If the error is 404, it means no room exists, so create one
        if (error.response && error.response.status === 404) {
            try {
                const createResponse = await api.post(endpoints.chatDirect(), {
                    otherUserId: otherUserId
                });
                console.log("chat response:", createResponse.data);
                return createResponse.data;
            } catch (createError) {
                console.error('Error creating direct message room:', createError);
                throw createError;
            }
        }

        console.error('Error getting or creating direct message room:', error);
        throw error;
    }
};

export const getChatLogs = async () => {
    try {
        const response = await api.get(endpoints.chat('/logs'));
        return response.data;
    } catch (error) {
        console.error('Error fetching chat logs:', error);
        throw error;
    }
};

export const markAsRead = async (roomId) => {
    try {
        await api.post(endpoints.chat(`/rooms/${roomId}/read`), null);
    } catch (error) {
        console.error('Error marking messages as read:', error);
        throw error;
    }
};

// 채팅 히스토리 불러오기
export const loadChatHistory = async (roomId, page = 1, size = 20) => {
    try {
        const response = await api.get(endpoints.chat(`/history/${roomId}`), {
            params: { page, size }
        });
        return response.data;
    } catch (error) {
        console.error('Error loading chat history:', {
            roomId,
            page,
            size,
            status: error.response?.status,
            message: error.response?.data?.message || error.message
        });
        throw error;
    }
};

export const loadChatSummary = async (roomId) => {
    try {
        const response = await api.get(endpoints.rooms(`/${roomId}/summary`));
        return response.data;
    } catch (error) {
        console.error('Error loading chat summary:', error);
        throw error;
    }
};

// 이미지 업로드
export const uploadImages = async (formData) => {
    try {
        const { accessToken, refreshToken } = await TokenManager.getTokens();
        if (!accessToken) {
            throw new Error('No access token available');
        }

        // 헤더 설정
        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            // multipart/form-data는 브라우저가 자동 설정하므로 제거
        };

        // Refresh Token이 있으면 추가
        if (refreshToken) {
            headers['Refresh-Token'] = `Bearer ${refreshToken}`;
        }

        const response = await fetch(`${API_BASE_URL}${endpoints.images('/upload-chat')}`, {
            method: 'POST',
            headers: headers,
            body: formData
        });

        // 토큰 갱신 확인
        if (response.headers.get('token-refreshed') === 'true') {
            const newAccessToken = response.headers.get('authorization');
            if (newAccessToken) {
                await TokenManager.updateStoredToken(newAccessToken.replace('Bearer ', ''));
                console.log('Access token이 자동 갱신되었습니다 (image upload)');
            }
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed: ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error uploading images:', error);
        throw error;
    }
};

const cleanToken = (token) => {
    if (!token) return null;
    return token.startsWith('Bearer ') ? token.substring(7) : token;
};

export const setupWebSocket = async () => {
    try {
        console.log('Initializing SockJS WebSocket connection...');

        // 안전한 토큰 가져오기
        let accessToken = await TokenManager.getAccessTokenSafely();
        if (!accessToken) {
            throw new Error('No access token available for WebSocket connection');
        }

        // 토큰 정리 (Bearer 접두사 제거)
        accessToken = cleanToken(accessToken);

        // 토큰 만료 임박 확인 및 갱신
        const isExpiringSoon = await TokenManager.isTokenExpiringSoon();
        if (isExpiringSoon) {
            console.log('Token expiring soon, attempting refresh...');
            try {
                const newToken = await TokenManager.refreshAccessToken();
                accessToken = cleanToken(newToken);
                console.log('Token refreshed successfully for WebSocket');
            } catch (refreshError) {
                console.warn('Token refresh failed, using current token:', refreshError.message);
            }
        }

        console.log('Creating SockJS connection');
        // SockJS 사용
        const socketUrl = `${API_BASE_URL}/ws?token=${accessToken}`;
        const socket = new SockJS(socketUrl);

        socket.onopen = () => {
            console.log('✅ SockJS connection opened successfully');
        };

        socket.onerror = (error) => {
            console.error('❌ SockJS error:', error);
        };

        socket.onclose = (event) => {
            console.log('SockJS closed:', {
                code: event.code,
                reason: event.reason,
                wasClean: event.wasClean
            });
        };

        return socket;
    } catch (error) {
        console.error('Error setting up SockJS:', error);
        throw error;
    }
};

// STOMP 클라이언트 설정
export const setupStompClient = async (socket, callbacks) => {
    const { onConnect, onError, onClose } = callbacks;

    try {
        // 최신 토큰 가져오기
        const { accessToken, refreshToken } = await TokenManager.getTokens();
        if (!accessToken) {
            throw new Error('No access token available for STOMP connection');
        }

        console.log('Setting up STOMP client with fresh tokens');

        const stompClient = webstomp.over(socket, {
            debug: false,
            protocols: ['v12.stomp'],
            heartbeat: {
                outgoing: 20000,
                incoming: 20000
            }
        });

        // STOMP 헤더에 정리된 토큰 추가
        const cleanAccessToken = cleanToken(accessToken);
        const cleanRefreshToken = refreshToken ? cleanToken(refreshToken) : null;

        const headers = {
            'Authorization': `Bearer ${cleanAccessToken}`,
        };

        if (cleanRefreshToken) {
            headers['Refresh-Token'] = `Bearer ${cleanRefreshToken}`;
        }

        // Device-Id 헤더 추가
        try {
            const deviceId = await getOrCreateDeviceId();
            headers['Device-Id'] = deviceId;
        } catch (error) {
            console.warn('Failed to get device ID for STOMP:', error);
        }

        console.log('STOMP headers prepared:', {
            hasAuth: !!headers.Authorization,
            hasRefresh: !!headers['Refresh-Token'],
            hasDeviceId: !!headers['Device-Id']
        });

        // STOMP 연결
        stompClient.connect(
            headers,
            (frame) => {
                console.log('STOMP connected successfully');
                onConnect(frame);
            },
            (error) => {
                console.error('STOMP connection error:', {
                    message: error?.message,
                    command: error?.command,
                    headers: error?.headers
                });

                const isAuthError =
                    error?.command === 'ERROR' &&
                    (error?.headers?.message?.includes('401') ||
                        error?.headers?.message?.includes('403') ||
                        error?.headers?.message?.includes('Unauthorized') ||
                        error?.message?.includes('401') ||
                        error?.message?.includes('403'));

                if (isAuthError) {
                    console.log('🔐 Authentication error detected');
                    onError({ type: 'AUTH_ERROR', originalError: error });
                } else {
                    console.log('🔌 Connection error detected');
                    onError({ type: 'CONNECTION_ERROR', originalError: error });
                }
            }
        );

        // WebSocket 이벤트 재정의
        socket.onclose = (event) => {
            console.log('WebSocket closed:', {
                code: event.code,
                reason: event.reason,
                wasClean: event.wasClean
            });

            // 1006은 비정상 종료, 보통 네트워크 문제
            if (event.code === 1006 && event.reason?.includes('401')) {
                onError({ type: 'AUTH_ERROR', originalError: event });
            } else {
                onClose(event);
            }
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', {
                type: error.type,
                message: error.message,
                target: error.target?.readyState
            });

            if (error.message?.includes('401') || error.message?.includes('403')) {
                onError({ type: 'AUTH_ERROR', originalError: error });
            } else {
                onError({ type: 'CONNECTION_ERROR', originalError: error });
            }
        };

        return stompClient;
    } catch (error) {
        console.error('Error setting up STOMP client:', error);
        throw error;
    }
};

// Device ID 헬퍼 함수
const getOrCreateDeviceId = async () => {
    try {
        let deviceId = await SecureStore.getItemAsync('deviceId');
        if (!deviceId) {
            deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await SecureStore.setItemAsync('deviceId', deviceId);
        }
        return deviceId;
    } catch (error) {
        console.error('Failed to get device ID:', error);
        return `device_${Date.now()}`;
    }
};


export const sendMessage = async (stompClient, roomId, message) => {
    try {
        if (!stompClient || !stompClient.connected) {
            throw new Error('STOMP client is not connected');
        }

        console.log('Sending message to room:', roomId);
        console.log('Message content:', message);

        stompClient.send(
            `/app/chat.send/${roomId}`,
            {
                'content-type': 'application/json'
            },
            JSON.stringify(message)
        );

        console.log('Message sent successfully');
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};


// 토큰 갱신 후 WebSocket 재연결 헬퍼 함수
export const reconnectWebSocketWithNewToken = async (callbacks) => {
    try {
        console.log('Reconnecting WebSocket with refreshed token...');

        // 토큰 갱신
        await TokenManager.refreshAccessToken();

        // 새로운 WebSocket 연결
        const socket = await setupWebSocket();
        const stompClient = await setupStompClient(socket, callbacks);

        return { socket, stompClient };
    } catch (error) {
        console.error('Error reconnecting WebSocket:', error);
        throw error;
    }
};

// WebSocket 연결 상태 확인
export const checkWebSocketConnection = (socket) => {
    if (!socket) return 'NO_SOCKET';

    switch (socket.readyState) {
        case WebSocket.CONNECTING:
            return 'CONNECTING';
        case WebSocket.OPEN:
            return 'OPEN';
        case WebSocket.CLOSING:
            return 'CLOSING';
        case WebSocket.CLOSED:
            return 'CLOSED';
        default:
            return 'UNKNOWN';
    }
};
