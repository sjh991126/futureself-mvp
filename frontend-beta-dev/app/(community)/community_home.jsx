import React, { useState, useEffect, useCallback, memo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, FlatList, Image, RefreshControl, ActivityIndicator, Modal, TouchableWithoutFeedback, ScrollView, Linking } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import NavBar from '../../assets/components/navbar';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { TokenManager } from '../src/config';
import MaskedView from '@react-native-masked-view/masked-view';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchPosts,
  toggleLikePost,
  setSearchQuery,
  setSelectedTopics,
  setSelectedMonths,
  selectFilteredPosts,
  resetFilters,
  setSelectedRegions,
} from '../slices/postsSlice';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  withTiming
} from 'react-native-reanimated';
import UgcEulaModal, { hasAcceptedUgcEula } from '../../assets/components/UgcEulaModal';

const PostItem = memo(({ item, onLike, getTimeAgo, formatDate, router }) => {

  return (
    <TouchableOpacity
      onPress={() => router.push({
        pathname: '/post_content',
        params: { id: item.id }
      })}
    >
      <View style={styles.postContainer}>
        <View style={styles.postHeader}>
          <TouchableOpacity
            onPress={() => router.push({
              pathname: '/publicprofile',
              params: { userId: item.userId || item.user.id }
            })}
            style={styles.userImageTouchable}
          >
            {item?.userImage ? (
              <ExpoImage
                source={{ uri: item.userImage }}
                style={styles.userImage}
                contentFit="cover"
                cachePolicy="memory-disk"
              />

            ) : (
              <View style={[styles.profileImage, styles.defaultProfileImage]}>
                <Ionicons name="person" size={24} color="#888" />
              </View>
            )}
            {/* <Image source={{ uri: item.userImage }} style={styles.userImage} /> */}
          </TouchableOpacity>
          <View style={styles.postHeaderText}>
            <Text style={styles.userName}>{item.userName}</Text>
            <View style={styles.dateLocationContainer}>
              <Text style={styles.dateText}>{formatDate(item.datetime)}, </Text>
              <Text style={styles.location}>{item.location}</Text>
            </View>
          </View>
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.textContainer}>
            <Text style={styles.postTitle}>{item.title}</Text>
            <Text style={styles.postContent}>{item.content}</Text>
          </View>

          {Array.isArray(item.images) && item.images.length > 0 && (
            <View style={styles.imageContainer}>
              <ExpoImage
                source={{ uri: item.images[0] }}
                style={styles.mainImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={300}
              />
              {item.images.length > 1 && (
                <View style={styles.additionalImagesIndicator}>
                  <Text style={styles.additionalImagesText}>
                    +{item.images.length - 1}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.accompanyButton}>
          <Text style={styles.accompanyButtonText}>
            {item.topic.charAt(0).toUpperCase() + item.topic.slice(1)}
          </Text>
        </TouchableOpacity>
        <View style={styles.postActions}>
          <View style={styles.actionContainer}>
            <TouchableOpacity onPress={() => onLike(item.id)}>
              <Ionicons
                name={item.isLiked ? "thumbs-up" : "thumbs-up-outline"}
                size={15}
                color={item.isLiked ? "#fff" : "#fff"}
              />
            </TouchableOpacity>
            <Text style={styles.actionCount}>{item.numberOfLikes}</Text>
          </View>
          <View style={styles.actionContainer}>
            <TouchableOpacity>
              <Ionicons name="chatbubbles-outline" size={15} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.actionCount}>
              {item.numberOfComments}
              {console.log('Comment count displayed:', item.numberOfComments)}
            </Text>
          </View>
          <Text style={styles.timeAgo}>{getTimeAgo(item.datetime)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Only re-render if these props change
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.numberOfLikes === nextProps.item.numberOfLikes &&
    prevProps.item.isLiked === nextProps.item.isLiked
  );
});

// Main regions shown in the filter UI
const MAIN_REGIONS = {
  'Hong Kong Island': [
    'Central',
    'Wan Chai',
    'Tin Hau',
    'Happy Valley',
    'Tai Tam',
    'Aberdeen',
    'Chai Wan',
    'Mid-Levels'
  ],
  'Kowloon': [
    'Tsim Sha Tsui',
    'Mong Kok',
    'Kowloon Tong',
    'San Po Kong',
    'Kwun Tong',
    'Kai Tak',
    'Tai Kok Tsui',
    'Kowloon Tsai',
    'Lam Tin'
  ],
  'New Territories': [
    'Sha Tin',
    'Tai Po',
    'Tsuen Wan',
    'Tuen Mun',
    'Tai Wo Estate',
    'Yuen Long',
    'Kwai Fong',
    'Pak Sha Wan'
  ],
  'Islands': [
    'Lantau Island',
    'Lamma Island',
    'Yat Tung Estate'
  ]
};

// Mapping of all possible API responses to main regions
const REGION_MAPPING = {
  // Hong Kong Island
  'Kennedy Town': 'Central',
  'Sheung Wan': 'Central',
  'Admiralty': 'Central',
  'Sai Ying Pun': 'Central',
  'Causeway Bay': 'Wan Chai',
  'North Point': 'Tin Hau',
  'Quarry Bay': 'Tai Tam',
  'Shau Kei Wan': 'Chai Wan',
  'Siu Sai Wan': 'Chai Wan',
  'Wong Chuk Hang': 'Aberdeen',
  'Ap Lei Chau': 'Aberdeen',
  'Tsim Sha Tsui East': 'Tsim Sha Tsui',

  // Kowloon
  'Jordan': 'Tsim Sha Tsui',
  'Yau Ma Tei': 'Mong Kok',
  'Prince Edward': 'Mong Kok',
  'Diamond Hill': 'San Po Kong',
  'Ngau Tau Kok': 'Kwun Tong',
  'Kowloon Bay': 'Kwun Tong',
  'Hung Hom': 'Tsim Sha Tsui',
  'To Kwa Wan': 'Kowloon City',

  // New Territories
  'Fo Tan': 'Sha Tin',
  'Tai Wai': 'Sha Tin',
  'City One': 'Sha Tin',
  'Siu Hong': 'Tuen Mun',
  'Tin Shui Wai': 'Yuen Long',
  'Long Ping': 'Yuen Long',
  'Kwai Hing': 'Kwai Fong',
  'Lai King': 'Kwai Fong',

  // Islands
  'Tung Chung': 'Lantau Island',
  'Discovery Bay': 'Lantau Island',
  'Mui Wo': 'Lantau Island',
  'Peng Chau': 'Lamma Island',
  'Cheung Chau': 'Lamma Island'
};

console.log('Available mappings:', Object.keys(REGION_MAPPING).reduce((acc, key) => {
  acc[key.toLowerCase()] = REGION_MAPPING[key];
  return acc;
}, {}));

const POPULAR_REGIONS = ['Central and Western', 'Yau Tsim Mong', 'Islands'];

// First, let's add a helper function to normalize locations
const normalizeLocation = (location) => {
  if (!location) return '';
  return location.toLowerCase().trim();
};

// Instead, let's create a debug wrapper function
const debugFilteredPosts = (state) => {
  const { posts, selectedTopics, selectedMonths, selectedRegions, searchQuery } = state.posts;

  console.log('Starting filter with:', {
    totalPosts: posts.length,
    selectedTopics,
    selectedMonths,
    selectedRegions,
    searchQuery
  });

  return posts.filter(post => {
    // Topic filter
    const topicMatch = selectedTopics.length === 0 ||
      selectedTopics.includes(post.topic?.toLowerCase());

    // Month filter
    const postDate = new Date(post.datetime);
    const postMonth = postDate.toLocaleString('en-US', { month: 'short' });
    const monthMatch = selectedMonths.length === 0 ||
      selectedMonths.includes(postMonth);

    // Search filter
    const searchMatch = !searchQuery ||
      post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content?.toLowerCase().includes(searchQuery.toLowerCase());

    // Region filter (case-insensitive)
    const regionMatch = selectedRegions.length === 0 ||
      selectedRegions.some(selectedRegion => {
        // Normalize both the post location and selected region
        const postLocation = post.location?.toLowerCase().trim();
        const selectedRegionNorm = selectedRegion.toLowerCase().trim();

        // Check all possible matches
        const isDirectMatch = postLocation === selectedRegionNorm;
        const isMappedToSelected = REGION_MAPPING[post.location] === selectedRegion;

        console.log('Matching check for post:', {
          postId: post.id,
          postLocation: post.location,
          normalizedPostLocation: postLocation,
          selectedRegion,
          normalizedSelectedRegion: selectedRegionNorm,
          isDirectMatch,
          isMappedToSelected,
          willMatch: isDirectMatch || isMappedToSelected
        });

        return isDirectMatch || isMappedToSelected;
      });

    // Log final match result for each post
    console.log('Post filter results:', {
      postId: post.id,
      location: post.location,
      topicMatch,
      monthMatch,
      searchMatch,
      regionMatch,
      willShow: topicMatch && monthMatch && searchMatch && regionMatch
    });

    return topicMatch && monthMatch && searchMatch && regionMatch;
  });
};

const SkeletonPost = () => (
  <View style={styles.postContainer}>
    <View style={styles.postHeader}>
      <View style={[styles.userImage, styles.skeleton]} />
      <View style={styles.postHeaderText}>
        <View style={[styles.skeletonText, { width: '40%', marginBottom: 8 }]} />
        <View style={[styles.skeletonText, { width: '30%' }]} />
      </View>
    </View>
    <View style={styles.contentContainer}>
      <View style={styles.textContainer}>
        <View style={[styles.skeletonText, { width: '60%', marginBottom: 12 }]} />
        <View style={[styles.skeletonText, { width: '90%', marginBottom: 8 }]} />
        <View style={[styles.skeletonText, { width: '80%' }]} />
      </View>
      <View style={[styles.imageContainer, styles.skeleton]} />
    </View>
    <View style={[styles.skeletonText, { width: '25%', marginBottom: 12, height: 30, borderRadius: 15 }]} />
    <View style={styles.postActions}>
      <View style={styles.actionContainer}>
        <View style={[styles.skeletonText, { width: 50 }]} />
      </View>
      <View style={styles.actionContainer}>
        <View style={[styles.skeletonText, { width: 50 }]} />
      </View>
    </View>
  </View>
);

const CommunityPage = () => {
  const dispatch = useDispatch();
  const filteredPosts = useSelector(debugFilteredPosts);
  console.log(filteredPosts);
  const { isLoading, lastFetched } = useSelector(state => state.posts);
  const { selectedTopics, selectedMonths, searchQuery, selectedRegions } = useSelector(state => state.posts);
  const [topicsModalVisible, setTopicsModalVisible] = useState(false);
  const [monthsModalVisible, setMonthsModalVisible] = useState(false);
  const router = useRouter();
  const [user, setUser] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [regionsModalVisible, setRegionsModalVisible] = useState(false);
  const translateY = useSharedValue(0);
  const context = useSharedValue({ y: 0 });
  const [imageTimestamp, setImageTimestamp] = useState(Date.now());

  // Layout stabilization and fade animation
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const fadeAnim = useSharedValue(0);

  // App Store guideline 1.2: present EULA before the user can view UGC.
  // Once accepted (per-user, per-device), the gate stays dismissed.
  const [eulaVisible, setEulaVisible] = useState(false);
  const [eulaChecked, setEulaChecked] = useState(false);

  const topicOptions = ['companion', 'weather', 'location', 'question'];
  const monthOptions = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  useEffect(() => {
    // Delay layout ready to prevent stretching during navigation
    const timer = setTimeout(() => {
      setIsLayoutReady(true);
      // Smooth fade-in animation using reanimated
      fadeAnim.value = withTiming(1, { duration: 250 });
    }, 75);

    return () => clearTimeout(timer);
  }, []);

  // Modify the fetch logic to use cache
  useEffect(() => {
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

    const shouldFetchPosts = () => {
      if (!lastFetched) return true;
      const now = Date.now();
      return now - lastFetched > CACHE_DURATION;
    };

    if (shouldFetchPosts()) {
      dispatch(fetchPosts());
    }
  }, [dispatch, lastFetched]);


  useFocusEffect(
    useCallback(() => {
      dispatch(resetFilters());
      // Re-fetch on focus so any blocks made on profile/post detail screens
      // immediately remove the blocked user's posts from the feed.
      dispatch(fetchPosts());
    }, [dispatch])
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const accepted = await hasAcceptedUgcEula();
      if (cancelled) return;
      setEulaChecked(true);
      if (!accepted) setEulaVisible(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleLike = async (postId) => {
    dispatch(toggleLikePost(postId));
  };

  const handleTopicSelect = (topic) => {
    const currentTopics = [...selectedTopics];
    const index = currentTopics.indexOf(topic);

    if (index === -1) {
      dispatch(setSelectedTopics([...currentTopics, topic]));
    } else {
      currentTopics.splice(index, 1);
      dispatch(setSelectedTopics(currentTopics));
    }
  };

  const handleMonthSelect = (month) => {
    const currentMonths = [...selectedMonths];
    const index = currentMonths.indexOf(month);

    if (index === -1) {
      dispatch(setSelectedMonths([...currentMonths, month]));
    } else {
      currentMonths.splice(index, 1);
      dispatch(setSelectedMonths(currentMonths));
    }
  };

  const resetTopics = () => {
    dispatch(resetFilters());
  };

  const resetMonths = () => {
    dispatch(resetFilters());
  };

  // Update the handleRegionSelect function with better debugging
  const handleRegionSelect = (region) => {
    console.log('Region Selection Debug:', {
      selectedRegion: region,
      normalizedRegion: normalizeLocation(region),
      currentSelectedRegions: selectedRegions.map(r => ({
        original: r,
        normalized: normalizeLocation(r)
      })),
      availableMappings: Object.keys(REGION_MAPPING).reduce((acc, key) => {
        acc[normalizeLocation(key)] = REGION_MAPPING[key];
        return acc;
      }, {})
    });

    const currentRegions = [...selectedRegions];
    const index = currentRegions.findIndex(
      r => normalizeLocation(r) === normalizeLocation(region)
    );

    if (index === -1) {
      console.log('Adding region:', region);
      dispatch(setSelectedRegions([...currentRegions, region]));
    } else {
      console.log('Removing region:', region);
      currentRegions.splice(index, 1);
      dispatch(setSelectedRegions(currentRegions));
    }
  };

  const resetRegions = () => {
    dispatch(setSelectedRegions([]));
  };

  const getTimeAgo = (datetime) => {
    const now = new Date();
    const past = new Date(datetime);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}seconds ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}days ago`;
    return `${Math.floor(diffInSeconds / 2592000)}months ago`;
  };

  const formatDate = (datetime) => {
    const date = new Date(datetime);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  const shareToSocialMedia = async (platform) => {
    const message = encodeURIComponent(`Join me on Trippy! @${user?.userName}\nhttps://www.trippy.global/`);

    const urls = {
      facebook: `fb://share?link=https://www.trippy.global/&quote=${message}`,
      x: `twitter://post?text=${message}`,
      instagram: `instagram://share?text=${message}`,
      whatsapp: `whatsapp://send?text=${message}`,
      telegram: `tg://msg?text=${message}`,
      line: `line://msg/text/${message}`,
      kakao: `kakaolink://send?text=${message}`,
    };

    try {
      const canOpen = await Linking.canOpenURL(urls[platform]);
      if (canOpen) {
        await Linking.openURL(urls[platform]);
      } else {
        // Fallback to web URLs if app isn't installed
        const webUrls = {
          facebook: `https://www.facebook.com/sharer/sharer.php?u=https://www.trippy.global/&quote=${message}`,
          x: `https://twitter.com/intent/tweet?text=${message}`,
          whatsapp: `https://wa.me/?text=${message}`,
          telegram: `https://t.me/share/url?url=https://www.trippy.global/&text=${message}`,
        };
        await Linking.openURL(webUrls[platform]);
      }
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await TokenManager.getUserData();
        if (userData) {
          setUser(userData);
          setImageTimestamp(Date.now());
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        router.push('/login');
      }
    };

    fetchUserData();
  }, []);

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Connect with Your Community</Text>
        <View style={styles.iconContainer}>
          <TouchableOpacity>
            <Ionicons name="create-outline"
              size={25}
              color="#fff"
              onPress={() => router.push({
                pathname: '/post',
              })} />
          </TouchableOpacity>

          <TouchableOpacity>
            <Ionicons name="chatbubble-outline"
              size={24}
              color="#fff"
              onPress={() => router.push({
                pathname: '/messagelist',
              })} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push('/community_search')}
          activeOpacity={0.7}
        >
          <Ionicons name="search" size={24} color="#000" style={{ marginRight: 8 }} />
          <Text style={[styles.searchInput, { color: '#abb7c2' }]}>
            Search
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.profileSection}>
        {user?.imageUrl ? (
          <ExpoImage
            source={{ uri: `${user.imageUrl}?timestamp=${imageTimestamp}` }}
            style={styles.profileImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            onError={(e) => {
              console.log('Failed to load image:', e?.error);
              setUser(prev => ({ ...prev, imageUrl: null }));
            }}
          />
        ) : (
          <View style={[styles.profileImage, styles.defaultProfileImage]}>
            <Ionicons name="person" size={24} color="#888" />
          </View>
        )}
        <View style={styles.profileInfo}>
          <Text style={styles.profileTitle}>Invite friends on Trippy</Text>
          <Text style={styles.profileUsername}>
            @{user?.userName || 'loading...'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowShareModal(true)}>
          <Ionicons name="share-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </TouchableOpacity>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          onPress={() => setRegionsModalVisible(true)}
          style={styles.regionButton}
        >
          <Text style={styles.regionButtonText}>HK Regions</Text>
          <Ionicons name="chevron-down" size={18} color="#fff" />
        </TouchableOpacity>
        <View style={styles.secondaryFiltersContainer}>
          <TouchableOpacity
            onPress={() => setTopicsModalVisible(true)}
          >
            {selectedTopics.length > 0 ? (
              <LinearGradient
                colors={['#5468ff', '#81d8d0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.filterButton}
              >
                <Text style={styles.filterText}>
                  {selectedTopics.length > 0
                    ? `${selectedTopics[0].charAt(0).toUpperCase() + selectedTopics[0].slice(1)}${selectedTopics.length > 1 ? ` +${selectedTopics.length - 1}` : ''
                    }`
                    : 'Topics'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#fff" />
              </LinearGradient>
            ) : (
              <View style={styles.filterButton}>
                <Text style={styles.filterText}>Topics</Text>
                <Ionicons name="chevron-down" size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMonthsModalVisible(true)}
          >
            {selectedMonths.length > 0 ? (
              <LinearGradient
                colors={['#5468ff', '#81d8d0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.filterButton}
              >
                <Text style={styles.filterText}>
                  {selectedMonths.length > 0
                    ? `${selectedMonths[0]}${selectedMonths.length > 1 ? ` +${selectedMonths.length - 1}` : ''
                    }`
                    : 'Travel Months'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#fff" />
              </LinearGradient>
            ) : (
              <View style={styles.filterButton}>
                <Text style={styles.filterText}>Travel Months</Text>
                <Ionicons name="chevron-down" size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.separator} />
    </View>
  );

  const renderPost = useCallback(({ item }) => (
    <PostItem
      item={item}
      onLike={handleLike}
      getTimeAgo={getTimeAgo}
      formatDate={formatDate}
      router={router}
    />
  ), [handleLike, router]);

  // Remove handleLoadMore since we're loading all posts at once
  const handleRefresh = () => {
    dispatch(fetchPosts());
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[{
        flex: 1,
        backgroundColor: '#000'
      }, { opacity: fadeAnim }]}>
        {renderHeader()}
        {isLoading ? (
          <FlatList
            data={[1, 2, 3]}
            renderItem={() => <SkeletonPost />}
            keyExtractor={item => item.toString()}
          />
        ) : (
          <FlatList
            data={filteredPosts}
            renderItem={renderPost}
            keyExtractor={item => item.id}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={handleRefresh}
                tintColor="#fff"
                colors={["#fff"]}
                progressBackgroundColor="#000"
                title="Pull to refresh"
                titleColor="#fff"
                progressViewOffset={20}
              />
            }
            onScrollEndDrag={(event) => {
              // Only trigger refresh if pulled down significantly
              const offset = event.nativeEvent.contentOffset.y;
              if (offset < -100) { // Increase this value to make it less sensitive
                handleRefresh();
              }
            }}
            ListFooterComponent={() => (
              <View style={styles.footerContainer}>
                <Text style={styles.endMessage}>
                  {filteredPosts.length === 0
                    ? "No posts found"
                    : "You've reached the end"}
                </Text>
              </View>
            )}
          />
        )}
        <NavBar style={styles.navBar} />
      </Animated.View>

      {/* Topics Modal */}
      <Modal
        transparent={true}
        visible={topicsModalVisible}
        animationType="fade"
        onRequestClose={() => setTopicsModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setTopicsModalVisible(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={resetTopics}>
              <Text style={styles.resetButton}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTopicsModalVisible(false)}>
              <Text style={styles.modalTitle}>Apply</Text>
            </TouchableOpacity>
          </View>
          {topicOptions.map((topic) => (
            <TouchableOpacity
              key={topic}
              style={styles.modalOption}
              onPress={() => handleTopicSelect(topic)}
            >
              {selectedTopics.includes(topic) ? (
                <MaskedView
                  style={{ height: 24 }}
                  maskElement={
                    <Text style={styles.modalOptionText}>
                      {topic.charAt(0).toUpperCase() + topic.slice(1)}
                    </Text>
                  }
                >
                  <LinearGradient
                    colors={['#5468ff', '#81d8d0']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ flex: 1 }}
                  >
                    <Text style={[styles.modalOptionText, { opacity: 0 }]}>
                      {topic.charAt(0).toUpperCase() + topic.slice(1)}
                    </Text>
                  </LinearGradient>
                </MaskedView>
              ) : (
                <Text style={styles.modalOptionText}>
                  {topic.charAt(0).toUpperCase() + topic.slice(1)}
                </Text>
              )}
              {selectedTopics.includes(topic) && (
                <MaskedView
                  style={{ height: 24, width: 24 }}
                  maskElement={
                    <View style={{ backgroundColor: 'transparent' }}>
                      <Ionicons name="checkmark" size={20} color="white" />
                    </View>
                  }
                >
                  <LinearGradient
                    colors={['#5468ff', '#81d8d0']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ flex: 1 }}
                  />
                </MaskedView>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      {/* Months Modal */}
      <Modal
        transparent={true}
        visible={monthsModalVisible}
        animationType="fade"
        onRequestClose={() => setMonthsModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMonthsModalVisible(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Travel Months</Text>
            <TouchableOpacity onPress={resetMonths}>
              <Text style={styles.resetButton}>Reset</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScrollView}>
            {monthOptions.map((month) => (
              <TouchableOpacity
                key={month}
                style={styles.modalOption}
                onPress={() => handleMonthSelect(month)}
              >
                {selectedMonths.includes(month) ? (
                  <MaskedView
                    style={{ height: 24 }}
                    maskElement={
                      <Text style={styles.modalOptionText}>{month}</Text>
                    }
                  >
                    <LinearGradient
                      colors={['#5468ff', '#81d8d0']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ flex: 1 }}
                    >
                      <Text style={[styles.modalOptionText, { opacity: 0 }]}>{month}</Text>
                    </LinearGradient>
                  </MaskedView>
                ) : (
                  <Text style={styles.modalOptionText}>{month}</Text>
                )}
                {selectedMonths.includes(month) && (
                  <MaskedView
                    style={{ height: 24, width: 24 }}
                    maskElement={
                      <View style={{ backgroundColor: 'transparent' }}>
                        <Ionicons name="checkmark" size={20} color="white" />
                      </View>
                    }
                  >
                    <LinearGradient
                      colors={['#5468ff', '#81d8d0']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ flex: 1 }}
                    />
                  </MaskedView>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        transparent={true}
        visible={showShareModal}
        animationType="fade"
        onRequestClose={() => setShowShareModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowShareModal(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={styles.shareModalContainer}>
          <View style={styles.shareModalHeader}>
            <Text style={styles.shareModalTitle}>Share to</Text>
            <TouchableOpacity onPress={() => setShowShareModal(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.shareOptionsContainer}>
              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => shareToSocialMedia('facebook')}
              >
                <LinearGradient
                  colors={['#1877F2', '#166FDA']}
                  style={styles.socialIconContainer}
                >
                  <Ionicons name="logo-facebook" size={24} color="#fff" />
                </LinearGradient>
                <Text style={styles.shareOptionText}>Facebook</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => shareToSocialMedia('x')}
              >
                <LinearGradient
                  colors={['#000000', '#141619']}
                  style={styles.socialIconContainer}
                >
                  <Text style={styles.xLogo}>𝕏</Text>
                </LinearGradient>
                <Text style={styles.shareOptionText}>X</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => shareToSocialMedia('instagram')}
              >
                <LinearGradient
                  colors={['#E4405F', '#D93A54']}
                  style={styles.socialIconContainer}
                >
                  <Ionicons name="logo-instagram" size={24} color="#fff" />
                </LinearGradient>
                <Text style={styles.shareOptionText}>Instagram</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => shareToSocialMedia('whatsapp')}
              >
                <LinearGradient
                  colors={['#25D366', '#22C35E']}
                  style={styles.socialIconContainer}
                >
                  <Ionicons name="logo-whatsapp" size={24} color="#fff" />
                </LinearGradient>
                <Text style={styles.shareOptionText}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => shareToSocialMedia('telegram')}
              >
                <LinearGradient
                  colors={['#0088CC', '#007AB8']}
                  style={styles.socialIconContainer}
                >
                  <Ionicons name="paper-plane" size={24} color="#fff" />
                </LinearGradient>
                <Text style={styles.shareOptionText}>Telegram</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <UgcEulaModal
        visible={eulaChecked && eulaVisible}
        onAccept={() => setEulaVisible(false)}
        onDecline={() => {
          setEulaVisible(false);
          router.replace('/homepage');
        }}
      />

      {regionsModalVisible && (
        <Modal
          transparent={true}
          visible={regionsModalVisible}
          animationType="fade"
          onRequestClose={() => setRegionsModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setRegionsModalVisible(false)}>
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>HK Regions</Text>
              <TouchableOpacity onPress={resetRegions}>
                <Text style={styles.resetButton}>Reset</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {Object.entries(MAIN_REGIONS).map(([area, regions]) => (
                <View key={area}>
                  <Text style={styles.sectionTitle}>{area}</Text>
                  {regions.map((region) => (
                    <TouchableOpacity
                      key={region}
                      style={styles.modalOption}
                      onPress={() => handleRegionSelect(region)}
                    >
                      {selectedRegions.includes(region) ? (
                        <MaskedView
                          style={{ height: 24 }}
                          maskElement={
                            <Text style={styles.modalOptionText}>
                              {region}
                            </Text>
                          }
                        >
                          <LinearGradient
                            colors={['#5468ff', '#81d8d0']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{ flex: 1 }}
                          >
                            <Text style={[styles.modalOptionText, { opacity: 0 }]}>
                              {region}
                            </Text>
                          </LinearGradient>
                        </MaskedView>
                      ) : (
                        <Text style={styles.modalOptionText}>{region}</Text>
                      )}
                      {selectedRegions.includes(region) && (
                        <MaskedView
                          style={{ height: 24, width: 24 }}
                          maskElement={
                            <View style={{ backgroundColor: 'transparent' }}>
                              <Ionicons name="checkmark" size={20} color="white" />
                            </View>
                          }
                        >
                          <LinearGradient
                            colors={['#5468ff', '#81d8d0']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{ flex: 1 }}
                          />
                        </MaskedView>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </Modal>
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
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  searchContainer: {
    marginBottom: 24,
    marginTop: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
  },
  filterContainer: {
    marginBottom: 16,
  },
  secondaryFiltersContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  regionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  regionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 3,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25282d',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginRight: 8,
    height: 33,
    gap: 4,
  },
  filterText: {
    color: '#fff',
    marginRight: 4,
    fontSize: 12,
    fontWeight: "600",
  },
  postContainer: {
    padding: 16,
    backgroundColor: '#000',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  postHeaderText: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4
  },
  dateLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    color: '#d9d9d9',
    fontSize: 12,
  },
  dotSeparator: {
    color: '#d9d9d9',
    fontSize: 12,
    marginHorizontal: 4,
  },
  location: {
    color: '#d9d9d9',
    fontSize: 12,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  postTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  postContent: {
    color: '#979797',
    fontSize: 12,
    marginBottom: 16,
  },
  accompanyButton: {
    backgroundColor: '#25282d',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  accompanyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    marginTop: 20
  },
  actionCount: {
    color: '#fff',
    marginLeft: 4,
  },
  timeAgo: {
    color: '#888',
    marginLeft: 'auto',
    marginTop: 20,
    fontSize: 10
  },
  navBar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 4
  },
  profileUsername: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 600
  },
  separator: {
    height: 5,
    backgroundColor: '#333',
    marginBottom: 16,
    marginHorizontal: -16,
  },
  defaultProfileImage: {
    backgroundColor: "#ccc",
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 12,
  },
  imageContainer: {
    width: 84,
    height: 84,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1c1c1e',
  },
  mainImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  additionalImagesIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 15,
    padding: 4,
  },
  additionalImagesText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 10
  },
  modalTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    fontWeight: '600',
  },
  resetButton: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalOptionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalScrollView: {
    flexGrow: 0,
  },
  footerContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  endMessage: {
    color: '#888',
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  shareModalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '40%',
  },
  shareModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  shareModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  shareOptionsContainer: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  shareOption: {
    alignItems: 'center',
    marginHorizontal: 15,
  },
  socialIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  shareOptionText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  skeleton: {
    backgroundColor: '#2a2a2a',
  },
  skeletonText: {
    height: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
  },
  '@keyframes shimmer': {
    '0%': {
      backgroundColor: '#2a2a2a',
    },
    '50%': {
      backgroundColor: '#3a3a3a',
    },
    '100%': {
      backgroundColor: '#2a2a2a',
    },
  },
  skeletonAnimation: {
    animationName: 'shimmer',
    animationDuration: '1.5s',
    animationIterationCount: 'infinite',
  },
  xLogo: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '500',
    // Using a fallback font stack
    fontFamily: 'System',
  },
  userImageTouchable: {
    borderRadius: 20,
    overflow: 'hidden',
  },
});

export default CommunityPage;