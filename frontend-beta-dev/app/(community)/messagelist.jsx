import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    TextInput,
    FlatList,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as chatService from './../src/api/chat'
import { TokenManager } from './../src/config';
import WebSocketService from './../src/api/WebSocketService';
import { parseISO, differenceInMinutes, differenceInHours, differenceInDays, differenceInWeeks } from 'date-fns';
import SkeletonPlaceholder from "react-native-skeleton-placeholder";

const MessageList = () => {
    const [chatLogs, setChatLogs] = useState([]);
    const [activeTab, setActiveTab] = useState('Friends');
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await fetchChatLogs();
        } finally {
            setIsRefreshing(false);
        }
    };

    const CHAT_LIST_CACHE_KEY = 'chatLogs:cache';

    useEffect(() => {
        const initializeUser = async () => {
            try {
                const userData = await TokenManager.getUserData();
                setUser(userData);
            } catch (error) {
                console.error('Error getting user data:', error);
            }
        };

        // Hydrate from cache first so the screen renders instantly
        AsyncStorage.getItem(CHAT_LIST_CACHE_KEY)
            .then(raw => {
                if (!raw) return;
                try {
                    const cached = JSON.parse(raw);
                    if (Array.isArray(cached) && cached.length) {
                        setChatLogs(cached);
                        setIsLoading(false);
                    }
                } catch { /* ignore */ }
            })
            .catch(() => {});

        initializeUser();
        fetchChatLogs();
    }, []);

    // Persist chat list for next cold open
    useEffect(() => {
        if (!Array.isArray(chatLogs) || chatLogs.length === 0) return;
        AsyncStorage.setItem(CHAT_LIST_CACHE_KEY, JSON.stringify(chatLogs)).catch(() => {});
    }, [chatLogs]);

    useEffect(() => {
        if (!user?.id) return;

        const ws = new WebSocketService();
        const subscription = ws.subscribeToChatList(user.id, (incomingMessage) => {
            const isOwnMessage = String(incomingMessage.senderId) === String(user.id);
            const roomIdNum = Number(incomingMessage.chatRoomId);
            const isActiveRoom = ws.chatSubscriptions?.has(roomIdNum)
                || ws.chatSubscriptions?.has(String(incomingMessage.chatRoomId));
            const skipUnreadBump = isOwnMessage || isActiveRoom;

            let missing = false;
            setChatLogs((prev) => {
                const safePrev = Array.isArray(prev) ? prev : [];
                const idx = safePrev.findIndex(
                    (log) => String(log.chatRoomId) === String(incomingMessage.chatRoomId)
                );
                if (idx < 0) {
                    missing = true;
                    return safePrev;
                }
                const next = [...safePrev];
                next[idx] = {
                    ...next[idx],
                    lastMessage: incomingMessage.content,
                    lastMessageTime: incomingMessage.timestamp,
                    unreadCount: skipUnreadBump
                        ? (next[idx].unreadCount || 0)
                        : (next[idx].unreadCount || 0) + 1,
                };
                return next;
            });

            if (missing) fetchChatLogs();
        });

        return () => {
            if (subscription) subscription.unsubscribe();
        };
    }, [user?.id]);

    const fetchChatLogs = async () => {
        try {
            setIsLoading(true);
            const data = await chatService.getChatLogs();
            console.log('chatlog', data);
            setChatLogs(data);
        } catch (error) {
            console.error('Failed to fetch chat logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const navigatingRef = useRef(false);

    const handleChatRoomPress = (chatRoom) => {
        if (navigatingRef.current) return;
        navigatingRef.current = true;
        setTimeout(() => { navigatingRef.current = false; }, 600);

        // Optimistically clear the badge — server will confirm async
        setChatLogs((prev) =>
            (Array.isArray(prev) ? prev : []).map((log) =>
                log.chatRoomId === chatRoom.chatRoomId
                    ? { ...log, unreadCount: 0 }
                    : log
            )
        );

        // Fire-and-forget markAsRead so the tap-to-open feels instant.
        // chatscreen itself will re-issue markAsRead on mount as a safety net.
        chatService.markAsRead(chatRoom.chatRoomId).catch((err) => {
            console.warn('markAsRead failed (background):', err);
        });

        // Navigate immediately — no awaiting
        router.push({
            pathname: '/chatscreen',
            params: {
                roomId: chatRoom.chatRoomId,
                roomName: chatRoom.tripListName
            }
        });
    };

    // Filter chat logs based on search query, then sort by most-recent activity
    const filteredChatLogs = chatLogs
        .filter(chat =>
            chat.tripListName.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice()
        .sort((a, b) => {
            const ta = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
            const tb = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
            return tb - ta;
        });


    const formatTime = (timestamp) => {
        if (!timestamp) return '';

        const date = parseISO(timestamp);
        const now = new Date();

        const minutesDiff = differenceInMinutes(now, date);
        const hoursDiff = differenceInHours(now, date);
        const daysDiff = differenceInDays(now, date);
        const weeksDiff = differenceInWeeks(now, date);

        if (minutesDiff < 1) return 'just now';
        if (minutesDiff < 60) return `${minutesDiff} min ago`;
        if (hoursDiff < 24) return `${hoursDiff} hr ago`;
        if (daysDiff === 1) return 'yesterday';
        if (daysDiff < 7) return `${daysDiff} days ago`;
        if (weeksDiff < 4) return `${weeksDiff} weeks ago`;

        // For dates further back, you might want to format differently
        return new Date(timestamp).toLocaleDateString();
    };

    const renderParticipantImages = (participants, maxDisplay = 3) => {
        if (!user) return null;
        // 현재 사용자를 제외한 참여자 필터링
        const filteredParticipants = participants.filter(p => p.userName !== user.userName);

        return (
            <View style={styles.participantsContainer}>
                {filteredParticipants.slice(0, maxDisplay).map((participant, index) => (
                    participant.profileImage ? (
                        <ExpoImage
                            key={index}
                            source={{ uri: participant.profileImage }}
                            style={styles.participantImage}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                        />
                    ) : (
                        <View key={index} style={[styles.participantImage, styles.iconContainer]}>
                            <Ionicons name="person" size={14} color="#888" />
                        </View>
                    )
                ))}
                {filteredParticipants.length > maxDisplay && (
                    <View style={styles.extraParticipants}>
                        <Text style={styles.extraParticipantsText}>
                            +{filteredParticipants.length - maxDisplay}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={28} color="#fff" />
                </TouchableOpacity>
                {/* <Text style={styles.title}>Messages</Text> */}
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#666" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search"
                        placeholderTextColor="#ABB7C2"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>
            <Text style={styles.title}>Messages</Text>

            <View style={styles.tabs}>
                <TouchableOpacity onPress={() => setActiveTab('Friends')}>
                    <LinearGradient
                        style={[styles.tab]}
                        colors={activeTab === 'Friends' ? ['#5468ff', '#81d8d0'] : ['#333', '#333']}
                        locations={[0, 1]}
                        useAngle={true}
                        angle={45}
                    >
                        <Text style={styles.tabText}>Friends</Text>
                    </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('Requests')}>
                    <LinearGradient
                        style={[styles.tab]}
                        colors={activeTab === 'Requests' ? ['#5468ff', '#81d8d0'] : ['#333', '#333']}
                        locations={[0, 1]}
                        useAngle={true}
                        angle={45}
                    >
                        <Text style={styles.tabText}>Requests</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <SkeletonPlaceholder
                    backgroundColor="#2a2a2a"
                    highlightColor="#3a3a3a"
                >
                    {Array(5).fill(0).map((_, index) => (
                        <View key={index} style={styles.chatItem}>
                            <SkeletonPlaceholder.Item
                                width={50}
                                height={50}
                                borderRadius={25}
                                marginRight={12}
                            />
                            <View style={styles.chatInfo}>
                                <SkeletonPlaceholder.Item
                                    width={150}
                                    height={20}
                                    borderRadius={4}
                                    marginBottom={8}
                                />
                                <SkeletonPlaceholder.Item
                                    width={200}
                                    height={16}
                                    borderRadius={4}
                                />
                            </View>
                            <View style={styles.metaContainer}>
                                <SkeletonPlaceholder.Item
                                    width={50}
                                    height={14}
                                    borderRadius={4}
                                    marginBottom={8}
                                />
                                <SkeletonPlaceholder.Item
                                    width={20}
                                    height={20}
                                    borderRadius={10}
                                />
                            </View>
                        </View>
                    ))}
                </SkeletonPlaceholder>
            ) : filteredChatLogs.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>You don't have any messages.</Text>
                    <Text style={styles.emptySubText}>Plan your trip and start your first chatting!</Text>
                </View>
            ) : (<FlatList
                data={filteredChatLogs}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.chatItem}
                        onPress={() => handleChatRoomPress(item)}
                    >
                        <ExpoImage
                            source={{ uri: item.tripListImage }}
                            style={styles.avatar}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            transition={150}
                        />
                        <View style={styles.chatInfo}>
                            <Text style={styles.chatName}>{item.tripListName}</Text>
                            <Text style={styles.lastMessage} numberOfLines={1}>
                                {item.lastMessage || 'No messages yet'}
                            </Text>
                        </View>
                        <View style={styles.metaContainer}>
                            <Text style={styles.timestamp}>
                                {formatTime(item.lastMessageTime)}
                            </Text>
                            <View style={styles.badgeContainer}>
                                {item.participants && renderParticipantImages(item.participants)}
                                {item.unreadCount > 0 && (
                                    <View style={styles.unreadBadge}>
                                        <Text style={styles.unreadCount}>{item.unreadCount}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
                keyExtractor={item => item.chatRoomId.toString()}
                onRefresh={handleRefresh}
                refreshing={isRefreshing}
            />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingBottom: 12,
        gap: 16,
    },
    searchContainer: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 12,
        color: '#000',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        marginVertical: 12,
        paddingHorizontal: 12,
    },
    tabs: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        marginBottom: 16,
        gap: 6,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginRight: 8,
    },
    activeTab: {
        backgroundColor: '#5468FF',
    },
    tabText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    activeTabText: {
        fontWeight: '600',
    },
    chatList: {
        paddingHorizontal: 16,
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        justifyContent: 'space-between',
        paddingHorizontal: 12,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    chatInfo: {
        flex: 1,
        marginLeft: 12,
        marginRight: 8,
    },
    chatName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    lastMessage: {
        color: '#666',
        fontSize: 14,
    },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
    },
    participantsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    participantImage: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginLeft: -8,
        borderWidth: 2,
        borderColor: '#000',
    },
    iconContainer: {
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
    },
    extraParticipants: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: -8,
        borderWidth: 2,
        borderColor: '#000',
    },
    extraParticipantsText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
    },
    chatMeta: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: '100%',
    },
    metaContainer: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        minWidth: 80,
    },
    timestamp: {
        color: '#666',
        fontSize: 12,
        marginBottom: 4,
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    unreadCount: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    unreadBadge: {
        backgroundColor: '#81D8D0',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubText: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default MessageList;