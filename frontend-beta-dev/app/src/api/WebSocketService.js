import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import { Alert } from 'react-native';
import { API_BASE_URL, TokenManager } from '../config';

let webSocketService = null;

class WebSocketService {
    constructor(router) {
        if (webSocketService) {
            return webSocketService;
        }
        this.stompClient = null;
        this.username = null;
        this.token = null;
        this.router = router;
        this.chatSubscriptions = new Map();
        this.isConnecting = false;
        webSocketService = this;
    }

    // Connect to WebSocket server with username and token
    // WebSocketService.js - Replace the connect method
    connect(username, token) {
        if (this.isConnecting) {
            console.warn('⚠️ Connection already in progress');
            return Promise.reject(new Error('Connection in progress'));
        }

        if (this.stompClient && this.stompClient.connected) {
            console.warn('⚠️ Already connected');
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            this.username = username;
            this.token = token;
            this.isConnecting = true;

            const socketUrl = `${API_BASE_URL}/ws?token=${token}`;
            const socket = new SockJS(socketUrl);

            // Store socket reference
            this.socket = socket;

            this.stompClient = Stomp.over(() => socket);

            // Disable debug logs in production
            this.stompClient.debug = __DEV__ ? console.log : () => { };

            console.log('Attempting to connect to WebSocket URL:', socketUrl);

            this.stompClient.connect(
                { 'Authorization': `Bearer ${token}` },
                (frame) => {
                    console.log('✅ WebSocket Connected');
                    this.isConnecting = false;
                    this.subscribeToLogout();
                    resolve(frame);
                },
                (error) => {
                    console.error('❌ WebSocket Connection Error:', error);
                    this.isConnecting = false;
                    this.onError(error);
                    reject(error);
                }
            );

            socket.onclose = (event) => {
                console.log('WebSocket closed:', event.code, event.reason);
                this.isConnecting = false;

                // Only attempt reconnect for abnormal closures
                if (event.code !== 1000 && event.code !== 1001) {
                    console.log('Abnormal closure detected, will attempt reconnect');
                }
            };

            socket.onerror = (event) => {
                console.error('WebSocket error:', event);
                this.isConnecting = false;
            };
        });
    }

    updateToken(newToken) {
        this.token = newToken;
        console.log('🔄 WebSocket token updated');
    }

    async reconnect() {
        if (!this.username) {
            console.error('Cannot reconnect: username not set');
            return;
        }

        try {
            const { accessToken } = await TokenManager.getTokens();
            if (!accessToken) {
                throw new Error('No access token available for reconnect');
            }

            // 기존 연결 종료
            if (this.stompClient && this.stompClient.connected) {
                console.log('Disconnecting existing connection before reconnect');
                this.stompClient.disconnect();
            }

            // 새 토큰으로 재연결
            this.connect(this.username, accessToken);

        } catch (error) {
            console.error('Failed to reconnect WebSocket:', error);
            throw error;
        }
    }

    async sendOneTimeMessage(roomId, message) {
        const token = await TokenManager.getAccessToken();

        if (this.isConnected()) {
            console.log('Using existing connection for one-time message');
            this.sendChatMessage(roomId, message);
            return Promise.resolve();
        }

        console.log('Creating temporary connection for one-time message');

        return new Promise((resolve, reject) => {
            const socketUrl = `${API_BASE_URL}/ws?token=${token}`;
            const socket = new SockJS(socketUrl);
            const tempClient = Stomp.over(() => socket);

            tempClient.connect(
                { 'Authorization': `Bearer ${token}` },
                () => {
                    console.log('✅ Temporary connection established');

                    // 헤더와 body 순서 수정
                    tempClient.send(
                        `/app/chat.send/${roomId}`,
                        {
                            'Authorization': `Bearer ${token}`,
                            'content-type': 'application/json'
                        },
                        JSON.stringify(message)  // 문자열로 변환
                    );

                    setTimeout(() => {
                        tempClient.disconnect();
                        socket.close();
                        console.log('🔌 Temporary connection closed');
                        resolve();
                    }, 1000);
                },
                (error) => {
                    console.error('❌ Temporary connection failed:', error);
                    reject(error);
                }
            );

            setTimeout(() => {
                if (!tempClient.connected) {
                    reject(new Error('Connection timeout'));
                }
            }, 10000);
        });
    }

    // Subscribe to the logout topic for the current user
    subscribeToLogout() {
        if (!this.username || !this.stompClient || !this.stompClient.connected) {
            console.warn('Cannot subscribe to logout: not connected');
            return;
        }

        // Backend는 `/topic/logout.{username}` (점)으로 send (WebSocketController.java).
        // RabbitMQ STOMP relay는 점 표기를 routing key로 처리하므로 같은 표기로 SUBSCRIBE 해야 함.
        const destination = `/topic/logout.${this.username}`;
        console.log(`📢 Subscribing to ${destination}`);

        this.stompClient.subscribe(
            destination,
            (message) => {
                console.log('Logout message received:', message.body);
                if (message.body === 'LOGOUT') {
                    this.handleForcedLogout();
                }
            }
        );
    }

    subscribeToChatRoom(roomId, onMessage) {
        if (!this.stompClient || !this.stompClient.connected) {
            throw new Error('WebSocket not connected');
        }

        // 이미 구독 중이면 중복 방지
        if (this.chatSubscriptions.has(roomId)) {
            console.warn(`Already subscribed to room ${roomId}`);
            return this.chatSubscriptions.get(roomId);
        }

        const destination = `/topic/chat.${roomId}`;
        console.log(`Subscribing to chat room: ${destination}`);

        const subscription = this.stompClient.subscribe(
            destination,
            (message) => {
                try {
                    const receivedMessage = JSON.parse(message.body);
                    onMessage(receivedMessage);
                } catch (error) {
                    console.error('Error parsing chat message:', error);
                }
            }
        );

        this.chatSubscriptions.set(roomId, subscription);
        return subscription;
    }

    unsubscribeFromChatRoom(roomId) {
        const subscription = this.chatSubscriptions.get(roomId);
        if (subscription) {
            subscription.unsubscribe();
            this.chatSubscriptions.delete(roomId);
            console.log(`Unsubscribed from chat room: ${roomId}`);
        }
    }

    /**
     * 알림 inbox 실시간 채널. 모든 알림 생성/갱신 시 backend NotificationService가
     * `/user/queue/notifications`로 NotificationResponseDto를 push한다.
     * 클라는 id 기준 upsert(같은 id면 in-place 갱신, 없으면 prepend)로 list 유지.
     */
    subscribeToNotifications(onMessage) {
        if (!this.stompClient || !this.stompClient.connected) {
            console.warn('Cannot subscribe to notifications: not connected');
            return null;
        }
        const destination = '/user/queue/notifications';
        console.log(`Subscribing to ${destination}`);
        return this.stompClient.subscribe(destination, (frame) => {
            try {
                onMessage(JSON.parse(frame.body));
            } catch (error) {
                console.error('Error parsing notification message:', error);
            }
        });
    }

    subscribeToChatRead(roomId, onUpdate) {
        if (!this.stompClient || !this.stompClient.connected) {
            console.warn('Cannot subscribe to chat-read: not connected');
            return null;
        }

        const destination = `/topic/chat-read.${roomId}`;
        console.log(`👁️ Subscribing to chat-read: ${destination}`);

        return this.stompClient.subscribe(destination, (frame) => {
            try {
                onUpdate(JSON.parse(frame.body));
            } catch (error) {
                console.error('Error parsing chat-read message:', error);
            }
        });
    }

    /**
     * AI 비동기 트립리스트 결과 채널.
     * 백엔드는 SimpMessagingTemplate#convertAndSendToUser(username, "/queue/ai.result", payload)로 보내므로
     * 클라는 user-destination prefix를 붙여 `/user/queue/ai.result`를 구독한다.
     *
     * 페이로드: { requestId, type: 'general' | 'instant', status: 'COMPLETE' | 'FAILED', result?, error? }
     */
    subscribeToAiResult(onMessage) {
        if (!this.stompClient || !this.stompClient.connected) {
            console.warn('Cannot subscribe to ai.result: not connected');
            return null;
        }

        const destination = '/user/queue/ai.result';
        console.log(`Subscribing to ${destination}`);

        return this.stompClient.subscribe(destination, (frame) => {
            try {
                onMessage(JSON.parse(frame.body));
            } catch (error) {
                console.error('Error parsing ai.result message:', error);
            }
        });
    }

    subscribeToChatList(userId, onUpdate) {
        if (!this.stompClient || !this.stompClient.connected) {
            console.warn('Cannot subscribe to chat list: not connected');
            return null;
        }

        const destination = `/topic/chat-list.${userId}`;
        console.log(`📋 Subscribing to chat list: ${destination}`);

        return this.stompClient.subscribe(destination, (frame) => {
            try {
                onUpdate(JSON.parse(frame.body));
            } catch (error) {
                console.error('Error parsing chat-list message:', error);
            }
        });
    }

    sendChatMessage(roomId, message) {
        if (!this.stompClient || !this.stompClient.connected) {
            throw new Error('WebSocket not connected');
        }

        // 1. 메시지 객체 정리
        const messagePayload = {
            clientId: message.clientId || null,
            content: message.content || '',
            timestamp: message.timestamp || new Date().toISOString(),
            type: message.type || 'text',
            imageUrls: message.imageUrls || null,
            placeData: message.placeData || null,
            tripData: message.tripData || null
        };

        console.log('📤 Sending message:', messagePayload);

        try {
            // 2. JSON 문자열로 변환
            const jsonBody = JSON.stringify(messagePayload);

            console.log('📤 JSON body:', jsonBody);

            // 3. STOMP send() - body는 문자열, headers는 객체
            this.stompClient.send(
                `/app/chat.send/${roomId}`,
                {
                    'Authorization': `Bearer ${this.token}`,
                    'content-type': 'application/json'
                },
                jsonBody  // 세 번째 인자가 body (문자열)
            );

            console.log('✅ Message sent successfully');
        } catch (error) {
            console.error('❌ Failed to send message:', error);
            throw error;
        }
    }

    // Handle forced logout when the message is received
    async handleForcedLogout() {
        console.log('Forced logout triggered');

        await TokenManager.clearTokens();

        if (this.stompClient && this.stompClient.connected) {
            this.stompClient.disconnect(() => {
                console.log('Disconnected after forced logout');
            });
        }

        Alert.alert(
            'Session Expired',
            'Your account has been logged in from another device.',
            [{
                text: 'OK',
                onPress: () => this.router.push('/login')
            }]
        );
    }

    // Handle WebSocket connection errors and attempt to reconnect
    async onError(error) {
        console.error('WebSocket Error:', error);

        // 인증 에러 체크
        const isAuthError =
            error?.command === 'ERROR' &&
            (error?.headers?.message?.includes('401') ||
                error?.headers?.message?.includes('403') ||
                error?.headers?.message?.includes('Unauthorized'));

        if (isAuthError) {
            console.log('Auth error detected, attempting token refresh...');

            try {
                await TokenManager.refreshAccessToken();
                await this.reconnect();
                console.log('Reconnected with new token');
                return;
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
                this.handleForcedLogout();
                return;
            }
        }

        // 일반 에러는 5초 후 재연결
        if (this.username && this.token) {
            console.log('Attempting to reconnect in 5s...');
            setTimeout(() => this.reconnect(), 5000);
        }
    }

    isConnected() {
        return this.stompClient && this.stompClient.connected;
    }

    disconnect() {
        // 모든 채팅방 구독 해제
        this.chatSubscriptions.forEach((subscription, roomId) => {
            subscription.unsubscribe();
            console.log(`Unsubscribed from room ${roomId}`);
        });
        this.chatSubscriptions.clear();

        if (this.stompClient && this.stompClient.connected) {
            this.stompClient.disconnect(() => {
                console.log("WebSocket Disconnected");
            });
        }

        this.stompClient = null;
        this.isConnecting = false;
    }
}

export default WebSocketService;
