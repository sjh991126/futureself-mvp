import React, { useCallback, useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Share, SafeAreaView, RefreshControl, Animated, ActivityIndicator, Modal } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NavBar from '../../assets/components/navbar';
import { getTriplist } from '../src/api/my_triplist';
import { TokenManager, API_BASE_URL } from '../src/config';
import ConfirmationModal from '../../assets/components/ConfirmationModal'
import ContributorRewards from '../../assets/components/ContributorRewards';
import AchievementBadge from '../../assets/components/AchievementBadge';
import { testCorrectedEndpoints } from '../src/api/testEndpoints';
import { useAppState } from "../src/AppStateHandler";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearUserData } from '../slices/userSlice';
import { useDispatch } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import HighlightViewer from '../(library)/highlightviewer';
import { getHighlightsByUser } from '../src/api/highlight';
// import styles from '../(auth)/onboard_styles';

const TripListsSkeleton = React.memo(() => (
  <View style={styles.tripListsSkeletonContainer}>
    {[0, 1, 2].map((item) => (
      <View key={item} style={styles.tripListSkeletonItem}>
        <View style={styles.tripImageSkeleton} />
        <View style={styles.tripInfoSkeleton}>
          <View style={styles.tripNameSkeleton} />
          <View style={styles.tripMetaSkeleton} />
        </View>
      </View>
    ))}
  </View>
));

