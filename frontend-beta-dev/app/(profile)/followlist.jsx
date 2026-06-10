import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    FlatList,
    ActivityIndicator
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TokenManager, API_BASE_URL } from '../src/config';

const FollowList = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { type, userId, userName } = params; // type: 'followers' 또는 'following'

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [updatingUserIds, setUpdatingUserIds] = useState(() => new Set());
    const updatingUserIdsRef = useRef(new Set());

    const normalizeFollowStatus = (status) => {
        if (!status) return 'NOT_FOLLOWING';
        const normalized = String(status).toUpperCase();
        if (normalized === 'FOLLOWING') return 'FOLLOWING';
        if (normalized === 'PENDING' || normalized === 'REQUESTED' || normalized === 'FOLLOW_REQUESTED') return 'PENDING';
        if (normalized === 'SELF') return 'SELF';
        return 'NOT_FOLLOWING';
    };

    // 사용자 목록 불러오기
    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const token = await TokenManager.getAccessToken();
            if (!token) {
                router.push('/login');
                return;
            }

            // API 엔드포인트 결정 (본인 또는 특정 사용자의 팔로워/팔로잉)
            let endpoint = '';
            if (userId) {
                endpoint = `${API_BASE_URL}/api/follows/v1/${type}/${userId}`;
            } else {
                endpoint = `${API_BASE_URL}/api/follows/v1/${type}`;
            }

            const response = await fetch(endpoint, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }

            const data = await response.json();
            setUsers(data);

            // 현재 사용자 정보도 가져오기 (팔로우 상태 확인을 위해)
            const currentUserData = await TokenManager.getUserData();
            setCurrentUser(currentUserData);

        } catch (err) {
            console.error('Error fetching users:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [type, userId, router]);

    // 팔로우/언팔로우 처리
    const handleToggleFollow = async (targetUserId) => {
        if (updatingUserIdsRef.current.has(targetUserId)) return;
        updatingUserIdsRef.current.add(targetUserId);

        setUpdatingUserIds((prev) => {
            const next = new Set(prev);
            next.add(targetUserId);
            return next;
        });

        try {
            const token = await TokenManager.getAccessToken();

            // 현재 팔로우 상태 확인
            const user = users.find(u => u.id === targetUserId);
            const currentStatus = normalizeFollowStatus(user?.followStatus);
            const isFollowing = currentStatus === 'FOLLOWING' || currentStatus === 'PENDING';

            // API 호출
            const method = isFollowing ? 'DELETE' : 'POST';
            const response = await fetch(`${API_BASE_URL}/api/follows/v1/${targetUserId}`, {

                method: method,
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to update follow status');
            }

            let responseData = {};
            try {
                responseData = await response.json();
            } catch (parseError) {
                responseData = {};
            }

            const serverStatus = normalizeFollowStatus(responseData.followStatus || responseData.status);
            const nextStatus = serverStatus !== 'NOT_FOLLOWING'
                ? serverStatus
                : (isFollowing ? 'NOT_FOLLOWING' : 'FOLLOWING');

            // 상태 업데이트
            setUsers(prevUsers =>
                prevUsers.map(u =>
                    u.id === targetUserId
                        ? {
                            ...u,
                            followStatus: nextStatus,
                        }
                        : u
                )
            );

        } catch (err) {
            console.error('Error toggling follow:', err);
            // 에러 처리 (필요시 사용자에게 알림)
        } finally {
            updatingUserIdsRef.current.delete(targetUserId);
            setUpdatingUserIds((prev) => {
                const next = new Set(prev);
                next.delete(targetUserId);
                return next;
            });
        }
    };

    // 처음 로드 시 데이터 가져오기
    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // 사용자 항목 렌더링
    const renderUserItem = ({ item }) => {
        console.log('users', item);
        const normalizedFollowStatus = normalizeFollowStatus(item.followStatus);
        const isFollowing = normalizedFollowStatus === 'FOLLOWING';
        const isPending = normalizedFollowStatus === 'PENDING';
        const isSelf = normalizedFollowStatus === 'SELF';
        const isUpdatingFollow = updatingUserIds.has(item.id);

        return (
            <TouchableOpacity
                style={styles.userItem}
                onPress={() => router.push({
                    pathname: '/publicprofile',
                    params: { userId: item.id }
                })}
            >

                <View style={styles.userInfo}>
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
                    <View style={styles.userTextInfo}>
                        <Text style={styles.userName}>{item.name}</Text>
                        <Text style={styles.userHandle}>@{item.userName}</Text>
                    </View>
                </View>

                {!isSelf && (
                    isFollowing ? (
                        <TouchableOpacity
                            style={[styles.profileButton, styles.followButton, isUpdatingFollow && styles.disabledFollowButton]}
                            onPress={() => handleToggleFollow(item.id)}
                            disabled={isUpdatingFollow}
                        >
                            <Text style={[styles.buttonText, styles.followButtonText]}>{isUpdatingFollow ? 'Updating...' : 'Following'}</Text>
                        </TouchableOpacity>
                    ) : isPending ? (
                        <TouchableOpacity
                            style={[styles.profileButton, styles.followButton, isUpdatingFollow && styles.disabledFollowButton]}
                            onPress={() => handleToggleFollow(item.id)}
                            disabled={isUpdatingFollow}
                        >
                            <Text style={[styles.buttonText, styles.followButtonText]}>{isUpdatingFollow ? 'Updating...' : 'Requested'}</Text>
                        </TouchableOpacity>
                    ) : (
                        <LinearGradient
                            style={[styles.gradientProfileButton, isUpdatingFollow && styles.disabledFollowButton]}
                            colors={['#5468ff', '#81d8d0']}
                            locations={[0, 1]}
                            useAngle={true}
                            angle={45}
                        >
                            <TouchableOpacity
                                style={styles.gradientButton}
                                onPress={() => handleToggleFollow(item.id)}
                                disabled={isUpdatingFollow}
                            >
                                <Text style={styles.buttonText}>{isUpdatingFollow ? 'Updating...' : 'Follow'}</Text>
                            </TouchableOpacity>
                        </LinearGradient>
                    )
                )}
            </TouchableOpacity>
        );
    };

    const title = type === 'followers' ? 'Followers' : 'Following';
    const screenTitle = userName ? `${userName}'s ${title}` : title;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{screenTitle}</Text>
                <View style={styles.placeholder} />
            </View>

            {loading ? (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color="#fff" />
                </View>
            ) : error ? (
                <View style={styles.centerContent}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={fetchUsers}
                    >
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : users.length === 0 ? (
                <View style={styles.centerContent}>
                    <Text style={styles.emptyText}>
                        {type === 'followers'
                            ? 'No followers yet'
                            : 'Not following anyone yet'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={users}
                    renderItem={renderUserItem}
                    keyExtractor={(item) => item.id.toString()}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    placeholder: {
        width: 32,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: '#ff5252',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 16,
    },
    retryButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#333',
        borderRadius: 20,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyText: {
        color: '#888',
        fontSize: 16,
        textAlign: 'center',
    },
    listContent: {
        padding: 16,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: '#333',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userTextInfo: {
        marginLeft: 12,
    },
    userName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    userHandle: {
        color: '#888',
        fontSize: 14,
    },
    followButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#1D9BF0',
        borderRadius: 20,
        minWidth: 90,
        alignItems: 'center',
    },
    followButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    followingButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#555',
    },
    followingButtonText: {
        color: '#fff',
    },
    gradientProfileButton: {
        height: 36,
        width: 90,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gradientButton: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileButton: {
        borderColor: 'white',
        borderWidth: 1,
        height: 36,
        width: 90,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    followButton: {
        backgroundColor: '#fff',
    },
    buttonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    followButtonText: {
        color: '#000',
    },
    disabledFollowButton: {
        opacity: 0.6,
    },
});

export default FollowList;
