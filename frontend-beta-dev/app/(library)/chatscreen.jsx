import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View,
    Animated,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    FlatList,
    StyleSheet,
    Alert,
    ActivityIndicator,
    SafeAreaView,
    Image,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    Platform,
    Keyboard,
    Modal,
    LayoutAnimation,
    UIManager
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TokenManager } from '../src/config';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import * as chatService from './../src/api/chat';
import moment from 'moment';
import { Svg, Path } from 'react-native-svg';
import ChatArchives from '../../assets/components/chatArchives';
import WebSocketService from '../src/api/WebSocketService';

const MessageTail = ({ isOwnMessage, color, isFailed }) => (
    <Svg
        width={20}
        height={14}
        viewBox="0 0 20 14"
        style={[
            styles.tail,
            isOwnMessage ? styles.ownTail : styles.otherTail,
            isFailed && styles.failedTail
        ]}
    >
        <Path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M15.7717 0.103516H0.743164C0.743164 7.8355 7.01118 14.1035 14.7432 14.1035H20.7432V13.7744C19.312 12.5732 18.1274 11.0906 17.2694 9.40675C16.147 7.20384 15.8502 4.50008 15.7717 0.103516Z"
            fill={color}
            opacity={1}
        />
    </Svg>
);

const TripListCard = ({ trip, isOwnMessage }) => {
    const dateRange = trip.startDate === trip.endDate
        ? moment(trip.startDate).format('MMM D, YYYY')
        : `${moment(trip.startDate).format('MMM D')} - ${moment(trip.endDate).format('MMM D, YYYY')}`;

    return (
        <View style={[
            styles.tripListCardContainer,
            isOwnMessage ? styles.ownTripCard : styles.otherTripCard
        ]}>
            <ExpoImage
                source={{ uri: trip.imageUrl }}
                style={styles.tripCardImage}
                placeholder={require('../../assets/logo_black.png')}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={150}
            />
            <View style={styles.tripCardGradient}>
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,0.9)']}
                    style={styles.tripCardOverlay}
                >
                    <View style={styles.tripCardContent}>
                        <Text style={styles.tripCardName} numberOfLines={1}>
                            {trip.name}
                        </Text>
                        <View style={styles.tripCardStats}>
                            <View style={styles.statItem}>
                                <Ionicons name="location" size={14} color="#fff" />
                                <Text style={styles.statText}>
                                    {trip.totalPlaces} {trip.totalPlaces === 1 ? 'place' : 'places'}
                                </Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Ionicons name="calendar" size={14} color="#fff" />
                                <Text style={styles.statText}>
                                    {trip.totalDays} {trip.totalDays === 1 ? 'day' : 'days'}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.tripCardFooter}>
                            <View style={styles.userInfo}>
                                <ExpoImage
                                    source={{ uri: trip.user.imageUrl }}
                                    style={styles.userAvatar}
                                    placeholder={require('../../assets/logo_black.png')}
                                    contentFit="cover"
                                    cachePolicy="memory-disk"
                                />
                                <Text style={styles.userName}>
                                    {trip.user.userName}
                                </Text>
                            </View>
                            <Text style={styles.tripCardDate}>
                                {dateRange}
                            </Text>
                        </View>
                    </View>
                </LinearGradient>
            </View>
        </View>
    );
};

