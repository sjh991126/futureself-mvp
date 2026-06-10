import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { getBlockedUsers, unblockUser } from '../src/api/blocks';
import { fetchPosts } from '../slices/postsSlice';
import ConfirmationModal from '../../assets/components/ConfirmationModal';

const BlockedUsersScreen = () => {
    const router = useRouter();
    const dispatch = useDispatch();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [unblockTarget, setUnblockTarget] = useState(null);
    const [unblockInFlight, setUnblockInFlight] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError('');
        try {
            const data = await getBlockedUsers();
            setUsers(data);
        } catch (e) {
            setError('Could not load your blocked users. Pull to refresh.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useFocusEffect(useCallback(() => {
        load(true);
    }, [load]));

    const handleUnblockConfirm = async () => {
        if (!unblockTarget) return;
        setUnblockInFlight(true);
        try {
            await unblockUser(unblockTarget.userId);
            setUsers((prev) => prev.filter((u) => u.userId !== unblockTarget.userId));
            // Their posts are eligible to reappear, refresh the feed cache.
            dispatch(fetchPosts());
        } catch (e) {
            setError('Could not unblock that user. Please try again.');
        } finally {
            setUnblockInFlight(false);
            setUnblockTarget(null);
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.row}>
            <TouchableOpacity
                style={styles.userBlock}
                onPress={() => router.push({ pathname: '/publicprofile', params: { userId: item.userId } })}
            >
                {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                        <Ionicons name="person" size={18} color="#888" />
                    </View>
                )}
                <View style={styles.userText}>
                    <Text style={styles.name} numberOfLines={1}>{item.name || item.userName || 'User'}</Text>
                    {!!item.userName && (
                        <Text style={styles.username} numberOfLines={1}>@{item.userName}</Text>
                    )}
                </View>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.unblockButton}
                onPress={() => setUnblockTarget(item)}
            >
                <Text style={styles.unblockText}>Unblock</Text>
            </TouchableOpacity>
        </View>
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="shield-checkmark-outline" size={36} color="#666" />
            <Text style={styles.emptyTitle}>No one is blocked</Text>
            <Text style={styles.emptyBody}>
                Anyone you block from a profile or post will show up here. They will not be able to see your posts and you will not see theirs.
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>Blocked Users</Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#fff" />
                </View>
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={(item) => String(item.blockId ?? item.userId)}
                    renderItem={renderItem}
                    ListHeaderComponent={!!error && (
                        <Text style={styles.errorText}>{error}</Text>
                    )}
                    ListEmptyComponent={renderEmpty}
                    contentContainerStyle={users.length === 0 ? styles.emptyListContent : styles.listContent}
                    refreshControl={(
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                load(true);
                            }}
                            tintColor="#fff"
                        />
                    )}
                />
            )}

            <ConfirmationModal
                visible={!!unblockTarget}
                title={`Unblock ${unblockTarget?.userName ? '@' + unblockTarget.userName : 'this user'}?`}
                message="They will be able to see your activity again and their content will reappear in your feed."
                confirmText={unblockInFlight ? 'Unblocking...' : 'Unblock'}
                cancelText="Cancel"
                onConfirm={handleUnblockConfirm}
                onCancel={() => !unblockInFlight && setUnblockTarget(null)}
            />
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
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 20,
        position: 'relative',
    },
    backButton: {
        position: 'absolute',
        left: 14,
        padding: 4,
    },
    title: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 32,
    },
    emptyListContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: 32,
        justifyContent: 'center',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#222',
    },
    userBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: '#333',
    },
    avatarFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    userText: {
        flex: 1,
    },
    name: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    username: {
        color: '#abb7c2',
        fontSize: 12,
        marginTop: 2,
    },
    unblockButton: {
        backgroundColor: '#25282d',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    unblockText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    errorText: {
        color: '#ff6b6b',
        fontSize: 13,
        marginBottom: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    emptyTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginTop: 12,
    },
    emptyBody: {
        color: '#abb7c2',
        fontSize: 13,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 18,
    },
});

export default BlockedUsersScreen;
