import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    FlatList,
    TextInput,
    StyleSheet,
    ActivityIndicator
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../app/src/config';
import { createOrGetDirectMessageRoom } from '../../app/src/api/chat';

const ShareModal = ({ visible, onClose, onSend, chatRooms }) => {
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [activeTab, setActiveTab] = useState('rooms');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchTimeout, setSearchTimeout] = useState(null);

    const normalizeSearchUser = (user) => ({
        ...user,
        userId: user?.userId ?? user?.id ?? null,
        name: user?.name ?? user?.userName ?? 'Unknown user',
        userName: user?.userName ?? user?.username ?? '',
        imageUrl: user?.imageUrl ?? user?.profileImageUrl ?? user?.profileUrl ?? null,
    });

    // Debug logging
    useEffect(() => {
        if (visible) {
            console.log('ShareModal opened');
            console.log('chatRooms:', chatRooms);
            console.log('chatRooms length:', chatRooms?.length);
        }
    }, [visible, chatRooms]);

    // 사용자 검색 함수
    const searchUsers = async (query) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const response = await api.get(
                `/api/users/search?query=${encodeURIComponent(query)}`
            );

            console.log('Search response:', response);
            console.log('Search response.data:', response.data);

            const rawResults = Array.isArray(response.data)
                ? response.data
                : Array.isArray(response.data?.users)
                    ? response.data.users
                    : [];

            if (rawResults.length > 0) {
                const normalizedResults = rawResults
                    .map(normalizeSearchUser)
                    .filter((user) => user.userId);
                console.log('Setting search results:', normalizedResults);
                setSearchResults(normalizedResults);
                console.log('Search results set');
            } else {
                setSearchResults([]);
            }
        } catch (error) {
            console.error('Error searching users:', error);
        } finally {
            setIsSearching(false);
        }
    };

    // 검색어 변경 핸들러 (디바운싱 적용)
    const handleSearchChange = (text) => {
        setSearchQuery(text);

        if (searchTimeout) clearTimeout(searchTimeout);
        const timeout = setTimeout(() => {
            searchUsers(text);
        }, 500);
        setSearchTimeout(timeout);
    };

    // 채팅방 선택
    const handleRoomSelect = (room) => {
        console.log('Selected room:', room);
        setSelectedRoom(room);
        setSelectedUser(null);
    };

    // 사용자 선택
    const handleUserSelect = (user) => {
        console.log('Selected user:', user);
        setSelectedUser(user);
        setSelectedRoom(null);
    };

    // 전송 버튼 핸들러
    const handleSend = async () => {
        if (selectedRoom) {
            console.log('Sending to room:', selectedRoom);
            onSend(selectedRoom);
        } else if (selectedUser) {
            console.log('Creating DM with user:', selectedUser);
            try {
                const targetUserId = selectedUser.userId || selectedUser.id;
                if (!targetUserId) {
                    throw new Error('Selected user is missing an id');
                }

                const chatRoom = await createOrGetDirectMessageRoom(targetUserId);

                const dmRoom = {
                    chatRoomId: chatRoom.chatRoomId || chatRoom.roomId || chatRoom.id,
                    tripListName: selectedUser.name,
                    tripListImage: selectedUser.imageUrl,
                    isDirectMessage: true
                };

                onSend(dmRoom);
            } catch (error) {
                console.error('Error creating DM room:', error);
            }
        }
    };

    // 모달 닫기 시 초기화
    const handleClose = () => {
        setSelectedRoom(null);
        setSelectedUser(null);
        setSearchQuery('');
        setSearchResults([]);
        setActiveTab('rooms');
        onClose();
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={handleClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Share to Chat</Text>
                        <TouchableOpacity onPress={handleClose}>
                            <Text style={styles.modalCloseButton}>Cancel</Text>
                        </TouchableOpacity>
                    </View>

                    {/* 탭 선택 */}
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[
                                styles.tab,
                                activeTab === 'rooms' && styles.activeTab
                            ]}
                            onPress={() => {
                                setActiveTab('rooms');
                                setSearchQuery('');
                                setSearchResults([]);
                            }}
                        >
                            <Text style={[
                                styles.tabText,
                                activeTab === 'rooms' && styles.activeTabText
                            ]}>
                                Chat Rooms
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.tab,
                                activeTab === 'users' && styles.activeTab
                            ]}
                            onPress={() => setActiveTab('users')}
                        >
                            <Text style={[
                                styles.tabText,
                                activeTab === 'users' && styles.activeTabText
                            ]}>
                                Search Users
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* 사용자 검색 탭 */}
                    {activeTab === 'users' && (
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search users..."
                                placeholderTextColor="#888"
                                value={searchQuery}
                                onChangeText={handleSearchChange}
                                autoCapitalize="none"
                            />
                        </View>
                    )}

                    {/* 리스트 렌더링 */}
                    <View style={styles.listContainer}>
                        {console.log('activeTab:', activeTab)}
                        {console.log('chatRooms in render:', chatRooms?.length)}
                        // share_modal.jsx - Replace the rooms tab rendering
                        {activeTab === 'rooms' ? (
                            isSearching || !chatRooms ? (
                                <View style={styles.emptyContainer}>
                                    <ActivityIndicator size="large" color="#5468ff" />
                                    <Text style={styles.emptyText}>Loading chat rooms...</Text>
                                </View>
                            ) : chatRooms.length > 0 ? (
                                <FlatList
                                    data={chatRooms}
                                    keyExtractor={(item, index) =>
                                        item.chatRoomId?.toString() || `room-${index}`
                                    }
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[
                                                styles.listItem,
                                                selectedRoom?.chatRoomId === item.chatRoomId && styles.selectedItem
                                            ]}
                                            onPress={() => handleRoomSelect(item)}
                                        >
                                            <ExpoImage
                                                source={{ uri: item.tripListImage }}
                                                style={styles.avatar}
                                                placeholder={require('../../assets/logo_black.png')}
                                                contentFit="cover"
                                                cachePolicy="memory-disk"
                                            />
                                            <View style={styles.userInfo}>
                                                <Text style={styles.itemName} numberOfLines={1}>
                                                    {item.tripListName}
                                                </Text>
                                                {item.isDirectMessage && (
                                                    <Text style={styles.userName}>Direct Message</Text>
                                                )}
                                            </View>
                                            {selectedRoom?.chatRoomId === item.chatRoomId && (
                                                <Ionicons name="checkmark-circle" size={24} color="#5468ff" />
                                            )}
                                        </TouchableOpacity>
                                    )}
                                    initialNumToRender={10}
                                    maxToRenderPerBatch={10}
                                    windowSize={5}
                                />
                            ) : (
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="chatbubbles-outline" size={60} color="#666" />
                                    <Text style={styles.emptyText}>No chat rooms available</Text>
                                </View>
                            )
                        ) : (
                            // 사용자 검색 결과
                            <>
                                {console.log('searchResults:', searchResults)}
                                {console.log('searchResults length:', searchResults?.length)}
                                {console.log('isSearching:', isSearching)}
                                {isSearching ? (
                                    <View style={styles.loadingContainer}>
                                        <ActivityIndicator size="large" color="#5468ff" />
                                    </View>
                                ) : (
                                    <FlatList
                                        data={searchResults}
                                        keyExtractor={(item, index) =>
                                            (item.userId || item.id) ? String(item.userId || item.id) : `user-${index}`
                                        }
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={[
                                                    styles.listItem,
                                                    (selectedUser?.userId || selectedUser?.id) === (item.userId || item.id) && styles.selectedItem
                                                ]}
                                                onPress={() => handleUserSelect(item)}
                                            >
                                                {item.imageUrl ? (
                                                    <ExpoImage
                                                        source={{ uri: item.imageUrl }}
                                                        style={styles.avatar}
                                                        contentFit="cover"
                                                        cachePolicy="memory-disk"
                                                    />
                                                ) : (
                                                    <View style={styles.avatarPlaceholder}>
                                                        <Ionicons name="person" size={24} color="#888" />
                                                    </View>
                                                )}
                                                <View style={styles.userInfo}>
                                                    <Text style={styles.itemName}>{item.name}</Text>
                                                    <Text style={styles.userName}>@{item.userName || 'unknown'}</Text>
                                                </View>
                                                {(selectedUser?.userId || selectedUser?.id) === (item.userId || item.id) && (
                                                    <Ionicons name="checkmark-circle" size={24} color="#5468ff" />
                                                )}
                                            </TouchableOpacity>
                                        )}
                                        ListEmptyComponent={
                                            <Text style={styles.emptyText}>
                                                {searchQuery ? 'No users found' : 'Search for users to send a message'}
                                            </Text>
                                        }
                                    />
                                )}
                            </>
                        )}
                    </View>

                    {/* 전송 버튼 */}
                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            (!selectedRoom && !selectedUser) && styles.sendButtonDisabled
                        ]}
                        onPress={handleSend}
                        disabled={!selectedRoom && !selectedUser}
                    >
                        <LinearGradient
                            colors={['#5468FF', '#81D8D0']}
                            style={styles.sendButtonGradient}
                        >
                            <Text style={styles.sendButtonText}>Send</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1a1a1a',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 20,
        paddingBottom: 40,
        height: '80%',
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    modalTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalCloseButton: {
        color: '#5468ff',
        fontSize: 16,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#5468ff',
    },
    tabText: {
        color: '#888',
        fontSize: 14,
        fontWeight: '500',
    },
    activeTabText: {
        color: '#fff',
        fontWeight: '600',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2a2a2a',
        borderRadius: 10,
        marginHorizontal: 20,
        marginVertical: 15,
        paddingHorizontal: 15,
        height: 44,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
    },
    listContainer: {
        flex: 1,
        paddingHorizontal: 20,
        minHeight: 200,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 10,
        marginVertical: 4,
    },
    selectedItem: {
        backgroundColor: '#2a2a2a',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    userInfo: {
        flex: 1,
    },
    itemName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    userName: {
        color: '#888',
        fontSize: 14,
        marginTop: 2,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        color: '#888',
        textAlign: 'center',
        marginTop: 40,
        fontSize: 14,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40,
    },
    sendButton: {
        marginHorizontal: 20,
        marginTop: 20,
        borderRadius: 10,
        overflow: 'hidden',
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    sendButtonGradient: {
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ShareModal;