const PlaceCard = ({ place, isOwnMessage }) => {
    return (
        <View style={[
            styles.placeCardContainer,
            isOwnMessage ? styles.ownPlaceCard : styles.otherPlaceCard
        ]}>
            <ExpoImage
                source={{ uri: place.imageUrls[0] }}
                style={styles.placeImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={150}
            />
            <View style={styles.placeInfo}>
                <View style={styles.placeNameContainer}>
                    <View style={styles.titleRatingWrapper}>
                        <Text
                            style={styles.placeName}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {place.placeName}
                        </Text>
                        <Text style={styles.ratingDot}> · </Text>
                        <Text style={styles.placeRating}>{place.placeRating}</Text>
                        <Text style={styles.starIcon}>⭐</Text>
                    </View>
                </View>
                <Text
                    style={styles.placeAddress}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                >
                    {place.placeAddress}
                </Text>
            </View>
        </View>
    );
};

const ChatScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { roomId, roomName, isDirectMessage, otherUserId, otherUserName, otherUserImage } = params;
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const scrollViewRef = useRef(null);
    const [token, setToken] = useState(null);
    const [user, setUser] = useState('');
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const reconnectTimeoutRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedImageAspectRatio, setSelectedImageAspectRatio] = useState(1);
    const [showSend, setShowSend] = useState(false);
    const [infoModalVisible, setInfoModalVisible] = useState(false);
    const [chatSummary, setChatSummary] = useState(null);
    const [cachedMessages, setCachedMessages] = useState({});
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const [authRetryCount, setAuthRetryCount] = useState(0);
    const webSocketService = useRef(new WebSocketService(router)).current;
    const subscriptionRef = useRef(null);
    const readSubscriptionRef = useRef(null);
    const historyLoadInFlightRef = useRef(false);
    const MAX_AUTH_RETRIES = 3;

    const PAGE_SIZE = 20;
    const ICON_COLOR = '#6A93E6';

    const handleChangeText = (text) => {
        setMessage(text);
        setShowSend(text.length > 0);
    };
    const MAX_RECONNECT_ATTEMPTS = 5;
    const RECONNECT_INTERVAL = 3000;
    const resolvedRoomId = roomId || params.chatRoomId || params.id;
    const CACHE_KEY = resolvedRoomId ? `chat:${resolvedRoomId}:messages` : null;
    const CACHE_LIMIT = 50;

    // Hydrate from AsyncStorage so the screen paints instantly on re-entry.
    useEffect(() => {
        if (!CACHE_KEY) return;
        let cancelled = false;
        AsyncStorage.getItem(CACHE_KEY)
            .then(raw => {
                if (cancelled || !raw) return;
                try {
                    const cached = JSON.parse(raw);
                    if (Array.isArray(cached) && cached.length) {
                        setMessages(cached);
                        setIsLoading(false);
                    }
                } catch { /* corrupt cache */ }
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [CACHE_KEY]);

    // Persist recent messages. Exclude pending/failed so tempIds don't leak
    // into cache and produce duplicate bubbles on re-entry.
    useEffect(() => {
        if (!CACHE_KEY || !Array.isArray(messages) || messages.length === 0) return;
        const persisted = messages.filter(m => !m?.pending && !m?.failed);
        if (persisted.length === 0) return;
        const recent = persisted.slice(-CACHE_LIMIT);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(recent)).catch(() => {});
    }, [messages, CACHE_KEY]);

    useEffect(() => {
        const checkUser = async () => {
            try {
                const userData = await TokenManager.getUserData();
                if (userData) {
                    setUser(userData);
                }
            } catch (error) {
                console.error('Error retrieving user data or token:', error);
            }
        };
        checkUser();
    }, []);


    useEffect(() => {
        if (isDirectMessage && (!otherUserId || !otherUserName)) {
            console.error('DM chat room missing required params');
            Alert.alert(
                'Error',
                'Unable to load chat room. Please try again.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        }
    }, [isDirectMessage, otherUserId, otherUserName]);

    useEffect(() => {
        const initializeToken = async () => {
            try {
                const accessToken = await TokenManager.getAccessToken();
                setToken(accessToken);
            } catch (error) {
                console.error('Error retrieving token:', error);
                Alert.alert('Error', 'Failed to initialize chat session');
            }
        };
        initializeToken();
    }, []);

    const compressImage = async (asset) => {
        const actions = [];
        const { uri, width, height } = asset;

        if (width && height) {
            if (width >= height && width > 1080) {
                actions.push({ resize: { width: 1080 } });
            } else if (height > width && height > 1080) {
                actions.push({ resize: { height: 1080 } });
            }
        } else {
            actions.push({ resize: { width: 1080 } });
        }

        const result = await manipulateAsync(
            uri,
            actions,
            { compress: 0.7, format: SaveFormat.JPEG }
        );
        return result.uri;
    };

    // chatscreen.jsx - Replace loadChatHistory
    const loadChatHistory = useCallback(async (isInitial = true, pageNum = 1) => {
        if (!resolvedRoomId) {
            console.warn('No roomId available for loading chat history');
            setIsLoading(false);
            return;
        }

        if (!token) {
            console.warn('No token available for loading chat history');
            setIsLoading(false);
            return;
        }

        // Prevent duplicate loads
        if (isLoadingMore && !isInitial) {
            console.log('Already loading, skipping duplicate request');
            return;
        }

        // Check cache first for non-initial loads
        if (!isInitial && cachedMessages[resolvedRoomId]?.[pageNum]) {
            const cachedData = cachedMessages[resolvedRoomId][pageNum];
            setMessages(prev => {
                const newMessages = [...cachedData, ...prev];
                // Remove duplicates by message ID
                const uniqueMessages = Array.from(
                    new Map(newMessages.map(msg => [msg.id, msg])).values()
                ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                return uniqueMessages;
            });
            setIsLoadingMore(false);
            return;
        }

        try {
            setIsLoadingMore(true);
            const history = await chatService.loadChatHistory(resolvedRoomId, pageNum, PAGE_SIZE);

            if (!history?.messages) {
                console.warn('No messages returned from server');
                setHasMore(false);
                return;
            }

            const sortedHistory = history.messages
                .map(msg => ({
                    ...msg,
                    unreadCount: typeof msg.unreadCount === 'number' && !isNaN(msg.unreadCount)
                        ? msg.unreadCount
                        : 0
                }))
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));


            // Update cache
            setCachedMessages(prev => ({
                ...prev,
                [resolvedRoomId]: {
                    ...(prev[resolvedRoomId] || {}),
                    [pageNum]: sortedHistory
                }
            }));

            if (isInitial) {
                // Merge with any cache-hydrated messages so we don't shrink the
                // visible list (server returns a smaller page than the cache).
                setMessages(prev => {
                    const safePrev = Array.isArray(prev) ? prev : [];
                    const merged = new Map();
                    safePrev.forEach(m => { if (m?.id) merged.set(m.id, m); });
                    sortedHistory.forEach(m => { if (m?.id) merged.set(m.id, m); });
                    return Array.from(merged.values())
                        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                });
                setChatSummary(history.summary);
                setHasMore(sortedHistory.length === PAGE_SIZE);
            } else {
                setMessages(prev => {
                    const newMessages = [...sortedHistory, ...prev];
                    // Remove duplicates
                    const uniqueMessages = Array.from(
                        new Map(newMessages.map(msg => [msg.id, msg])).values()
                    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                    return uniqueMessages;
                });
                setHasMore(sortedHistory.length === PAGE_SIZE);
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
            setHasMore(false);
        } finally {
            setIsLoadingMore(false);
            if (isInitial) setIsLoading(false);
        }
    }, [resolvedRoomId, token, isLoadingMore, cachedMessages]);

    const loadChatSummary = useCallback(async () => {
        if (!token) return;
        try {
            const summary = await chatService.loadChatSummary(resolvedRoomId);
            console.log('summary', summary);

            setChatSummary(summary);

            setTimeout(() => {
                scrollViewRef.current?.scrollToOffset?.({ offset: 0, animated: false });
            }, 100);
        } catch (error) {
            Alert.alert('Error', 'Failed to load chat summary');
        } finally {
            setIsLoading(false);
        }
    }, [resolvedRoomId, token]);

    const loadMoreMessages = useCallback(() => {
        if (isLoadingMore || !hasMore) return;
        const nextPage = page + 1;
        setPage(nextPage);
        loadChatHistory(false, nextPage);
    }, [page, isLoadingMore, hasMore, loadChatHistory]);

    // chatscreen.jsx

    const connect = useCallback(async () => {
        if (!token || isReconnecting) {
            console.log('Skipping connection - no token or already reconnecting');
            setIsLoading(false);
            return;
        }

        // Skip if already subscribed — avoids churn when the parent useEffect
        // re-fires on isConnected flips.
        if (subscriptionRef.current && webSocketService.isConnected()) {
            return;
        }

        try {
            // ✅ WebSocket이 연결되어 있지 않으면 연결 시도
            if (!resolvedRoomId) {
                throw new Error('Missing roomId');
            }

            if (!webSocketService.isConnected()) {
                console.warn('⚠️ WebSocket not connected, attempting to connect...');

                try {
                    const userData = await TokenManager.getUserData();
                    if (!userData) {
                        throw new Error('No user data available');
                    }

                    // WebSocket 연결 시도
                    await webSocketService.connect(userData.userName, token);
                    console.log('✅ WebSocket connected successfully');

                } catch (wsError) {
                    console.error('❌ WebSocket connection failed:', wsError);

                    Alert.alert(
                        'Connection Error',
                        'Unable to establish chat connection. Please try again.',
                        [
                            {
                                text: 'Retry',
                                onPress: () => {
                                    setIsLoading(true);
                                    setHistoryLoaded(false);
                                    connect();
                                }
                            },
                            {
                                text: 'Go Back',
                                onPress: () => router.back()
                            }
                        ]
                    );
                    setIsLoading(false);
                    return;
                }
            }

            setIsConnected(true);

            // Clean up existing subscription
            if (subscriptionRef.current) {
                webSocketService.unsubscribeFromChatRoom(resolvedRoomId);
                subscriptionRef.current = null;
            }

            // Subscribe to chat room
            subscriptionRef.current = webSocketService.subscribeToChatRoom(
                resolvedRoomId,
                (receivedMessage) => {
                    const normalizedMessage = {
                        ...receivedMessage,
                        unreadCount: typeof receivedMessage.unreadCount === 'number' && !isNaN(receivedMessage.unreadCount)
                            ? receivedMessage.unreadCount
                            : 0,
                    };

                    LayoutAnimation.configureNext(LayoutAnimation.create(
                        120,
                        LayoutAnimation.Types.easeOut,
                        LayoutAnimation.Properties.opacity
                    ));
                    setMessages(prev => {
                        const safePrev = Array.isArray(prev) ? prev : [];
                        const incomingId = normalizedMessage.id || `${normalizedMessage.senderId || 'unknown'}-${normalizedMessage.timestamp || Date.now()}`;
                        const next = [...safePrev];
                        const clientId = normalizedMessage.clientId;
                        let matchedIndex = clientId
                            ? next.findIndex((m) => m.id === clientId)
                            : -1;
                        if (matchedIndex < 0) {
                            matchedIndex = next.findIndex((m) => (m.id || `${m.senderId || 'unknown'}-${m.timestamp || ''}`) === incomingId);
                        }

                        if (matchedIndex >= 0) {
                            next[matchedIndex] = {
                                ...next[matchedIndex],
                                ...normalizedMessage,
                                id: incomingId,
                                pending: false,
                                failed: false,
                            };
                        } else {
                            next.push({
                                ...normalizedMessage,
                                id: incomingId,
                                pending: false,
                                failed: false,
                            });
                        }

                        return next.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                    });

                    if (receivedMessage.senderId !== user.id) {
                        chatService.markAsRead(resolvedRoomId).catch(err =>
                            console.warn('Failed to mark as read:', err)
                        );
                    }

                    setTimeout(() => {
                        scrollViewRef.current?.scrollToOffset?.({ offset: 0, animated: true });
                    }, 100);
                }
            );

            // Clean up existing read subscription
            if (readSubscriptionRef.current) {
                readSubscriptionRef.current.unsubscribe();
                readSubscriptionRef.current = null;
            }

            // Subscribe to read-status updates for this room
            readSubscriptionRef.current = webSocketService.subscribeToChatRead(
                resolvedRoomId,
                (readEvent) => {
                    const ids = Array.isArray(readEvent?.updatedMessageIds) ? readEvent.updatedMessageIds : [];
                    if (!ids.length) return;
                    const idSet = new Set(ids);
                    setMessages(prev => (Array.isArray(prev) ? prev : []).map(m => (
                        idSet.has(m.id)
                            ? { ...m, unreadCount: Math.max(0, (m.unreadCount || 0) - 1) }
                            : m
                    )));
                }
            );

            // Load history only once. Lock with a ref because `historyLoaded`
            // updates async and a repeat connect() can race past the guard.
            if (!historyLoaded && !historyLoadInFlightRef.current) {
                // Cache already hydrated — WS stream keeps it fresh.
                if (messages && messages.length > 0) {
                    setHistoryLoaded(true);
                    setIsLoading(false);
                    return;
                }
                historyLoadInFlightRef.current = true;
                loadChatHistory()
                    .then(() => setHistoryLoaded(true))
                    .catch(error => {
                        console.error('Failed to load chat history:', error);
                        setIsLoading(false);
                    })
                    .finally(() => { historyLoadInFlightRef.current = false; });
            }

        } catch (error) {
            console.error('Connection setup error:', error);
            setIsLoading(false);
            handleConnectionError();
        }
    }, [resolvedRoomId, token, isReconnecting, historyLoaded, user?.id, webSocketService]);

    // reconnectAttempts 변경 시 자동 재연결
    useEffect(() => {
        if (reconnectAttempts > 0 && reconnectAttempts <= 3 && !isReconnecting && !isConnected) {
            const timer = setTimeout(() => {
                console.log(`Auto-reconnection attempt ${reconnectAttempts}/3`);
                connect();
            }, 3000 * reconnectAttempts); // 점진적 지연

            return () => clearTimeout(timer);
        }
    }, [reconnectAttempts, isReconnecting, isConnected, connect]);

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            // 날짜를 "Thursday, February 6, 2025" 형식으로 포맷팅
            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    };
    const shouldShowDateDivider = (currentMsg, prevMsg) => {
        if (!prevMsg) return true;

        const currentDate = new Date(currentMsg.timestamp).toDateString();
        const prevDate = new Date(prevMsg.timestamp).toDateString();
        return currentDate !== prevDate;
    };


    useEffect(() => {
        return () => {
            if (subscriptionRef.current) {
                webSocketService.unsubscribeFromChatRoom(resolvedRoomId);
                subscriptionRef.current = null;
            }
        };
    }, [resolvedRoomId, webSocketService]);


    const handleConnectionError = useCallback(() => {
        setIsConnected(false);

        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            setIsReconnecting(true);

            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }

            reconnectTimeoutRef.current = setTimeout(async () => {
                try {
                    await webSocketService.reconnect();
                    setReconnectAttempts(0);
                    setIsReconnecting(false);
                    setIsConnected(true);
                } catch (error) {
                    console.error('Reconnection failed:', error);
                    setReconnectAttempts(prev => prev + 1);
                }
            }, RECONNECT_INTERVAL);
        } else {
            setIsReconnecting(false);
            setIsLoading(false);
            Alert.alert(
                'Connection Error',
                'Unable to connect to chat server. Please try again later.',
                [{
                    text: 'Retry',
                    onPress: () => {
                        setReconnectAttempts(0);
                        setIsReconnecting(false);
                        connect();
                    }
                }]
            );
        }
    }, [reconnectAttempts, webSocketService]);

    useEffect(() => {
        const markRoomAsRead = async () => {
            if (resolvedRoomId && token) {
                try {
                    await chatService.markAsRead(resolvedRoomId);
                    console.log('Marked room as read on entry');
                } catch (error) {
                    console.warn('Failed to mark as read:', error);
                }
            }
        };

        markRoomAsRead();
    }, [resolvedRoomId, token]);

    const loadingTimeoutRef = useRef(null);

    useEffect(() => {
        if (token && resolvedRoomId && !historyLoaded) {
            // 타임아웃 시작
            loadingTimeoutRef.current = setTimeout(() => {
                setIsLoading(prev => {
                    if (prev) {
                        console.warn('Loading timeout - forcing isLoading to false');

                        if (!isConnected) {
                            Alert.alert(
                                'Connection Timeout',
                                'Unable to connect to chat server. Please try again.',
                                [
                                    {
                                        text: 'Retry',
                                        onPress: () => {
                                            setIsLoading(true);
                                            setHistoryLoaded(false);
                                            connect();
                                        }
                                    },
                                    {
                                        text: 'Go Back',
                                        onPress: () => router.back()
                                    }
                                ]
                            );
                        }
                        return false;
                    }
                    return prev;
                });
            }, 10000);

            connect();
        }

        return () => {
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }

            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [connect, historyLoaded, isConnected, resolvedRoomId, router, token]);

    useEffect(() => {
        // cleanup 함수는 컴포넌트 언마운트 시에만 실행
        return () => {
            // 채팅방 구독 해제
            if (subscriptionRef.current) {
                webSocketService.unsubscribeFromChatRoom(resolvedRoomId);
            }

            // read-status 구독 해제
            if (readSubscriptionRef.current) {
                readSubscriptionRef.current.unsubscribe();
                readSubscriptionRef.current = null;
            }

            // 연결 정리
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }

            // 캐시 정리
            setCachedMessages(prev => {
                const allRoomIds = Object.keys(prev);

                // 10개 이하면 그대로 유지
                if (allRoomIds.length <= 10) {
                    return prev;
                }

                // 현재 방은 유지, 나머지는 최근 9개만
                const otherRooms = allRoomIds.filter(id => id !== resolvedRoomId?.toString());
                const recentOthers = otherRooms.slice(-9);

                const newCache = { [resolvedRoomId]: prev[resolvedRoomId] };
                recentOthers.forEach(id => {
                    newCache[id] = prev[id];
                });

                console.log(`📦 Cache cleaned: ${allRoomIds.length} → ${Object.keys(newCache).length} rooms`);
                return newCache;
            });
        };
    }, [resolvedRoomId]);

    const handleImagePress = (imageUrl) => {
        setSelectedImage(imageUrl);
        Image.getSize(
            imageUrl,
            (width, height) => {
                if (width > 0 && height > 0) {
                    setSelectedImageAspectRatio(width / height);
                } else {
                    setSelectedImageAspectRatio(1);
                }
            },
            () => setSelectedImageAspectRatio(1)
        );
        setModalVisible(true);
    };

    // Update pickImages function and image rendering styles
    const pickImages = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (permissionResult.granted === false) {
                Alert.alert('Permission Required', 'You need to give permission to access your photos');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                selectionLimit: 15,
                quality: 0.5,
                base64: false,
                preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Automatic,
            });

            if (!result.canceled && result.assets.length > 0) {
                setIsUploading(true);
                try {
                    // Create FormData and append files
                    const formData = new FormData();

                    for (const asset of result.assets) {
                        // 이미지 압축
                        const compressedUri = await compressImage(asset);

                        // Get file extension
                        const extension = 'jpg'; // JPEG로 통일

                        formData.append('files', {
                            uri: Platform.OS === 'ios' ? compressedUri.replace('file://', '') : compressedUri,
                            type: 'image/jpeg',
                            name: `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`,
                        });
                    }

                    if (formData._parts.length > 0) {
                        const response = await chatService.uploadImages(formData);
                        const imageUrls = Array.isArray(response) ? response : (response.urls || response.imageUrls || []);

                        if (imageUrls.length > 0) {
                            const chatMessage = {
                                type: 'image',
                                content: '',
                                imageUrls: imageUrls,
                                timestamp: new Date().toISOString()
                            };

                            await chatService.sendMessage(webSocketService.stompClient, resolvedRoomId, chatMessage);
                        }
                    }
                } catch (error) {
                    console.error('Error uploading images:', error);
                    Alert.alert('Error', 'Failed to send images. Please try again.');
                } finally {
                    setIsUploading(false);
                }
            }
        } catch (error) {
            console.error('Error picking images:', error);
            Alert.alert(
                'Unable to open this photo',
                'This image may still be in iCloud or not available locally on your iPhone. Please open it in Photos first so it downloads, then try again.'
            );
        }
    };
    
    const renderMessage = (msg, index, messages) => {
        const isOwnMessage = msg.senderId === user.id;
        const showSenderInfo = index === 0 || messages[index - 1]?.senderId !== msg.senderId;

        const formatTime = (timestamp) => {
            return new Date(timestamp).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        };

        // 읽지 않은 메시지 카운트 표시를 위한 컴포넌트
        const UnreadCountBadge = ({ count }) => {
            const displayCount = typeof count === 'number' && !isNaN(count) ? count : 0;

            if (displayCount <= 0) return null;

            return (
                <Text style={styles.unreadCountText}>{displayCount}</Text>
            );
        };

        const OwnMessageMetaColumn = ({ unreadCount, timestamp }) => (
            <View style={styles.ownMessageMetaColumn}>
                <UnreadCountBadge count={unreadCount} />
                <Text style={[styles.timeText, styles.ownMetaTimeText]}>
                    {formatTime(timestamp)}
                </Text>
            </View>
        );

        const renderSenderAvatar = () => {
            if (!showSenderInfo) {
                return <View style={styles.otherAvatarSpacer} />;
            }

            return msg.senderProfileUrl ? (
                <ExpoImage
                    style={styles.avatar}
                    contentFit="cover"
                    source={{ uri: msg.senderProfileUrl }}
                    cachePolicy="memory-disk"
                    onError={(e) => console.log('Failed to load image', e?.error)}
                />
            ) : (
                <View style={[styles.avatar, styles.iconContainer]}>
                    <Ionicons name="person" size={16} color="#888" />
                </View>
            );
        };

        const renderOtherMessageLayout = (content) => (
            <View style={styles.otherMessageRow}>
                {renderSenderAvatar()}
                <View style={styles.otherMessageColumn}>
                    {showSenderInfo && !!msg.senderName && (
                        <Text style={styles.otherSenderName}>{msg.senderName}</Text>
                    )}
                    <View style={styles.otherMessageBottomRow}>
                        <View style={styles.otherMessageBody}>
                            {content}
                        </View>
                        <Text style={[styles.timeText, styles.inlineOtherTimeText]}>
                            {formatTime(msg.timestamp)}
                        </Text>
                    </View>
                </View>
            </View>
        );


        if (msg.type === 'place_share') {
            const placeCard = (
                <TouchableOpacity
                    onPress={() => router.push({
                        pathname: '/place_details',
                        params: {
                            placeId: msg.placeData.placeId,
                        }
                    })}
                    activeOpacity={0.8}
                >
                    <PlaceCard place={msg.placeData} isOwnMessage={isOwnMessage} />
                </TouchableOpacity>
            );

            if (!isOwnMessage) {
                return (
                    <View
                        style={[
                            styles.messageWrapper,
                            styles.otherMessageWrapper
                        ]}
                    >
                        {renderOtherMessageLayout(placeCard)}
                    </View>
                );
            }

            return (
                <View
                    style={[
                        styles.messageWrapper,
                        isOwnMessage ? styles.ownMessageWrapper : styles.otherMessageWrapper
                    ]}
                >
                    <View style={[
                        styles.sharedMessageRow,
                        isOwnMessage ? styles.ownSharedMessageRow : styles.otherSharedMessageRow
                    ]}>
                        {isOwnMessage && (
                            <OwnMessageMetaColumn
                                unreadCount={msg.unreadCount}
                                timestamp={msg.timestamp}
                            />
                        )}
                        {placeCard}
                    </View>
                </View>
            );
        }

        // In your renderMessage function, add a case for trip_share type
        if (msg.type === 'trip_share') {
            const tripCard = (
                <TouchableOpacity
                    onPress={() => router.push({
                        pathname: '/list_details',
                        params: {
                            tripListId: msg.tripData.tripListId,
                            from: 'chatscreen'
                        }
                    })}
                    activeOpacity={0.8}
                >
                    <TripListCard
                        trip={msg.tripData}
                        isOwnMessage={isOwnMessage}
                    />
                </TouchableOpacity>
            );

            if (!isOwnMessage) {
                return (
                    <View style={[
                        styles.messageWrapper,
                        styles.otherMessageWrapper
                    ]}>
                        {renderOtherMessageLayout(tripCard)}
                    </View>
                );
            }

            return (
                <View style={[
                    styles.messageWrapper,
                    isOwnMessage ? styles.ownMessageWrapper : styles.otherMessageWrapper
                ]}>
                    <View style={[
                        styles.sharedMessageRow,
                        isOwnMessage ? styles.ownSharedMessageRow : styles.otherSharedMessageRow
                    ]}>
                        {isOwnMessage && (
                            <OwnMessageMetaColumn
                                unreadCount={msg.unreadCount}
                                timestamp={msg.timestamp}
                            />
                        )}
                        {tripCard}
                    </View>
                </View>
            );
        }

        const MessageContainer = ({ children, isOwnMessage, timestamp, isPending, isFailed }) => {
            const backgroundColor = isOwnMessage ? '#fff' : '#25282D';

            return (
                <View style={[
                    styles.messageWrapper,
                    isOwnMessage ? styles.ownMessageWrapper : styles.otherMessageWrapper,
                    isPending && styles.pendingWrapper
                ]}>
                    <View style={[
                        styles.messageContainer,
                        isOwnMessage ? styles.ownMessage : styles.otherMessage,
                        { backgroundColor },
                        isFailed && styles.failedMessage
                    ]}>
                        {children}

                        {isFailed && (
                            <TouchableOpacity
                                style={styles.retryButton}
                                onPress={() => retryMessage(msg)}
                            >
                                <Ionicons name="warning" size={16} color="#FF6B6B" />
                            </TouchableOpacity>
                        )}
                    </View>
                    <MessageTail
                        isOwnMessage={isOwnMessage}
                        color={backgroundColor}
                        isFailed={isFailed}
                    />
                </View>
            );
        };

        const renderImageGrid = (urls) => {
            const totalImages = urls.length;


            // Case 1: 3장 이하일 경우
            if (totalImages <= 3) {
                return (
                    <View style={styles.gridRow}>
                        {urls.map((url, index) => (
                            <TouchableOpacity
                                key={index}
                                onPress={() => handleImagePress(url)}
                                style={[
                                    styles.imageContainer,
                                    totalImages === 1 && styles.fullWidth,
                                    totalImages === 2 && styles.halfWidth,
                                    totalImages === 3 && styles.thirdWidth,
                                ]}
                            >
                                <ExpoImage
                                    source={{ uri: url }}
                                    style={styles.fullWidthImage}
                                    contentFit="cover"
                                    cachePolicy="memory-disk"
                                    transition={150}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
                );
            }

            // Case 2: 3장보다 많을 경우
            const remainder = totalImages % 3;
            let mainGridCount;
            let remainingImages;

            if (remainder === 1) {
                // mod 3 = 1인 경우: 마지막 4장을 2x2로 배치
                mainGridCount = totalImages - 4;
                remainingImages = urls.slice(mainGridCount);
            } else if (remainder === 2) {
                // mod 3 = 2인 경우: 마지막 2장을 한 줄로 배치
                mainGridCount = totalImages - 2;
                remainingImages = urls.slice(mainGridCount);
            } else {
                // mod 3 = 0인 경우: 모두 3장씩 배치
                mainGridCount = totalImages;
                remainingImages = [];
            }

            return (
                <View style={styles.imageGrid}>
                    {/* 메인 그리드: 3장씩 배치 */}
                    {Array(Math.floor(mainGridCount / 3)).fill().map((_, rowIndex) => (
                        <View key={rowIndex} style={styles.gridRow}>
                            {urls.slice(rowIndex * 3, (rowIndex + 1) * 3).map((url, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => handleImagePress(url)}
                                    style={styles.thirdWidth}
                                >
                                    <ExpoImage
                                        source={{ uri: url }}
                                        style={styles.fullWidthImage}
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                        transition={150}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                    ))}

                    {/* 나머지 이미지 처리 */}
                    {remainingImages.length > 0 && (
                        remainder === 1 ? (
                            // 4장을 2x2로 배치
                            <>
                                <View style={styles.gridRow}>
                                    {remainingImages.slice(0, 2).map((url, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            onPress={() => handleImagePress(url)}
                                            style={styles.halfWidth}
                                        >
                                            <ExpoImage
                                                source={{ uri: url }}
                                                style={styles.fullWidthImage}
                                                contentFit="cover"
                                                cachePolicy="memory-disk"
                                                transition={150}
                                            />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <View style={styles.gridRow}>
                                    {remainingImages.slice(2, 4).map((url, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            onPress={() => handleImagePress(url)}
                                            style={styles.halfWidth}
                                        >
                                            <ExpoImage
                                                source={{ uri: url }}
                                                style={styles.fullWidthImage}
                                                contentFit="cover"
                                                cachePolicy="memory-disk"
                                                transition={150}
                                            />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        ) : (
                            // 2장을 한 줄로 배치
                            <View style={styles.gridRow}>
                                {remainingImages.map((url, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => handleImagePress(url)}
                                        style={styles.halfWidth}
                                    >
                                        <ExpoImage
                                            source={{ uri: url }}
                                            style={styles.fullWidthImage}
                                            contentFit="cover"
                                            cachePolicy="memory-disk"
                                            transition={150}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )
                    )}
                </View>
            );
        };

        const imageContent = msg.imageUrls && msg.imageUrls.length > 0 ? (
            <View style={styles.imageMessageContainer}>
                {renderImageGrid(msg.imageUrls)}
            </View>
        ) : null;

        const textContent = msg.content ? (
            <MessageContainer
                isOwnMessage={isOwnMessage}
                isPending={msg.pending}
                isFailed={msg.failed}
            >
                <Text style={[
                    styles.messageText,
                    isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
                    msg.failed && styles.failedMessageText
                ]}>
                    {msg.content}
                </Text>
            </MessageContainer>
        ) : null;

        if (!isOwnMessage) {
            return (
                <View
                    key={msg.id || index}
                    style={[
                        styles.messageWrapper,
                        styles.otherMessageWrapper
                    ]}
                >
                    {renderOtherMessageLayout(
                        <View style={styles.otherMessageStack}>
                            {imageContent}
                            {textContent}
                        </View>
                    )}
                </View>
            );
        }

        return (
            <View
                key={msg.id || index}
                style={[
                    styles.messageWrapper,
                    styles.ownMessageWrapper
                ]}
            >
                {imageContent && (
                    <View style={[
                        styles.messageContentWrapper,
                        styles.ownMessageContentWrapper
                    ]}>
                        <OwnMessageMetaColumn
                            unreadCount={msg.unreadCount}
                            timestamp={msg.timestamp}
                        />
                        {imageContent}
                    </View>
                )}

                {textContent && (
                    <View style={[
                        styles.messageContentWrapper,
                        styles.ownMessageContentWrapper
                    ]}>
                        <OwnMessageMetaColumn
                            unreadCount={msg.unreadCount}
                            timestamp={msg.timestamp}
                        />
                        {textContent}
                    </View>
                )}
            </View>
        );
    };

    // chatscreen.jsx - Replace sendMessage
    const sendMessage = useCallback(() => {
        if (!message.trim() || !isConnected || !token) return;

        const timestamp = new Date().toISOString();
        const tempId = `temp-${Date.now()}-${Math.random()}`;

        const chatMessage = {
            content: message.trim(),
            timestamp: timestamp,
            id: tempId,
            senderId: user.id,
            senderName: user.userName,
            senderProfileUrl: user.profileUrl,
            pending: true
        };

        // Optimistic update with a quick fade-in so the new bubble pops into
        // the inverted FlatList instead of just blinking in.
        LayoutAnimation.configureNext(LayoutAnimation.create(
            120,
            LayoutAnimation.Types.easeOut,
            LayoutAnimation.Properties.opacity
        ));
        setMessages(prev => [...prev, chatMessage]);
        setMessage('');
        setShowSend(false);

        // Send to server
        try {
            const messageToSend = {
                clientId: tempId,
                content: chatMessage.content,
                timestamp: chatMessage.timestamp,
                type: 'text'
            };

            webSocketService.sendChatMessage(resolvedRoomId, messageToSend);

        } catch (error) {
            console.error('Error sending message:', error);

            // Mark as failed
            setMessages(prev =>
                prev.map(msg =>
                    msg.id === tempId
                        ? { ...msg, pending: false, failed: true }
                        : msg
                )
            );

            Alert.alert('Error', 'Failed to send message');

        }

    }, [message, resolvedRoomId, token, user, isConnected, webSocketService]);

    // 메시지 재전송 함수
    const retryMessage = useCallback((failedMessage) => {
        // 실패 상태 제거
        setMessages(prev =>
            prev.map(msg =>
                msg.id === failedMessage.id
                    ? { ...msg, pending: true, failed: false }
                    : msg
            )
        );

        // 다시 전송 시도
        try {
            chatService.sendMessage(webSocketService.stompClient, resolvedRoomId, {
                content: failedMessage.content,
                timestamp: new Date().toISOString() // 새 타임스탬프로 업데이트
            });
        } catch (error) {
            console.error('Error retrying message:', error);
            handleConnectionError();
        }
    }, [handleConnectionError, resolvedRoomId, webSocketService]);

    if (isLoading) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={styles.loadingText}>Loading chat...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    {isDirectMessage ? (
                        <View style={styles.dmHeaderContainer}>
                            {otherUserImage ? (
                                <ExpoImage
                                    source={{ uri: otherUserImage }}
                                    style={styles.dmUserImage}
                                    contentFit="cover"
                                    cachePolicy="memory-disk"
                                />
                            ) : (
                                <View style={styles.dmUserIcon}>
                                    <Ionicons name="person" size={16} color="#888" />
                                </View>
                            )}
                            <Text style={styles.headerTitle}>{otherUserName}</Text>
                        </View>
                    ) : (
                        <Text style={styles.headerTitle}>{roomName}</Text>
                    )}
                </View>
                <TouchableOpacity
                    style={styles.menuButton}
                    onPress={() => setInfoModalVisible(true)}
                >
                    <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingView}
            // keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <FlatList
                    ref={scrollViewRef}
                    style={styles.messagesContainer}
                    contentContainerStyle={styles.messagesContent}
                    data={Array.isArray(messages) ? [...messages].reverse() : []}
                    keyExtractor={(item, index) => item?.id || `idx-${index}`}
                    inverted
                    initialNumToRender={15}
                    maxToRenderPerBatch={10}
                    windowSize={10}
                    removeClippedSubviews
                    renderItem={({ item, index }) => {
                        // `index` here is into the reversed array. Convert back
                        // to chronological index so renderMessage / date divider
                        // logic keep working against the original `messages`.
                        const chronoIndex = messages.length - 1 - index;
                        const prevMsg = messages[chronoIndex - 1];
                        return (
                            <View>
                                {shouldShowDateDivider(item, prevMsg) && (
                                    <View style={styles.dateDivider}>
                                        <Text style={styles.dateDividerText}>
                                            {formatDate(item.timestamp)}
                                        </Text>
                                    </View>
                                )}
                                {renderMessage(item, chronoIndex, messages)}
                            </View>
                        );
                    }}
                    onEndReached={() => {
                        if (hasMore && !isLoadingMore) {
                            loadMoreMessages();
                        }
                    }}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={
                        isLoadingMore && page > 1
                            ? <ActivityIndicator size="small" color="#ffffff" style={styles.loadMoreIndicator} />
                            : null
                    }
                />

                <View style={styles.inputWrapper}>
                    <View style={styles.topRow}>
                        <TouchableOpacity style={styles.attachButton}>
                            <Ionicons name="add" size={24} color={ICON_COLOR} />
                        </TouchableOpacity>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                value={message}
                                onChangeText={handleChangeText}
                                placeholder="Message"
                                placeholderTextColor="#999"
                                editable={isConnected}
                                multiline
                            />
                            <TouchableOpacity
                                style={styles.cameraButton}
                                onPress={pickImages}
                                disabled={isUploading}
                            >
                                {isUploading ? (
                                    <ActivityIndicator size="small" color={ICON_COLOR} />
                                ) : (
                                    <Ionicons name="camera" size={24} color={ICON_COLOR} />
                                )}
                            </TouchableOpacity>
                        </View>
                        {showSend ? (
                            <TouchableOpacity
                                style={styles.rightButton}
                                onPress={() => {
                                    sendMessage(message);
                                    setMessage('');
                                    setShowSend(false);
                                }}
                            >
                                <Ionicons
                                    name="send"
                                    size={24}
                                    color={ICON_COLOR}
                                />
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.rightButtonSpacer} />
                        )}
                    </View>
                </View>
            </KeyboardAvoidingView>
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setModalVisible(false)}
                >
                    <BlurView intensity={100} style={StyleSheet.absoluteFill} />
                    <View style={styles.modalContent}>
                        <ExpoImage
                            source={{ uri: selectedImage }}
                            style={[
                                styles.modalImage,
                                selectedImageAspectRatio >= 1
                                    ? {
                                        width: '90%',
                                        aspectRatio: selectedImageAspectRatio,
                                    }
                                    : {
                                        height: '80%',
                                        aspectRatio: selectedImageAspectRatio,
                                    }
                            ]}
                            contentFit="contain"
                            cachePolicy="memory-disk"
                        />
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setModalVisible(false)}
                        >
                            <Ionicons name="close" size={28} color="#ffffff" />
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
            <ChatArchives
                visible={infoModalVisible}
                onClose={() => setInfoModalVisible(false)}
                chatSummary={chatSummary}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    keyboardAvoidingView: {
        flex: 1,
    },
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    centerContent: {
        flex: 1,
        alignContent: 'center',
        justifyContent: 'center',
        backgroundColor: '#000000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderBottomColor: '#333',
        borderBottomWidth: 1,
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#ffffff',
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        fontSize: 24,
        color: '#ffffff',
    },
    menuButton: {
        padding: 8,
    },
    menuButtonText: {
        fontSize: 24,
        color: '#ffffff',
    },
    messagesContainer: {
        flex: 1,
    },
    messagesContent: {
        padding: 16,
        flexDirection: 'column-reverse',
    },
    // placeCardContainer: {
    //     width: 240,
    //     height: 160,
    //     borderRadius: 12,
    //     overflow: 'hidden',
    //     marginVertical: 2,
    //     backgroundColor: '#1a1a1a', // Fallback background color
    // },
    // ownPlaceCard: {
    //     alignSelf: 'flex-end',
    //     marginLeft: 40,
    //     marginRight: 8,
    // },
    // otherPlaceCard: {
    //     alignSelf: 'flex-start',
    //     marginRight: 40,
    //     marginLeft: 8,
    // },
    // placeCardImage: {
    //     width: '100%',
    //     height: '100%',
    //     position: 'absolute',
    // },
    // placeCardGradient: {
    //     flex: 1,
    //     justifyContent: 'flex-end',
    // },
    // placeCardOverlay: {
    //     padding: 12,
    //     height: '50%',
    //     justifyContent: 'flex-end',
    // },
    // placeCardContent: {
    //     gap: 4,
    // },
    // placeCardName: {
    //     color: '#FFFFFF',
    //     fontSize: 16,
    //     fontWeight: '600',
    // },
    // placeCardAddress: {
    //     color: '#CCCCCC',
    //     fontSize: 12,
    // },
    // placeCardRating: {
    //     flexDirection: 'row',
    //     alignItems: 'center',
    //     marginTop: 4,
    // },
    // placeCardRatingText: {
    //     color: '#FFFFFF',
    //     fontSize: 12,
    //     marginRight: 4,
    // },
    // placeCardStar: {
    //     marginTop: 1,
    // },
    placeCardContainer: {
        width: 280,
        borderRadius: 15,
        overflow: 'hidden',
        backgroundColor: '#2A2A2A',
    },

    placeImage: {
        width: '100%',
        aspectRatio: 1,
        height: undefined,
    },

    placeInfo: {
        padding: 12,
    },
    placeNameContainer: {
        // flexDirection: 'row',
        // alignItems: 'center',
        marginBottom: 4,
    },
    titleRatingWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'nowrap',  // 줄바꿈 방지
    },
    placeName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        flexShrink: 1,
    },
    ratingDot: {
        color: '#FFFFFF',
        marginHorizontal: 4,
        alignItems: 'center',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 0,
    },
    placeRating: {
        fontSize: 16,
        color: '#FFFFFF',
        marginRight: 4,
        alignItems: 'center',
        fontWeight: '600',
    },
    starIcon: {
        fontSize: 12,
        color: '#FFFFFF',
        alignItems: 'center',
    },

    placeAddress: {
        fontSize: 14,
        color: '#9E9E9E',
    },
    messageWrapper: {
        marginVertical: 4,
        maxWidth: '80%',
    },
    ownMessageWrapper: {
        alignSelf: 'flex-end',
        alignItems: 'flex-end',
    },
    otherMessageWrapper: {
        alignSelf: 'flex-start',
        alignItems: 'flex-start',
        maxWidth: '100%',
        width: '100%',
    },
    avatarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        marginTop: 8,
    },
    avatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 8,
    },
    otherAvatarSpacer: {
        width: 24,
        height: 24,
        marginRight: 8,
    },
    iconContainer: {
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
    },
    ownTimeText: {
        marginLeft: 'auto',
    },
    otherTimeText: {
        alignSelf: 'flex-start',
    },
    senderName: {
        fontSize: 12,
        color: '#ffffff',
        fontWeight: '500',
        marginBottom: 4,
    },
    messageContainer: {
        borderRadius: 15,
        padding: 12,
        maxWidth: '100%',
    },
    ownMessage: {
        backgroundColor: '#ffffff',
        borderBottomRightRadius: 0
    },
    otherMessage: {
        backgroundColor: '#25282D',
        borderBottomLeftRadius: 0
    },
    tail: {
        position: 'absolute',
        bottom: -2,
    },
    otherTail: {
        left: -4,
        transform: [{ scaleX: -1 }], // 자신의 메시지는 SVG를 좌우 반전
    },
    ownTail: {
        right: -4,
    },
    messageTail: {
        position: 'absolute',
        bottom: 0,
        width: 15,
        height: 15,
    },
    ownMessageTail: {
        right: -8,
        borderWidth: 8,
        borderColor: 'transparent',
        borderTopColor: '#fff',
        borderLeftColor: '#fff',
        transform: [
            { rotate: '45deg' }
        ],
    },

    otherMessageTail: {
        left: -8,
        borderWidth: 8,
        borderColor: 'transparent',
        borderTopColor: '#333',
        borderRightColor: '#333',
        transform: [
            { rotate: '-45deg' }
        ],
    },
    timeText: {
        fontSize: 12,
        color: '#888',
        marginTop: 4,
        marginBottom: 4,
        // position: 'absolute',
        // bottom: -20,
    },
    consecutiveMessage: {
        marginTop: 2,
    },
    dateDivider: {
        alignItems: 'center',
        marginVertical: 16,
    },
    dateDividerText: {
        color: '#979797',
        fontSize: 12,
        fontWeight: 600,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 10,
    },
    messagesContent: {
        padding: 16,
    },
    messageText: {
        fontSize: 14,
        // lineHeight: 20,
        // flexWrap: 'wrap',
        // maxWidth: '100%',
    },
    ownMessageText: {
        color: '#000000',
    },
    otherMessageText: {
        color: '#fff',
    },
    inputWrapper: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderTopColor: '#333',
        borderTopWidth: 1,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'flex-end', // Aligns items to bottom
    },
    attachButton: {
        padding: 8,
        alignSelf: 'flex-end',
    },
    inputContainer: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#333',
        borderRadius: 20,
        marginHorizontal: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        maxHeight: 100, // Limits input height
    },
    input: {
        flex: 1,
        color: '#ffffff',
        fontSize: 16,
        marginRight: 8,
        paddingTop: 0,
        paddingBottom: 0,
    },
    cameraButton: {
        alignSelf: 'flex-end',
    },
    rightButton: {
        padding: 8,
        alignSelf: 'flex-end',
    },
    emojiButton: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageButton: {
        padding: 8,
        marginRight: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButton: {
        backgroundColor: '#0084ff',
        padding: 8,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
    },
    sendButtonDisabled: {
        backgroundColor: '#333',
    },
    sendButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    sendButtonTextDisabled: {
        color: '#666',
    },
    textMessageContainer: {
        alignSelf: 'flex-start',
    },
    imageMessageContainer: {
        overflow: 'hidden',
        borderRadius: 15,
    },
    imageGrid: {
        width: '100%',
        gap: 1,
    },
    singleImageContainer: {
        width: '100%',
        aspectRatio: 4 / 3,
    },
    halfWidthContainer: {
        width: '49.5%', // 약간의 간격을 위해
        aspectRatio: 1,
    },
    thirdWidthContainer: {
        width: '33%',
        aspectRatio: 1,
    },
    fullWidthImage: {
        width: '100%',
        height: '100%',
    },
    multiImageGrid: {
        width: '100%',
        gap: 1,
    },
    gridRow: {
        flexDirection: 'row',
        gap: 1,
        marginBottom: 1,
    },
    fullWidth: {
        width: '100%',
        aspectRatio: 4 / 3,
    },
    halfWidth: {
        width: '49.5%',
        aspectRatio: 1,
    },
    thirdWidth: {
        width: '33%',
        aspectRatio: 1,
    },
    threeImageGrid: {
        flexDirection: 'row',
        height: 200,
    },
    imageContainer: {
        width: '33%',
        aspectRatio: 1,
    },
    singleImage: {
        width: '100%',
        maxWidth: 250,
        aspectRatio: 4 / 3,
    },
    doubleImage: {
        width: '49.5%',
        aspectRatio: 1,
    },
    singleImageContainer: {
        width: '100%',
        aspectRatio: 4 / 3,
    },
    lastRowContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 1,
        width: '100%',
    },
    lastRowImage: {
        width: '49.5%',
        aspectRatio: 1,
    },
    messageImage: {
        width: '100%',
        height: '100%',
        borderRadius: 0,
    },
    // timeText: {
    //     fontSize: 10,
    //     marginTop: 2,
    //     color: '#999',
    // },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalImage: {
        maxWidth: '90%',
        maxHeight: '80%',
        borderRadius: 12,
    },
    closeButton: {
        position: 'absolute',
        top: 60,
        right: 20,
        padding: 10,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    firstOfThreeImage: {
        flex: 2,
        marginRight: 1,
    },
    smallImage: {
        flex: 1,
        height: '50%',
    },
    placeCard: {
        flexDirection: 'row',
        backgroundColor: '#1a1a1a',
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 10,
    },
    ratingText: {
        color: '#fff',
        fontSize: 14,
        marginRight: 5,
    },
    tripListCardContainer: {
        width: 280,
        height: 180,
        borderRadius: 12,
        overflow: 'hidden',
        marginVertical: 2,
        backgroundColor: '#1a1a1a',
    },
    ownTripCard: {
        alignSelf: 'flex-end',
        marginLeft: 40,
        marginRight: 8,
    },
    otherTripCard: {
        alignSelf: 'flex-start',
        marginRight: 40,
        marginLeft: 8,
    },
    tripCardImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    tripCardGradient: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    tripCardOverlay: {
        padding: 12,
        height: '100%',
        justifyContent: 'flex-end',
    },
    tripCardContent: {
        gap: 8,
    },
    tripCardName: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    tripCardStats: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        color: '#FFFFFF',
        fontSize: 13,
    },
    statDivider: {
        width: 1,
        height: 12,
        backgroundColor: 'rgba(255,255,255,0.3)',
        marginHorizontal: 8,
    },
    tripCardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    userAvatar: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#333',
    },
    userName: {
        color: '#FFFFFF',
        fontSize: 12,
        opacity: 0.9,
    },
    tripCardDate: {
        color: '#FFFFFF',
        fontSize: 12,
        opacity: 0.8,
    },
    infoModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    infoModalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        flexDirection: 'row',
    },
    infoModalContent: {
        width: '90%',
        height: '100%',
        backgroundColor: '#000',
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        borderTopLeftRadius: 20,
        borderBottomLeftRadius: 20,
    },
    infoModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    infoCloseButton: {
        padding: 8,
    },
    infoModalTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    infoSection: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    infoSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    infoSectionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    modalScroll: {
        flex: 1,
    },
    infoSectionTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 16,
        paddingHorizontal: 16,
    },
    mediaPreview: {
        marginTop: 12,
    },
    mediaPreviewItem: {
        width: 80,
        height: 80,
        borderRadius: 8,
        marginRight: 8,
    },
    membersList: {
        paddingHorizontal: 16,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    memberName: {
        color: '#fff',
        fontSize: 16,
    },
    sharedItemsScroll: {
        marginTop: 12,
    },
    dmHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dmUserImage: {
        width: 28,
        height: 28,
        borderRadius: 14,
        marginRight: 8,
    },
    dmUserIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    loadMoreIndicator: {
        paddingVertical: 10,
    },
    pendingMessage: {
        opacity: 0.7,
    },
    pendingWrapper: {
        opacity: 0.55,
    },
    failedMessage: {
        borderWidth: 1,
        borderColor: '#FF6B6B',
    },
    failedMessageText: {
        color: '#FF6B6B',
    },
    pendingIndicator: {
        position: 'absolute',
        right: -20,
        bottom: 0,
    },
    retryButton: {
        position: 'absolute',
        right: -20,
        bottom: 0,
    },
    // 스타일 추가
    pendingTail: {
        opacity: 0,
    },
    failedTail: {
        borderWidth: 1,
        borderColor: '#FF6B6B',
    },
    messageContentWrapper: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
    },
    ownMessageContentWrapper: {
        justifyContent: 'flex-end',
    },
    otherMessageContentWrapper: {
        justifyContent: 'flex-start',
    },
    sharedMessageRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
    },
    ownSharedMessageRow: {
        justifyContent: 'flex-end',
    },
    otherSharedMessageRow: {
        justifyContent: 'flex-start',
    },
    otherMessageRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        width: '100%',
    },
    otherMessageColumn: {
        flexShrink: 1,
        maxWidth: '82%',
    },
    otherSenderName: {
        fontSize: 12,
        color: '#ffffff',
        fontWeight: '500',
        marginBottom: 4,
    },
    otherMessageBottomRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    otherMessageBody: {
        flexShrink: 1,
    },
    otherMessageStack: {
        gap: 6,
        alignItems: 'flex-start',
    },
    inlineOtherTimeText: {
        marginTop: 0,
        marginBottom: 4,
        marginLeft: 8,
        alignSelf: 'flex-end',
    },
    ownMessageMetaColumn: {
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        marginBottom: 6,
        minWidth: 32,
    },

    // 메시지 텍스트 컨테이너
    messageTextContainer: {
        flexDirection: 'row',
        alignItems: 'cemter',
        marginBottom: 2,
    },

    // 읽지 않은 메시지 카운트 텍스트
    unreadCountText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
        marginRight: 0,
        marginBottom: 2,
    },
    ownMetaTimeText: {
        marginLeft: 0,
        marginTop: 0,
        marginBottom: 0,
        alignSelf: 'flex-end',
    },
});

export default ChatScreen;
