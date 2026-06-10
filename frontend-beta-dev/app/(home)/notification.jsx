import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    SafeAreaView,
    View,
    FlatList,
    Text,
    RefreshControl,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TouchableWithoutFeedback,
    Alert,
    ActivityIndicator,
    Animated
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchNotifications, markAsRead, markAllAsRead, updateNotificationStatus, useInfiniteNotifications, deleteNotification } from '../src/api/notification';
import { fetchTripListById } from "../src/api/triplist";
import moment from 'moment';
import { Swipeable } from 'react-native-gesture-handler';
import { acceptCollaboratorRequest, declineCollaboratorRequest } from '../src/api/collaborate';
import { TokenManager } from '../src/config';
import { acceptFollowRequest, rejectFollowRequest } from '../src/api/follow';
import { useAiJobStore } from '../src/state/aiJobStore';
import { pollAiResult } from '../src/api/aiGenerate';
import { useFocusEffect } from 'expo-router';
import { DeviceEventEmitter } from 'react-native';
import { NOTIFICATION_EVENT } from '../src/components/NotificationsBridge';


const NotificationSkeleton = () => {
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const opacity = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    const SkeletonItem = () => (
        <View style={styles.notificationItem}>
            <View style={styles.notificationContent}>
                <Animated.View
                    style={[
                        styles.skeletonCircle,
                        { opacity }
                    ]}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Animated.View
                        style={[
                            styles.skeletonLine,
                            { width: '60%', height: 16, marginBottom: 8, opacity }
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.skeletonLine,
                            { width: '90%', height: 14, marginBottom: 6, opacity }
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.skeletonLine,
                            { width: '40%', height: 12, opacity }
                        ]}
                    />
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.notificationList}>
            {[1, 2, 3, 4, 5, 6].map((_, index) => (
                <SkeletonItem key={index} />
            ))}
        </View>
    );
};

