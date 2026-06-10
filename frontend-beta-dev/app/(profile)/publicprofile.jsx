import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Share, SafeAreaView, Modal, TouchableWithoutFeedback } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch } from 'react-redux';
import NavBar from '../../assets/components/navbar';
import ConfirmationModal from '../../assets/components/ConfirmationModal';
import ReportModal from '../../assets/components/ReportModal';
import api, { API_BASE_URL, TokenManager } from '../src/config';
import { createOrGetDirectMessageRoom } from '../src/api/chat';
import { useSingleFlightAction } from '../src/hooks/useSingleFlightAction';
import { blockUser, getBlockStatus, unblockUser } from '../src/api/blocks';
import { REPORT_TARGET_TYPES } from '../src/api/reports';
import { fetchPosts, removePostsByUser } from '../slices/postsSlice';

const ProfileSkeleton = () => (
    <View style={styles.container}>
        <SafeAreaView style={styles.profilePage}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <View style={styles.headerRight} />
            </View>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.profileHeader}>
                    <View style={[styles.skeletonBase, styles.profilePicSkeleton]} />
                    <View style={[styles.skeletonBase, styles.nameSkeleton]} />
                    <View style={[styles.skeletonBase, styles.usernameSkeleton]} />
                    <View style={styles.buttonContainer}>
                        <View style={[styles.skeletonBase, styles.buttonSkeleton]} />
                        <View style={[styles.skeletonBase, styles.buttonSkeleton]} />
                    </View>
                </View>

                <View style={[styles.skeletonBase, styles.titleSkeleton]} />

                {[1, 2, 3].map((_, index) => (
                    <View key={index} style={[styles.tripListItem, styles.skeletonMargin]}>
                        <View style={[styles.skeletonBase, styles.tripImageSkeleton]} />
                        <View style={styles.tripInfo}>
                            <View style={[styles.skeletonBase, styles.tripNameSkeleton]} />
                            <View style={[styles.skeletonBase, styles.tripItemsSkeleton]} />
                        </View>
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    </View>
);

const PublicProfile = () => {
    const router = useRouter();
    const dispatch = useDispatch();
    const [user, setUser] = useState({});
    const { userId } = useLocalSearchParams();

    const [userData, setUserData] = useState(null);
    const [tripLists, setTripLists] = useState([]);
    const [showAllTripLists, setShowAllTripLists] = useState(false);
    const [followStatus, setFollowStatus] = useState('NOT_FOLLOWING'); // 'FOLLOWING', 'NOT_FOLLOWING', 'PENDING'
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [loadingStates, setLoadingStates] = useState({
        userData: true,
        followStatus: true,
        tripLists: true,
        user: true
    });
    const [isBlocked, setIsBlocked] = useState(false);
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [isBlockConfirmVisible, setIsBlockConfirmVisible] = useState(false);
    const [isUnblockConfirmVisible, setIsUnblockConfirmVisible] = useState(false);
    const [isReportVisible, setIsReportVisible] = useState(false);
    const [blockMutationInFlight, setBlockMutationInFlight] = useState(false);
    const { run: runToggleFollow, isRunning: isFollowUpdating } = useSingleFlightAction(`profile:public-follow-toggle:${userId || 'unknown'}`);

    const normalizeFollowStatus = (status) => {
        if (!status) return 'NOT_FOLLOWING';
        const normalized = String(status).toUpperCase();
        if (normalized === 'FOLLOWING') return 'FOLLOWING';
        if (normalized === 'PENDING' || normalized === 'REQUESTED' || normalized === 'FOLLOW_REQUESTED') return 'PENDING';
        if (normalized === 'SELF') return 'SELF';
        return 'NOT_FOLLOWING';
    };

    const fetchTripListsForProfile = async (targetUserId, profileData, normalizedStatus) => {
        if (profileData?.privateAccount && normalizedStatus !== 'FOLLOWING' && normalizedStatus !== 'SELF') {
            return [];
        }

        try {
            const tripListResponse = await api.get(`/api/triplists/v1/user/${targetUserId}/public`);
            return tripListResponse.data;
        } catch (tripError) {
            console.error('Error fetching trip lists:', tripError);
            return [];
        }
    };

    const syncProfileData = async (targetUserId, options = {}) => {
        const { preserveLoadingState = false } = options;

        try {
            if (!preserveLoadingState) {
                setLoadingStates(prev => ({
                    ...prev,
                    userData: true,
                    followStatus: true,
                    tripLists: true,
                }));
            }

            const userResponse = await api.get(`/api/users/v1/${targetUserId}`);
            const profileData = userResponse.data;
            const normalizedStatus = normalizeFollowStatus(profileData?.followStatus);
            const nextTripLists = await fetchTripListsForProfile(targetUserId, profileData, normalizedStatus);

            setUserData(profileData);
            setFollowerCount(profileData?.followerCount || 0);
            setFollowingCount(profileData?.followingCount || 0);
            setFollowStatus(normalizedStatus);
            setTripLists(nextTripLists);
            return { profileData, normalizedStatus, tripLists: nextTripLists };
        } finally {
            setLoadingStates(prev => ({
                ...prev,
                userData: false,
                followStatus: false,
                tripLists: false,
            }));
        }
    };

    // Load current user data
    useEffect(() => {
        const checkUser = async () => {
            try {
                const userData = await TokenManager.getUserData();
                if (userData) {
                    setUser(userData);
                    console.log('User data:', userData);
                }
            } catch (error) {
                console.error('Error retrieving user data or token:', error);
            }
        };
        checkUser();
    }, []);


    useEffect(() => {
        const loadData = async () => {
            try {
                await syncProfileData(userId, { preserveLoadingState: true });
            } catch (error) {
                console.error('Error fetching profile data:', error);
                console.error('Error details:', error.response?.data);
                setLoadingStates({
                    userData: false,
                    followStatus: false,
                    tripLists: false,
                    user: false
                });
            }
        };

        if (userId) {
            loadData();
        }
    }, [userId]);

    useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        (async () => {
            try {
                const status = await getBlockStatus(userId);
                if (!cancelled) setIsBlocked(!!status?.blocked);
            } catch (error) {
                console.error('Error loading block status:', error);
            }
        })();
        return () => { cancelled = true; };
    }, [userId]);

    const handleBlock = async () => {
        if (!userId) return;
        setBlockMutationInFlight(true);
        try {
            await blockUser(userId);
            setIsBlocked(true);
            // Drop their posts from the local feed and re-fetch so removal is
            // immediate (Apple checks for this in the screen recording).
            dispatch(removePostsByUser(userId));
            dispatch(fetchPosts());
            setIsBlockConfirmVisible(false);
            // Per backend guidance, leave the now-inaccessible profile.
            router.replace('/community_home');
        } catch (error) {
            console.error('Error blocking user:', error);
            setIsBlockConfirmVisible(false);
        } finally {
            setBlockMutationInFlight(false);
        }
    };

    const handleUnblock = async () => {
        if (!userId) return;
        setBlockMutationInFlight(true);
        try {
            await unblockUser(userId);
            setIsBlocked(false);
            dispatch(fetchPosts());
            setIsUnblockConfirmVisible(false);
        } catch (error) {
            console.error('Error unblocking user:', error);
            setIsUnblockConfirmVisible(false);
        } finally {
            setBlockMutationInFlight(false);
        }
    };


    const displayedTripLists = showAllTripLists ? tripLists : tripLists.slice(0, 3);

    const getTripPlaceCount = (trip) => {
        if (typeof trip?.totalPlaceCount === 'number') {
            return trip.totalPlaceCount;
        }

        if (Array.isArray(trip?.itinerary)) {
            return trip.itinerary.reduce((total, day) => (
                total + (Array.isArray(day?.places) ? day.places.length : 0)
            ), 0);
        }

        return 0;
    };


    const navigateToChat = async () => {
        try {
            // Show some loading indicator if needed

            // Create or get a direct message room with this user
            const chatRoom = await createOrGetDirectMessageRoom(userId);

            // Generate a room name based on the other user's name
            const roomName = `Chat with ${userData.name}`;

            // Navigate to the chat screen with the room details
            const resolvedRoomId = chatRoom?.roomId || chatRoom?.chatRoomId || chatRoom?.id;
            if (!resolvedRoomId) {
                throw new Error('Invalid chat room response: missing room id');
            }

            router.push({
                pathname: '/chatscreen',
                params: {
                    roomId: resolvedRoomId,
                    roomName: roomName,
                    isDirectMessage: true,
                    otherUserId: userId,
                    otherUserName: userData.name,
                    otherUserImage: userData.imageUrl || ''
                }
            });
        } catch (error) {
            console.error('Error navigating to chat:', error);
            // Show error message to user if needed
        }
    };

    const toggleFollow = async () => {
        await runToggleFollow(async () => {
            try {
                const endpoint = `${API_BASE_URL}/api/follows/v1/${userId}`;
                const token = await TokenManager.getAccessToken();
                const method = (followStatus === 'FOLLOWING' || followStatus === 'PENDING') ? 'DELETE' : 'POST';

                const response = await fetch(endpoint, {
                    method: method,
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                // Some backends return empty body on DELETE/POST success
                let responseData = {};
                try {
                    responseData = await response.json();
                } catch (parseError) {
                    responseData = {};
                }
                console.log('Toggle follow response:', responseData);

                if (response.ok && responseData.success !== false) {
                    const serverStatus = normalizeFollowStatus(responseData.followStatus || responseData.status);

                    let nextStatus;
                    if (serverStatus !== 'NOT_FOLLOWING') {
                        nextStatus = serverStatus;
                    } else if (followStatus === 'FOLLOWING' || followStatus === 'PENDING') {
                        nextStatus = 'NOT_FOLLOWING';
                    } else {
                        nextStatus = userData?.privateAccount ? 'PENDING' : 'FOLLOWING';
                    }

                    setFollowStatus(nextStatus);

                    if (typeof responseData.followerCount === 'number') {
                        setFollowerCount(responseData.followerCount);
                    } else {
                        if (nextStatus === 'FOLLOWING' && followStatus !== 'FOLLOWING') {
                            setFollowerCount(prevCount => prevCount + 1);
                        } else if (nextStatus === 'NOT_FOLLOWING' && followStatus === 'FOLLOWING') {
                            setFollowerCount(prevCount => Math.max(0, prevCount - 1));
                        }
                    }

                    await refreshUserData();
                }
            } catch (error) {
                console.error('Error toggling follow status:', error);
            }
        });
    };

    // Function to refresh user data after follow/unfollow
    const refreshUserData = async () => {
        try {
            await syncProfileData(userId, { preserveLoadingState: true });
        } catch (error) {
            console.error('Error refreshing user data:', error);
        }
    };

    return (
        <View style={styles.container}>
            {(loadingStates.userData || loadingStates.followStatus) ? (
                <ProfileSkeleton />
            ) : (
                <SafeAreaView style={styles.profilePage}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                        >
                            <Ionicons name="arrow-back" size={24} color="white" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Profile</Text>
                        {String(user?.id || user?.userId || '') === String(userId) ? (
                            <View style={styles.headerRight} />
                        ) : (
                            <TouchableOpacity
                                style={styles.headerRightAction}
                                onPress={() => setIsMenuVisible(true)}
                                hitSlop={10}
                            >
                                <Ionicons name="ellipsis-horizontal" size={22} color="#fff" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContainer}>
                        {userData && (
                            <>
                                <View style={styles.profileHeader}>
                                    {/* 프로필 정보는 이미 로드 완료 */}
                                    {userData.imageUrl ? (
                                        <ExpoImage
                                            style={styles.profilePic}
                                            contentFit="cover"
                                            cachePolicy="memory-disk"
                                            source={{ uri: userData.imageUrl }}
                                            onError={(e) => console.log('Failed to load image', e?.error)}
                                        />
                                    ) : (
                                        <View style={styles.iconContainer}>
                                            <Ionicons name="person" size={40} color="#888" />
                                        </View>
                                    )}
                                    <Text style={styles.profileName}>{userData.name}</Text>
                                    <Text style={styles.profileUserName}>{'@' + userData.userName}</Text>

                                    <View style={styles.statsContainer}>
                                        <TouchableOpacity
                                            onPress={() => router.push({
                                                pathname: '/followlist',
                                                params: {
                                                    type: 'followers',
                                                    userId: userId,
                                                    userName: userData.name
                                                }
                                            })}
                                        >
                                            <Text style={styles.statsText}>{followerCount + " followers"}</Text>
                                        </TouchableOpacity>
                                        <Text style={styles.statsDot}>•</Text>
                                        <TouchableOpacity
                                            onPress={() => router.push({
                                                pathname: '/followlist',
                                                params: {
                                                    type: 'following',
                                                    userId: userId,
                                                    userName: userData.name
                                                }
                                            })}
                                        >
                                            <Text style={styles.statsText}>{followingCount + " following"}</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* 팔로우 버튼도 이미 로드 완료 */}
                                    <View style={styles.buttonContainer}>
                                        {followStatus === 'NOT_FOLLOWING' ? (
                                            <LinearGradient
                                                style={styles.gradientProfileButton}
                                                colors={['#5468ff', '#81d8d0']}
                                                locations={[0, 1]}
                                                useAngle={true}
                                                angle={45}
                                            >
                                                <TouchableOpacity
                                                    style={[styles.gradientButton, isFollowUpdating && { opacity: 0.6 }]}
                                                    onPress={toggleFollow}
                                                    disabled={isFollowUpdating}
                                                >
                                                    <Text style={styles.buttonText}>{isFollowUpdating ? 'Updating...' : 'Follow'}</Text>
                                                </TouchableOpacity>
                                            </LinearGradient>
                                        ) : followStatus === 'PENDING' ? (
                                            <TouchableOpacity
                                                style={[styles.profileButton, styles.pendingButton, isFollowUpdating && { opacity: 0.6 }]}
                                                onPress={toggleFollow}
                                                disabled={isFollowUpdating}
                                            >
                                                <Text style={[styles.buttonText, styles.pendingButtonText]}>{isFollowUpdating ? 'Updating...' : 'Requested'}</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <TouchableOpacity
                                                style={[styles.profileButton, styles.followButton, isFollowUpdating && { opacity: 0.6 }]}
                                                onPress={toggleFollow}
                                                disabled={isFollowUpdating}
                                            >
                                                <Text style={[styles.buttonText, styles.followButtonText]}>{isFollowUpdating ? 'Updating...' : 'Following'}</Text>
                                            </TouchableOpacity>
                                        )}

                                        <TouchableOpacity
                                            style={styles.profileButton}
                                            onPress={navigateToChat}
                                        >
                                            <Text style={styles.buttonText}>Message</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* TripList 섹션 */}
                                {userData.privateAccount && followStatus !== 'FOLLOWING' ? (
                                    <View style={styles.privateAccountContainer}>
                                        <Ionicons name="lock-closed" size={48} color="#666" />
                                        <Text style={styles.privateAccountTitle}>This Account is Private</Text>
                                        <Text style={styles.privateAccountText}>Follow to see their triplists</Text>
                                    </View>
                                ) : (
                                    <>
                                        <Text style={styles.tripListsTitle}>Public TripLists</Text>
                                        {loadingStates.tripLists ? (
                                            <Text style={styles.noTripsText}>Loading triplists...</Text>
                                        ) : (
                                            // 기존 triplist 렌더링 코드
                                            displayedTripLists.length > 0 ? (
                                                displayedTripLists.map((trip, index) => (
                                                    <TouchableOpacity
                                                        key={index}
                                                        style={styles.tripListItem}
                                                        onPress={() => router.push({
                                                            pathname: '/list_details',
                                                            params: {
                                                                from: 'publicprofile',
                                                                tripListId: trip.tripListId,
                                                                tripDetails: JSON.stringify(trip)
                                                            }
                                                        })}
                                                    >
                                                        <ExpoImage
                                                            source={{ uri: trip.imageUrl }}
                                                            style={styles.tripImage}
                                                            contentFit="cover"
                                                            cachePolicy="memory-disk"
                                                            transition={150}
                                                        />
                                                        <View style={styles.tripInfo}>
                                                            <Text style={styles.tripName}>{trip.name}</Text>
                                                            <Text style={styles.tripItems}>
                                                                {getTripPlaceCount(trip)} places
                                                            </Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                ))
                                            ) : (
                                                <Text style={styles.noTripsText}>No public triplists available</Text>
                                            )
                                        )}

                                        {!showAllTripLists && tripLists.length > 3 && (
                                            <TouchableOpacity
                                                style={styles.seeAllTripLists}
                                                onPress={() => setShowAllTripLists(true)}
                                            >
                                                <Text style={styles.buttonText}>See all TripLists</Text>
                                            </TouchableOpacity>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </ScrollView>
                    <NavBar style={styles.navBar} />
                </SafeAreaView>
            )}

            <Modal
                transparent
                visible={isMenuVisible}
                animationType="fade"
                onRequestClose={() => setIsMenuVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsMenuVisible(false)}>
                    <View style={styles.menuOverlay} />
                </TouchableWithoutFeedback>
                <View style={styles.menuSheet}>
                    <View style={styles.menuHeader}>
                        <Text style={styles.menuTitle}>{userData?.userName ? `@${userData.userName}` : 'Profile actions'}</Text>
                        <TouchableOpacity onPress={() => setIsMenuVisible(false)}>
                            <Text style={styles.menuCancel}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        style={styles.menuOption}
                        onPress={() => {
                            setIsMenuVisible(false);
                            setIsReportVisible(true);
                        }}
                    >
                        <Ionicons name="flag-outline" size={18} color="#fff" />
                        <Text style={styles.menuOptionText}>Report user</Text>
                    </TouchableOpacity>
                    {isBlocked ? (
                        <TouchableOpacity
                            style={styles.menuOption}
                            onPress={() => {
                                setIsMenuVisible(false);
                                setIsUnblockConfirmVisible(true);
                            }}
                        >
                            <Ionicons name="person-add-outline" size={18} color="#fff" />
                            <Text style={styles.menuOptionText}>Unblock user</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.menuOption}
                            onPress={() => {
                                setIsMenuVisible(false);
                                setIsBlockConfirmVisible(true);
                            }}
                        >
                            <Ionicons name="ban-outline" size={18} color="#ff6b6b" />
                            <Text style={[styles.menuOptionText, { color: '#ff6b6b' }]}>Block user</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </Modal>

            <ConfirmationModal
                visible={isBlockConfirmVisible}
                title={`Block ${userData?.userName ? '@' + userData.userName : 'this user'}?`}
                message="Their posts and comments will be hidden from your feed immediately, they will not be able to see yours, and our moderation team will be notified."
                confirmText={blockMutationInFlight ? 'Blocking...' : 'Block'}
                cancelText="Cancel"
                onConfirm={handleBlock}
                onCancel={() => !blockMutationInFlight && setIsBlockConfirmVisible(false)}
            />

            <ConfirmationModal
                visible={isUnblockConfirmVisible}
                title={`Unblock ${userData?.userName ? '@' + userData.userName : 'this user'}?`}
                message="They will be able to see your activity again and their content will reappear in your feed."
                confirmText={blockMutationInFlight ? 'Unblocking...' : 'Unblock'}
                cancelText="Cancel"
                onConfirm={handleUnblock}
                onCancel={() => !blockMutationInFlight && setIsUnblockConfirmVisible(false)}
            />

            <ReportModal
                visible={isReportVisible}
                onClose={() => setIsReportVisible(false)}
                targetType={REPORT_TARGET_TYPES.USER}
                targetId={userId}
                title="Report user"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    profilePage: {
        flex: 1,
        width: '100%',
        backgroundColor: '#000',
        borderRadius: 30,
        overflow: 'hidden',
    },
    contentContainer: {
        flex: 1,
    },
    scrollContainer: {
        paddingHorizontal: 20,
        paddingBottom: 60, // Add padding to avoid overlap with NavBar
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        backgroundColor: '#000',
        width: '100%',
        marginVertical: 10,
        position: 'relative',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    backButton: {
        position: 'absolute',
        left: 20,
    },
    headerRight: {
        width: 24, // Same width as back button for balance
    },
    headerRightAction: {
        position: 'absolute',
        right: 20,
        padding: 4,
    },
    menuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    menuSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1c1c1e',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 32,
    },
    menuHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 4,
    },
    menuTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    menuCancel: {
        color: '#abb7c2',
        fontSize: 13,
        fontWeight: '600',
    },
    menuOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        gap: 12,
    },
    menuOptionText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    profileHeader: {
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    profilePic: {
        width: 100,
        height: 100,
        borderRadius: 50,
        overflow: "hidden",
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "#ccc",
        justifyContent: 'center',
        alignItems: 'center',
        overflow: "hidden",
    },
    profileName: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 10,
    },
    profileUserName: {
        color: '#fff',
        fontSize: 12,
        marginBottom: 10,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
        marginTop: 10,
    },
    gradientProfileButton: {
        height: 33,
        width: '40%',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 8,
        backgroundColor: 'transparent',
    },
    profileButton: {
        borderColor: 'white',
        borderWidth: 1,
        height: 33,
        width: '40%',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 8,
        backgroundColor: 'transparent',
    },
    followButton: {
        backgroundColor: '#fff',
    },
    followButtonText: {
        color: '#000',
    },
    gradientButton: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    tripListsTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginVertical: 10,
    },
    tripListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10,
    },
    tripImage: {
        width: 76,
        height: 76,
        borderRadius: 14,
        marginRight: 10,
    },
    tripInfo: {
        flex: 1,
    },
    tripName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    tripItems: {
        color: '#fff',
        fontSize: 12,
    },
    seeAllTripLists: {
        borderColor: '#fff',
        borderWidth: 1,
        width: 120,
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 10,
        marginVertical: 15,
        alignItems: 'center',
        backgroundColor: 'transparent',
        alignSelf: 'center',
    },
    navBar: {
        width: '100%',
        height: 60,
        backgroundColor: '#000',
    },
    skeletonBase: {
        backgroundColor: '#333', // Darker skeleton for dark theme
        borderRadius: 4,
    },
    profilePicSkeleton: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 16,
    },
    nameSkeleton: {
        width: 150,
        height: 24,
        marginBottom: 8,
    },
    usernameSkeleton: {
        width: 120,
        height: 20,
        marginBottom: 16,
    },
    buttonSkeleton: {
        width: '40%',
        height: 33,
        borderRadius: 10,
        marginHorizontal: 8,
    },
    titleSkeleton: {
        width: 200,
        height: 24,
        marginVertical: 16,
    },
    tripImageSkeleton: {
        width: 76,
        height: 76,
        borderRadius: 14,
        marginRight: 10,
    },
    tripNameSkeleton: {
        width: '70%',
        height: 20,
        marginBottom: 8,
    },
    tripItemsSkeleton: {
        width: '40%',
        height: 16,
    },
    skeletonMargin: {
        marginVertical: 10,
    },
    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    statsText: {
        color: '#fff',
        fontSize: 12,
    },
    statsDot: {
        color: '#fff',
        fontSize: 12,
        marginHorizontal: 5,
    },
    noTripsText: {
        color: '#fff',
        textAlign: 'center',
        marginTop: 20,
        fontSize: 14,
    },
    privateAccountContainer: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    privateAccountTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginTop: 16,
        marginBottom: 8,
    },
    privateAccountText: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
    },
    pendingButton: {
        backgroundColor: '#cccccc',
        borderColor: '#cccccc',
    },
    pendingButtonText: {
        color: '#000',
    },
});

export default PublicProfile;