const Profile = () => {
  const [user, setUser] = useState({});
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [name, setName] = useState('Kiana');
  const [tripLists, setTripLists] = useState([]);
  const [showAllTripLists, setShowAllTripLists] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const setLastUsedFeature = useAppState();
  const [imageTimestamp, setImageTimestamp] = useState(Date.now());
  const dispatch = useDispatch();
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [hasCompletedQuests, setHasCompletedQuests] = useState(false);
  const [userLevel, setUserLevel] = useState(3);
  const [activeTab, setActiveTab] = useState('TripLists');
  const [placeHighlights, setPlaceHighlights] = useState([]);
  const [highlightsLoading, setHighlightsLoading] = useState(true);
  const [selectedHighlight, setSelectedHighlight] = useState(null);
  const [showHighlightViewer, setShowHighlightViewer] = useState(false);
  const isFetchingRef = useRef(false);

  // Layout stabilization and fade animation
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setLastUsedFeature('Profile');
  }, [setLastUsedFeature]);

  useEffect(() => {
    // Delay layout ready to prevent stretching during navigation
    const timer = setTimeout(() => {
      setIsLayoutReady(true);
      // Smooth fade-in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }, 75);

    return () => clearTimeout(timer);
  }, []);

  // Fetch user data and trip lists
  const fetchUserData = useCallback(async (isRefresh = false) => {
    if (isFetchingRef.current) {
      console.log('Fetch already in progress, skipping...');
      return;
    }
    isFetchingRef.current = true;

    try {
      // Set appropriate loading state
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const token = await TokenManager.getAccessToken();
      if (!token) {
        router.replace('/login');
        return;
      }

      // Try to get cached data first if not refreshing
      if (!isRefresh) {
        const cachedTripLists = await AsyncStorage.getItem('profileTripLists');
        const cachedUserData = await TokenManager.getUserData();

        if (cachedTripLists && cachedUserData) {
          setTripLists(JSON.parse(cachedTripLists));
          setUser(cachedUserData);
          setName(cachedUserData.name || '');
          setIsLoading(false);
          return;
        }
      }

      // Fetch fresh data
      const [userResponse, tripListsData] = await Promise.all([
        fetch(`${API_BASE_URL}/api/users/v1/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        getTriplist()
      ]);

      if (userResponse.status === 401) {
        console.log('401 received, redirecting to login...');
        await TokenManager.clearAll();
        router.replace('/login');
        return;
      }

      // Handle user data
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData);
        setName(userData.name || '');
        await TokenManager.storeUserData(userData);
        setImageTimestamp(Date.now());
      }

      // Update trip lists
      if (Array.isArray(tripListsData)) {
        setTripLists(tripListsData);
        await AsyncStorage.setItem('profileTripLists', JSON.stringify(tripListsData));
      }

      // Update last fetch time
      const currentTime = Date.now();
      await AsyncStorage.setItem('lastProfileFetchTime', currentTime.toString());
      setLastFetchTime(currentTime);

    } catch (error) {
      if (error.response?.status === 401 || error.message?.includes('Session expired')) {
        await TokenManager.clearAll();
        router.replace('/login');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [router]);

  const fetchHighlightsByUser = useCallback(async () => {
    try {
      if (!user?.id && !user?.userId) return;
      setHighlightsLoading(true);
      const data = await getHighlightsByUser(user.id || user.userId);
      setPlaceHighlights(data?.placeHighlights || []);
    } catch (error) {
      console.error('Error fetching highlights:', error);
      setPlaceHighlights([]);
    } finally {
      setHighlightsLoading(false);
    }
  }, [user?.id, user?.userId]);

  // Initial data load
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const token = await TokenManager.getAccessToken();
        if (!token) {
          console.log('No token on mount, redirecting...');
          router.replace('/login');
          return;
        }

        // Try to load cached user data first
        const userData = await TokenManager.getUserData();
        if (userData) {
          setUser(userData);
          setName(userData.name || '');
          setIsLoading(false);
          // Load fresh data in the background
          setTimeout(() => fetchUserData(false), 500);
        } else {
          // No cached data, fetch immediately
          await fetchUserData(false);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
        router.push('/login');
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (user?.id || user?.userId) {
      fetchHighlightsByUser();
    }
  }, [user?.id, user?.userId, fetchHighlightsByUser]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const checkForUpdates = async () => {
        try {
          if (isLoading || isRefreshing) {
            console.log('Already loading, skipping focus check');
            return;
          }

          const currentTime = Date.now();
          const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
          const listUpdated = await AsyncStorage.getItem('listUpdated');

          const shouldRefresh =
            listUpdated === 'true' ||
            (currentTime - lastFetchTime) > CACHE_DURATION;

          if (shouldRefresh) {
            console.log('Refreshing due to focus...');
            await fetchUserData(true);
            await AsyncStorage.removeItem('listUpdated');
          }
        } catch (error) {
          console.error('Error checking for updates:', error);
        }
      };

      checkForUpdates();
    }, [fetchUserData, lastFetchTime, isLoading, isRefreshing]));

  // Pull-to-refresh handler
  const handleRefresh = useCallback(() => {
    fetchUserData(true);
    fetchHighlightsByUser();
  }, [fetchUserData, fetchHighlightsByUser]);


  // Handle quest updates from ContributorRewards component
  const handleQuestUpdate = useCallback((questData) => {
    if (questData.currentLevel) {
      setUserLevel(questData.currentLevel);
    }
    if (questData.allQuestsCompleted !== undefined) {
      setHasCompletedQuests(questData.allQuestsCompleted);
    }
  }, []);

  const handleHighlightPress = (placeGroup) => {
    const first = placeGroup?.highlights?.[0];
    if (first) {
      setSelectedHighlight(first);
      setShowHighlightViewer(true);
    }
  };

  const handleCloseViewer = () => {
    setShowHighlightViewer(false);
    setSelectedHighlight(null);
  };

  // Test endpoints - for backend validation
  const runEndpointTests = async () => {
    console.log('🚀 Testing Backend Endpoints...');
    await testCorrectedEndpoints();
  };

  // Determine which trip lists to display
  const displayedTripLists = showAllTripLists ? tripLists : tripLists.slice(0, 3);

  const confirmLogout = async () => {
    try {
      console.log('Starting logout process...');

      // Close modals first
      setLogoutModalVisible(false);
      setModalVisible(false);

      // Clear Redux store states
      dispatch(clearUserData());

      // Clear AsyncStorage
      await AsyncStorage.clear();
      console.log('AsyncStorage cleared');

      // Clear tokens and user data
      await TokenManager.clearTokens();
      await TokenManager.clearUserData();
      console.log('Tokens cleared');

      // Reset local states
      setUser({});
      setTripLists([]);
      setName('');
      setShowAllTripLists(false);
      setImageTimestamp(Date.now());

      // Navigate to login - use replace without dismissAll
      console.log('Navigating to login...');
      router.replace('/login');

    } catch (error) {
      console.error('Error during logout:', error);

      // Force navigation even if there's an error
      router.replace('/login');
    }
  };

  const shareProfile = () => {
    if (tripLists.length > 0) {
      const firstTripList = tripLists[0];
      Share.share({
        message: `Discover amazing travel experiences with Trippy! Check out ${user.userName}'s TripList "${firstTripList.name}".`,
        url: 'https://www.linkedin.com/company/trippyglobal/posts/?feedView=all'
      });
    } else {
      Share.share({
        message: 'Join me on Trippy and explore my TripLists filled with exciting destinations!',
        url: 'https://www.linkedin.com/company/trippyglobal/posts/?feedView=all'
      });
    }
  };

  const navigateToEditProfile = () => {
    router.push({
      pathname: '/editprofile',
      params: {
        initialName: user.name,
        initialImageUrl: user.imageUrl,
      },
    });
  };


  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.profilePage}>
        <Animated.View style={{
          flex: 1,
          opacity: fadeAnim,
          backgroundColor: '#000'
        }}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Profile</Text>
            <View style={styles.headerButtons}>
              {/* <TouchableOpacity onPress={runEndpointTests} style={styles.testButton}>
                <Ionicons name="bug-outline" size={20} color="#fff" />
              </TouchableOpacity> */}
              <TouchableOpacity onPress={() => router.push('/settings')} style={styles.logoutButton}>
                <Ionicons name="settings-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.contentContainer}>
            <ScrollView
              contentContainerStyle={styles.scrollContainer}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  tintColor="#fff"
                  colors={["#fff"]}
                  progressBackgroundColor="#000"
                />
              }
            >
              <View style={styles.profileHeader}>
                {user.imageUrl ? (
                  <ExpoImage
                    style={styles.profilePic}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    source={{ uri: `${user.imageUrl}?timestamp=${imageTimestamp}` }}
                    onError={() => {
                      setUser(prev => ({ ...prev, imageUrl: null }));
                    }}
                  />
                ) : (
                  <View style={styles.iconContainer}>
                    <Ionicons name="person" size={40} color="#888" />
                  </View>
                )}
                <View style={styles.nameContainer}>
                  <Text style={styles.profileName}>{user.name || ''}</Text>
                  <AchievementBadge level={userLevel} isVisible={hasCompletedQuests} />
                </View>
                <Text style={styles.profileUserName}>{'@' + (user.userName || '')}</Text>
                {/* <View style={styles.statsContainer}>
                  <Text style={styles.statsText}>{(user.followerCount || 0) + " followers"}</Text>
                  <Text style={styles.statsDot}>•</Text>
                  <Text style={styles.statsText}>{(user.followingCount || 0) + " following"}</Text>
                </View> */}
                <View style={styles.statsContainer}>
                  <TouchableOpacity
                    onPress={() => router.push({
                      pathname: '/followlist',
                      params: {
                        type: 'followers',
                        userId: user.id
                      }
                    })}
                  >
                    <Text style={styles.statsText}>
                      {(user.followerCount || 0) + " followers"}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.statsDot}>•</Text>
                  <TouchableOpacity
                    onPress={() => router.push({
                      pathname: '/followlist',
                      params: {
                        type: 'following',
                        userId: user.id
                      }
                    })}
                  >
                    <Text style={styles.statsText}>
                      {(user.followingCount || 0) + " following"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.profileActions}>
                  <TouchableOpacity style={styles.editProfile} onPress={navigateToEditProfile}>
                    <Text style={styles.buttonText}>Edit profile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.shareProfile} onPress={shareProfile}>
                    <Text style={styles.buttonText}>Share profile</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Highlights */}
              {/* <View style={{ marginTop: 4 }}>
                {highlightsLoading ? (
                  <View style={styles.highlightsLoadingContainer}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.highlightsScroll}
                    contentContainerStyle={styles.highlightsContainer}
                  >
                    {placeHighlights.map((ph, idx) => (
                      <TouchableOpacity
                        key={`${ph.placeName}-${idx}`}
                        style={styles.highlightItem}
                        onPress={() => handleHighlightPress(ph)}
                      >
                        <View style={styles.highlightCircle}>
                          <LinearGradient
                            colors={['#5468FF', '#81D8D0']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.highlightGradientBorder}
                          >
                            <View style={styles.highlightImageContainer}>
                              <ExpoImage
                                style={styles.highlightImage}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                                transition={150}
                                source={{
                                  uri:
                                    ph.highlights?.[0]?.coverImageUrl ||
                                    ph.highlights?.[0]?.mediaItems?.[0]?.mediaUrl ||
                                    ph.thumbnailUrl
                                }}
                              />
                            </View>
                          </LinearGradient>
                        </View>
                        <Text style={styles.highlightLabel} numberOfLines={1}>
                          {ph.placeName}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View> */}

              {/* Tab Navigation */}
              < View style={styles.tabContainer} >
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'TripLists' && styles.activeTab]}
                  onPress={() => setActiveTab('TripLists')}
                >
                  <Text style={[styles.tabText, activeTab === 'TripLists' && styles.activeTabText]}>
                    TripLists
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'Review' && styles.activeTab]}
                  onPress={() => setActiveTab('Review')}
                >
                  <Text style={[styles.tabText, activeTab === 'Review' && styles.activeTabText]}>
                    Review
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tab Content */}
              {activeTab === 'Review' && (
                <ContributorRewards onQuestUpdate={handleQuestUpdate} user={user} />
              )}

              {activeTab === 'TripLists' && (
                <View>

                  <Text style={styles.tripListsTitle}>My TripLists</Text>

                  {isLoading ? (
                    <TripListsSkeleton />
                  ) : displayedTripLists.length > 0 ? (
                    displayedTripLists.map((trip, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.tripListItem}
                        onPress={() => router.push({
                          pathname: '/list_details',
                          params: {
                            from: 'profile',
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
                          <Text style={styles.tripName}>{trip.name || ''}</Text>
                          <Text style={styles.tripItems}>
                            {trip.totalPlaceCount || 0} places
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.noTripsText}>You don't have any triplists yet</Text>
                  )}

                  {!showAllTripLists && tripLists.length > 3 && (
                    <TouchableOpacity
                      style={styles.seeAllTripLists}
                      onPress={() => setShowAllTripLists(true)}
                    >
                      <Text style={styles.buttonText}>See all TripLists</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
          <NavBar style={styles.navBar} />
        </Animated.View >
      </SafeAreaView >

      {selectedHighlight && (
        <Modal
          visible={showHighlightViewer}
          animationType="fade"
          transparent={false}
          onRequestClose={handleCloseViewer}
        >
          <HighlightViewer
            highlight={selectedHighlight}
            onClose={handleCloseViewer}
          />
        </Modal>
      )}

      <ConfirmationModal
        visible={logoutModalVisible}
        title="Do you want to logout?"
        message="This cannot be undone."
        onConfirm={confirmLogout}
        onCancel={() => setLogoutModalVisible(false)}
        confirmText="Log out"
        cancelText="Cancel"
      />
    </View >
  );
};

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
    paddingBottom: 60,
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
  headerButtons: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  testButton: {
    padding: 5,
  },
  logoutButton: {
    padding: 5,
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
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  profileName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileUserName: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 10,
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
  profileActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  editProfile: {
    borderColor: '#fff',
    borderWidth: 1,
    height: 33,
    width: '44%',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    backgroundColor: 'transparent',
  },
  shareProfile: {
    borderColor: '#fff',
    borderWidth: 1,
    height: 33,
    width: '44%',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    backgroundColor: 'transparent',
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center', // Ensure text is centered
  },
  tripLists: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tripListsTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
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
    fontWeight: "600",
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '70%',
    backgroundColor: '#202020',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalText: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    color: 'white'
  },
  modalText2: {
    alignSelf: "stretch",
    fontSize: 12,
    color: "#c4c4c4",
    textAlign: "center",
    marginBottom: 4
  },
  confirmLogoutButton: {
    backgroundColor: '#202020',
    padding: 2,
    borderRadius: 10,
    marginBottom: 0,
    width: '100%',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'red',
    fontSize: 12,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#202020',
    padding: 2,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: '#383838',
    marginVertical: 9,
  },
  loadingText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
  tripListsSkeletonContainer: {
    marginTop: 4,
  },
  tripListSkeletonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  tripImageSkeleton: {
    width: 76,
    height: 76,
    borderRadius: 14,
    marginRight: 10,
    backgroundColor: '#1f1f1f',
  },
  tripInfoSkeleton: {
    flex: 1,
    justifyContent: 'center',
  },
  tripNameSkeleton: {
    width: '70%',
    height: 16,
    borderRadius: 6,
    backgroundColor: '#1f1f1f',
    marginBottom: 10,
  },
  tripMetaSkeleton: {
    width: '40%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1f1f1f',
  },
  noTripsText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 20,
    marginHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#fff',
  },
  tabText: {
    fontSize: 16,
    color: '#888',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '600',
  },
  highlightsScroll: {
    width: '100%',
  },
  highlightsContainer: {
    paddingHorizontal: 10,
  },
  highlightsLoadingContainer: {
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 72,
  },
  highlightCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  highlightGradientBorder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  highlightImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#111',
    overflow: 'hidden',
  },
  highlightImage: {
    width: '100%',
    height: '100%',
  },
  highlightLabel: {
    color: '#fff',
    fontSize: 12,
    maxWidth: 72,
    textAlign: 'center',
  },
});

export default Profile;