const NotificationItem = React.memo(({ item, onPress, onAccept, onDecline, onFollowAccept, onFollowDecline, onDelete, actionLoadingId, actionTypeById, isLoading, pendingActionIds }) => {
    const getTimeDifference = (createdAt) => {
        return moment(createdAt).fromNow();
    };

    const renderRightActions = () => (
        <TouchableOpacity
            style={styles.deleteAction}
            onPress={() => onDelete(item.id)}
        >
            <Ionicons name="trash-outline" size={24} color="#fff" />
        </TouchableOpacity>
    );


    return (
        <Swipeable renderRightActions={renderRightActions}>

            <TouchableOpacity
                style={[
                    styles.notificationItem,
                    item.isRead && styles.notificationItemRead
                ]}
                onPress={() => onPress(item)}
                activeOpacity={0.85}
            >
                <View style={styles.notificationContent}>
                    {!item.isRead && <View style={styles.unreadDot} />}
                    <ExpoImage
                        source={{ uri: item.imageUrl }}
                        style={styles.senderImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                    />
                    <View style={styles.notificationAndButtonsContainer}>
                        <View style={styles.notificationTextContainer}>
                            <Text style={styles.senderName}>{item.senderName}</Text>
                            <Text style={styles.message}>{item.message}</Text>
                            <Text style={styles.timeAgo}>{getTimeDifference(item.createdAt)}</Text>
                        </View>

                        {item.type === 'COLLABORATOR_REQUESTED' && (
                            <ActionButtons
                                item={item}
                                onAccept={onAccept}
                                onDecline={onDecline}
                                actionLoadingId={actionLoadingId}
                                actionTypeById={actionTypeById}
                                isLoading={isLoading}
                                pendingActionIds={pendingActionIds}
                            />
                        )}
                        {item.type === 'FOLLOW_REQUEST' && (
                            <FollowActionButtons
                                item={item}
                                onAccept={onFollowAccept}
                                onDecline={onFollowDecline}
                                actionLoadingId={actionLoadingId}
                                actionTypeById={actionTypeById}
                                isLoading={isLoading}
                                pendingActionIds={pendingActionIds}
                            />
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        </Swipeable>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.item.id === nextProps.item.id &&
        prevProps.item.isRead === nextProps.item.isRead &&
        prevProps.item.status === nextProps.item.status &&
        prevProps.item.type === nextProps.item.type &&
        prevProps.item.message === nextProps.item.message &&
        prevProps.item.imageUrl === nextProps.item.imageUrl &&
        prevProps.item.senderName === nextProps.item.senderName &&
        prevProps.actionLoadingId === nextProps.actionLoadingId &&
        prevProps.actionTypeById === nextProps.actionTypeById &&
        prevProps.isLoading === nextProps.isLoading &&
        prevProps.pendingActionIds === nextProps.pendingActionIds
    );
});

const ActionButtons = React.memo(({ item, onAccept, onDecline, actionLoadingId, actionTypeById, isLoading, pendingActionIds }) => {
    const isPending = pendingActionIds.has(item.id);
    const currentActionType = actionTypeById[item.id];

    if (item.status === 'PENDING') {
        return (
            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => onAccept(item)}
                    disabled={isPending}
                >
                    {actionLoadingId === item.id && currentActionType === 'accept' ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Accept</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.declineButton}
                    onPress={() => onDecline(item)}
                    disabled={isPending || isLoading}
                >
                    {actionLoadingId === item.id && currentActionType === 'decline' ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Decline</Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    }

    if (item.status === 'ACCEPTED') {
        return (
            <View style={styles.acceptedStatus}>
                <Text style={styles.acceptedText}>Accepted</Text>
            </View>
        );
    }

    if (item.status === 'DECLINED') {
        return (
            <View style={styles.declinedStatus}>
                <Text style={styles.declinedText}>Declined</Text>
            </View>
        );
    }

    return null;
});

const FollowActionButtons = React.memo(({ item, onAccept, onDecline, actionLoadingId, actionTypeById, isLoading, pendingActionIds }) => {
    const isPending = pendingActionIds.has(item.id);
    const currentActionType = actionTypeById[item.id];

    if (item.status === 'PENDING') {
        return (
            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => onAccept(item)}
                    disabled={isPending || isLoading}
                >
                    {actionLoadingId === item.id && currentActionType === 'accept' ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Accept</Text>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.declineButton}
                    onPress={() => onDecline(item)}
                    disabled={isPending || isLoading}
                >
                    {actionLoadingId === item.id && currentActionType === 'decline' ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Decline</Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    }

    if (item.status === 'ACCEPTED') {
        return (
            <View style={styles.acceptedStatus}>
                <Text style={styles.acceptedText}>Accepted</Text>
            </View>
        );
    }

    if (item.status === 'DECLINED') {
        return (
            <View style={styles.declinedStatus}>
                <Text style={styles.declinedText}>Declined</Text>
            </View>
        );
    }

    return null;
});

const notification = () => {
    const params = useLocalSearchParams();
    const router = useRouter();
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const {
        notifications,
        setNotifications,
        loading: loadingMore,
        hasMore,
        loadMore,
        refresh
    } = useInfiniteNotifications();

    const [loadError, setLoadError] = useState(false);
    const [isModalVisible, setModalVisible] = useState(false);
    const [menuButtonPosition, setMenuButtonPosition] = useState({ top: 0, left: 0 });
    const menuButtonRef = useRef(null);
    const [isLoading, setIsLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState(null);
    const [pendingActionIds, setPendingActionIds] = useState(() => new Set());
    const [actionTypeById, setActionTypeById] = useState({});
    const { getJob, complete: completeJob, dismiss: dismissJob } = useAiJobStore();

    // 화면 mount 시 + 다른 화면 갔다 돌아올 때마다 fresh fetch.
    // useEffect와 useFocusEffect를 동시에 두면 mount 시점에 이중 fetch가 일어나
    // WS로 prepend된 row를 server 결과로 덮어쓰는 race가 생긴다 — 한쪽만 사용.
    useFocusEffect(useCallback(() => {
        const loadInitialData = async () => {
            setLoadError(false);
            try {
                await refresh();
            } catch (error) {
                console.error('Error loading notifications:', error);
                setLoadError(true);
            }
        };
        loadInitialData();
    }, [refresh]));

    // 알림 메시지는 root의 NotificationsBridge가 항상 subscribe하고 있다.
    // 화면 mount/unmount로 인한 sub 흔들림 race를 피하기 위해 여기선 EventEmitter로만 listen.
    useEffect(() => {
        const sub = DeviceEventEmitter.addListener(NOTIFICATION_EVENT, () => {
            refresh().catch(() => {});
        });
        return () => sub.remove();
    }, [refresh]);

    const showInitialSkeleton = !loadError && notifications.length === 0 && loadingMore;

    useEffect(() => {
        const getCurrentUser = async () => {
            try {
                const userData = await TokenManager.getUserData();
                console.log('Current user:', userData);
                setUser(userData);
            } catch (error) {
                console.error('Error getting user data:', error);
            }
        };
        getCurrentUser();
    }, []);

    const handleNotificationPress = useCallback(async (item) => {
        setIsLoading(true);
        try {
            await markAsRead(item.id);

            // 팔로우 관련 알림 → Public Profile로 이동
            if (item.type === 'FOLLOW_REQUEST' ||
                item.type === 'FOLLOW' ||
                item.type === 'FOLLOW_REQUEST_ACCEPTED' ||
                item.type === 'FOLLOW_REQUEST_CANCELLED') {
                router.push({
                    pathname: '/publicprofile',
                    params: {
                        userId: item.senderId,
                        userName: item.senderName,
                        from: 'notification',
                    }
                });
                return;
            }

            // AI 비동기 트립리스트 처리 중 — 사용자에게 진행 상태만 안내
            if (item.type === 'AI_TRIPLIST_PENDING') {
                Alert.alert(
                    'Still working on it',
                    "Your AI trip plan is still being generated. We'll notify you when it's ready."
                );
                return;
            }

            // AI 비동기 트립리스트 완료 — 결과 페이지(/triplist)로 이동.
            // 큰 JSON을 params로 직렬화하지 않고 aiRequestId만 넘겨, triplist에서 store로 읽음.
            if (item.type === 'AI_TRIPLIST_COMPLETE' && item.aiRequestId) {
                const cached = getJob(item.aiRequestId);
                const hasResult = cached?.status === 'complete'
                    && cached.result && Array.isArray(cached.result.itinerary);
                if (!hasResult) {
                    try {
                        const result = await pollAiResult(item.aiRequestId);
                        completeJob(item.aiRequestId, result, cached?.type || 'general');
                    } catch (e) {
                        Alert.alert('Error', "Couldn't load the AI trip result.");
                        return;
                    }
                }
                router.push({
                    pathname: '/triplist',
                    params: {
                        isEditMode: 'true',
                        aiRequestId: item.aiRequestId,
                    }
                });
                return;
            }

            // AI 트립리스트 실패 — 입력 화면으로 복귀
            if (item.type === 'AI_TRIPLIST_FAILED') {
                const cached = item.aiRequestId ? getJob(item.aiRequestId) : null;
                const payload = cached?.requestPayload || {};
                router.push({
                    pathname: '/aifilter',
                    params: {
                        location: (payload.regions || []).join(','),
                        categories: (payload.categories || []).join(','),
                        groupSize: payload.groupType || '',
                        startDate: payload.startDate || '',
                        endDate: payload.endDate || '',
                    }
                });
                if (item.aiRequestId) dismissJob(item.aiRequestId);
                return;
            }

            // 나머지 알림 → TripList 상세로 이동
            if (item.tripListId) {
                const tripDetails = await fetchTripListById(item.tripListId);
                if (tripDetails) {
                    router.push({
                        pathname: '/list_details',
                        params: {
                            from: 'notification',
                            tripListId: tripDetails.tripListId,
                            tripDetails: JSON.stringify(tripDetails),
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error handling notification press:', error);
            Alert.alert('Error', 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [router, getJob, completeJob, dismissJob]);

    const handleMarkAllAsRead = async () => {
        try {
            setIsLoading(true);
            const response = await markAllAsRead();
            if (response) {
                await refresh();
                setModalVisible(false);
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
            Alert.alert('Error', 'Failed to mark all as read.');
        } finally {
            setIsLoading(false);
        }
    };

    const showMenu = () => {
        menuButtonRef.current.measure((fx, fy, width, height, px, py) => {
            const buttonWidth = width;
            const modalWidth = 150;
            const leftPosition = px + buttonWidth - modalWidth;
            setMenuButtonPosition({ top: py + height, left: leftPosition });
            setModalVisible(true);
        });
    };

    // 낙관적 업데이트로 개선
    const handleAccept = useCallback(async (item) => {
        if (pendingActionIds.has(item.id)) return;

        setPendingActionIds(prev => new Set(prev).add(item.id));
        setActionTypeById(prev => ({ ...prev, [item.id]: 'accept' }));
        setActionLoadingId(item.id);

        // 1. 먼저 UI 업데이트
        setNotifications(prev =>
            prev.map(n => n.id === item.id ? { ...n, status: 'ACCEPTED' } : n)
        );

        try {
            await acceptCollaboratorRequest(item.tripListId, item.senderId, user.id);
            await updateNotificationStatus(item.id, 'ACCEPTED');
        } catch (error) {
            // 2. 실패시 롤백
            setNotifications(prev =>
                prev.map(n => n.id === item.id ? { ...n, status: 'PENDING' } : n)
            );
            Alert.alert('Error', 'Failed to accept request.');
        } finally {
            setActionLoadingId(null);
            setPendingActionIds(prev => {
                const next = new Set(prev);
                next.delete(item.id);
                return next;
            });
            setActionTypeById(prev => {
                const next = { ...prev };
                delete next[item.id];
                return next;
            });
        }
    }, [pendingActionIds, user, setNotifications]);

    const handleDecline = useCallback(async (item) => {
        if (pendingActionIds.has(item.id)) return;

        setPendingActionIds(prev => new Set(prev).add(item.id));
        setActionTypeById(prev => ({ ...prev, [item.id]: 'decline' }));
        setActionLoadingId(item.id);
        setIsLoading(true);
        try {
            await declineCollaboratorRequest(item.tripListId);
            await updateNotificationStatus(item.id, 'DECLINED');
            await refresh();
        } catch (error) {
            console.error('Error declining collaborator request:', error);
            Alert.alert('Error', 'Failed to decline request.');
        } finally {
            setActionLoadingId(null);
            setIsLoading(false);
            setPendingActionIds(prev => {
                const next = new Set(prev);
                next.delete(item.id);
                return next;
            });
            setActionTypeById(prev => {
                const next = { ...prev };
                delete next[item.id];
                return next;
            });
        }
    }, [pendingActionIds, refresh]);

    const handleFollowAccept = useCallback(async (item) => {
        if (pendingActionIds.has(item.id)) return;

        setPendingActionIds(prev => new Set(prev).add(item.id));
        setActionTypeById(prev => ({ ...prev, [item.id]: 'accept' }));
        setActionLoadingId(item.id);
        setIsLoading(true);
        try {
            await acceptFollowRequest(item.requestId);
            await updateNotificationStatus(item.id, 'ACCEPTED');
            await refresh();
        } catch (error) {
            console.error('Error accepting follow request:', error);
            Alert.alert('Error', 'Failed to accept follow request.');
        } finally {
            setActionLoadingId(null);
            setIsLoading(false);
            setPendingActionIds(prev => {
                const next = new Set(prev);
                next.delete(item.id);
                return next;
            });
            setActionTypeById(prev => {
                const next = { ...prev };
                delete next[item.id];
                return next;
            });
        }
    }, [pendingActionIds, refresh]);

    const handleFollowDecline = useCallback(async (item) => {
        if (pendingActionIds.has(item.id)) return;

        setPendingActionIds(prev => new Set(prev).add(item.id));
        setActionTypeById(prev => ({ ...prev, [item.id]: 'decline' }));
        setActionLoadingId(item.id);
        setIsLoading(true);
        try {
            await rejectFollowRequest(item.requestId);
            await updateNotificationStatus(item.id, 'DECLINED');
            await refresh();
        } catch (error) {
            console.error('Error declining follow request:', error);
            Alert.alert('Error', 'Failed to decline follow request.');
        } finally {
            setActionLoadingId(null);
            setIsLoading(false);
            setPendingActionIds(prev => {
                const next = new Set(prev);
                next.delete(item.id);
                return next;
            });
            setActionTypeById(prev => {
                const next = { ...prev };
                delete next[item.id];
                return next;
            });
        }
    }, [pendingActionIds, refresh]);


    const handleDelete = useCallback(async (notificationId) => {
        Alert.alert(
            'Delete Notification',
            'Are you sure you want to delete this notification?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteNotification(notificationId);
                            setNotifications(prev => prev.filter(item => item.id !== notificationId));
                            Alert.alert('Success', 'Notification deleted');
                        } catch (error) {
                            console.error('Error deleting notification:', error);
                            if (error.message === 'Notification not found') {
                                setNotifications(prev => prev.filter(item => item.id !== notificationId));
                                Alert.alert('Info', 'Notification was already deleted.');
                                return;
                            }
                            if (error.message === 'Access denied') {
                                Alert.alert('Error', 'You do not have permission to delete this notification.');
                                return;
                            }
                            Alert.alert('Error', 'Failed to delete notification');
                        }
                    },
                },
            ]
        );
    }, [refresh]);

    const renderItem = useCallback(({ item }) => (
        <NotificationItem
            item={item}
            onPress={handleNotificationPress}
            onAccept={handleAccept}
            onDecline={handleDecline}
            onFollowAccept={handleFollowAccept}
            onFollowDecline={handleFollowDecline}
            onDelete={handleDelete}
            actionLoadingId={actionLoadingId}
            actionTypeById={actionTypeById}
            isLoading={isLoading}
            pendingActionIds={pendingActionIds}
        />
    ), [
        actionLoadingId,
        actionTypeById,
        isLoading,
        pendingActionIds,
        handleNotificationPress,
        handleAccept,
        handleDecline,
        handleFollowAccept,
        handleFollowDecline,
        handleDelete
    ]);

    const fetchNotificationData = useCallback(async () => {
        setRefreshing(true);
        try {
            await refresh();
        } catch (error) {
            console.error('Error fetching notifications:', error);
            Alert.alert('Refresh Failed', 'Unable to refresh notifications.');
        } finally {
            setRefreshing(false);
        }
    }, [refresh]);

    const shouldShowEmpty =
        !showInitialSkeleton &&
        !loadError &&
        !refreshing &&
        !loadingMore &&
        notifications.length === 0;

    // 빈 상태 UI
    const renderEmptyState = () => {
        if (showInitialSkeleton || refreshing) return null;

        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="notifications-off-outline" size={80} color="#ccc" />
                <Text style={styles.emptyTitle}>No Notifications</Text>
                <Text style={styles.emptySubtitle}>
                    You're all caught up! We'll notify you when something new happens.
                </Text>
            </View>
        );
    };

    // 에러 상태 UI
    const renderErrorState = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={80} color="#ff6b6b" />
            <Text style={styles.emptyTitle}>Failed to Load</Text>
            <Text style={styles.emptySubtitle}>
                Unable to load notifications. Please check your connection.
            </Text>

            <TouchableOpacity
                style={styles.retryButton}
                onPress={async () => {
                    setLoadError(false);
                    try {
                        await refresh();
                    } catch (error) {
                        setLoadError(true);
                    }
                }}
            >
                <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
        </View>
    );

    // 초기 로딩 UI
    if (showInitialSkeleton) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.backButton}>
                            <Ionicons name="chevron-back" size={24} color="white" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Notification</Text>
                        <View style={styles.menuButton} />
                    </View>
                    <NotificationSkeleton />
                </View>
            </SafeAreaView>
        );
    }

    // 에러 상태
    if (loadError) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.backButton}>
                            <Ionicons name="chevron-back" size={24} color="white" />
                        </TouchableOpacity>
                        <Text
                            style={styles.headerTitle}
                            pointerEvents="none"
                        >
                            Notification</Text>
                        <View style={styles.menuButton} />
                    </View>
                    {renderErrorState()}
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}>
                        <Ionicons name="chevron-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text
                        style={styles.headerTitle}
                        pointerEvents="none"
                    >
                        Notification</Text>
                    {notifications.length > 0 ? (
                        <TouchableOpacity
                            ref={menuButtonRef}
                            style={styles.menuButton}
                            onPress={showMenu}
                        >
                            <Ionicons name="ellipsis-horizontal" size={24} color="white" />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.menuButton} />
                    )}
                </View>

                <FlatList
                    data={notifications}
                    extraData={notifications}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={[
                        styles.notificationList,
                        notifications.length === 0 && styles.emptyListContent
                    ]}
                    removeClippedSubviews={false}
                    maxToRenderPerBatch={10}
                    updateCellsBatchingPeriod={50}
                    windowSize={10}
                    initialNumToRender={10}
                    getItemLayout={(data, index) => ({
                        length: 90,
                        offset: 90 * index,
                        index,
                    })}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={fetchNotificationData}
                            colors={["#fff"]}
                            tintColor="#fff"
                        />
                    }
                    onEndReached={() => hasMore && !loadingMore && loadMore()}
                    onEndReachedThreshold={0.3}
                    ListEmptyComponent={shouldShowEmpty ? renderEmptyState : null}
                    ListFooterComponent={() => {
                        // 초기 로딩 중에는 Footer 안 보이게
                        if (showInitialSkeleton) return null;

                        // 페이지네이션 로딩만 표시
                        if (loadingMore && notifications.length > 0) {
                            return (
                                <View style={{ padding: 20, alignItems: 'center' }}>
                                    <ActivityIndicator size="small" color="#007AFF" />
                                </View>
                            );
                        }

                        return null;
                    }}
                />

                <Modal
                    transparent={true}
                    visible={isModalVisible}
                    animationType="fade"
                    onRequestClose={() => setModalVisible(false)}
                >
                    <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                        <View style={styles.modalOverlay}>
                            <View style={[styles.modalContainer, { top: menuButtonPosition.top, left: menuButtonPosition.left }]}>
                                <TouchableOpacity style={styles.modalItem} onPress={handleMarkAllAsRead}>
                                    <Text style={styles.modalItemText}>Read All</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
            </View>
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
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#000',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    backButton: {
        width: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        position: 'absolute',
        left: 0,
        right: 0,
        textAlign: 'center',
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },

    menuButton: {
        width: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationList: {
        paddingHorizontal: 10,
        paddingTop: 10,
    },
    notificationItem: {
        backgroundColor: '#111',
        paddingVertical: 15,
        borderRadius: 8,
        marginBottom: 10,
    },
    notificationItemRead: {
        opacity: 0.55,
    },
    notificationContent: {
        flexDirection: 'row', // Align items horizontally
        alignItems: 'center',
    },
    notificationAndButtonsContainer: {
        flex: 1,  // Fill remaining space
        flexDirection: 'row',  // Align buttons next to notification text
        justifyContent: 'space-between',  // Separate notification text and buttons
        alignItems: 'center',  // Center vertically
        paddingHorizontal: 5,
    },
    senderImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginHorizontal: 5,
    },
    notificationTextContainer: {
        flex: 1,  // Ensure text takes up space
        justifyContent: 'center',
    },
    senderName: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    message: {
        color: '#fff',
        fontSize: 14,
    },
    timeAgo: {
        color: '#888',
        fontSize: 12,
        marginTop: 5, // Add spacing between the message and time ago
    },
    actionButtons: {
        flexDirection: 'row',
        marginLeft: 10,
    },
    acceptButton: {
        backgroundColor: '#5468FF',
        borderRadius: 8,
        paddingVertical: 5,
        paddingHorizontal: 10,
        marginRight: 10,
    },
    declineButton: {
        backgroundColor: '#888',
        borderRadius: 8,
        paddingVertical: 5,
        paddingHorizontal: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 14,
    },
    acceptedStatus: {
        backgroundColor: '#888',
        borderRadius: 8,
        paddingVertical: 5,
        paddingHorizontal: 10,
        marginLeft: 10,
    },
    acceptedText: {
        color: '#fff',
        fontSize: 14,
    },
    declinedStatus: {
        backgroundColor: '#444',
        borderRadius: 8,
        paddingVertical: 5,
        paddingHorizontal: 10,
        marginLeft: 10,
    },
    declinedText: {
        color: '#fff',
        fontSize: 14,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#5468FF',
        marginHorizontal: 8,
        marginLeft: 5,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',  // Dark background with transparency
    },
    modalContainer: {
        position: 'absolute',
        backgroundColor: '#333',
        width: 150,
        borderRadius: 8,
        paddingVertical: 4,
    },
    modalItem: {
        paddingVertical: 15,
        alignItems: 'center',
    },
    modalItemText: {
        color: '#fff',
        fontSize: 16,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#aaa',
        textAlign: 'center',
        lineHeight: 20,
    },
    emptyListContent: {
        flexGrow: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#666',
    },
    retryButton: {
        marginTop: 20,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#007AFF',
        borderRadius: 8,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    skeletonCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#333',
        marginHorizontal: 5,
    },
    skeletonLine: {
        backgroundColor: '#333',
        borderRadius: 4,
    },
    deleteAction: {
        backgroundColor: '#ff3b30',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '100%',
        borderRadius: 8,
        marginBottom: 10,
    },

});

export default notification;
