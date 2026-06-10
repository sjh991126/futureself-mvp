import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  FlatList,
  Keyboard,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PostItem } from './community_home';
import { useDispatch } from 'react-redux';
import { toggleLikePost } from '../slices/postsSlice';
import { searchPosts } from '../src/api/searchPosts';

const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT_SEARCHES = 5;

const CommunitySearch = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadRecentSearches();
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadRecentSearches();
    }, [])
  );

  const searchInputRef = React.useRef(null);

  const loadRecentSearches = async () => {
    try {
      const searches = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (searches) {
        const parsed = JSON.parse(searches);
        const normalized = Array.isArray(parsed)
          ? parsed
              .filter(item => typeof item === 'string')
              .map(item => item.trim())
              .filter(Boolean)
              .slice(0, MAX_RECENT_SEARCHES)
          : [];
        setRecentSearches(normalized);
      } else {
        setRecentSearches([]);
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
      setRecentSearches([]);
    }
  };

  const saveRecentSearch = async (query) => {
    try {
      const normalizedQuery = query.trim();
      if (!normalizedQuery) return;

      let searches = [...recentSearches];
      searches = searches.filter(item => item !== normalizedQuery);
      searches.unshift(normalizedQuery);
      searches = searches.slice(0, MAX_RECENT_SEARCHES);
      
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
      setRecentSearches(searches);
    } catch (error) {
      console.error('Error saving recent search:', error);
    }
  };

  const handleSearch = async (query = searchQuery) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    try {
      console.log('Search Debug - Starting search with query:', query);
      const results = await searchPosts(query);
      console.log('Search Debug - Search results:', results);
      setSearchResults(results);
      saveRecentSearch(query);
    } catch (error) {
      console.error('Search Error Details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        response: {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers
        }
      });
      
      // More specific error message based on the error type
      let errorMessage = 'Failed to search posts. Please try again later.';
      if (error.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication error. Please log in again.';
      } else if (error.message.includes('Network Error')) {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      Alert.alert(
        'Search Error',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async (postId) => {
    dispatch(toggleLikePost(postId));
  };

  const getTimeAgo = (datetime) => {
    const now = new Date();
    const past = new Date(datetime);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  };

  const formatDate = (datetime) => {
    const date = new Date(datetime);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  const clearRecentSearch = async (searchToRemove) => {
    try {
      let updatedSearches;
      if (searchToRemove) {
        // Remove specific search
        updatedSearches = recentSearches.filter(search => search !== searchToRemove);
      } else {
        // Clear all searches
        updatedSearches = [];
      }
      
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updatedSearches));
      setRecentSearches(updatedSearches);
    } catch (error) {
      console.error('Error clearing recent searches:', error);
    }
  };

  const renderHeader = () => {
    if (searchResults.length > 0) return null;

    return (
      <View style={styles.recentSearchesContainer}>
        <View style={styles.recentSearchesHeader}>
          <Text style={styles.recentSearchesTitle}>Recent Searches</Text>
          {recentSearches.length > 0 && (
            <TouchableOpacity onPress={() => clearRecentSearch()}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
        {recentSearches.map((search, index) => (
          <View key={index} style={styles.recentSearchItem}>
            <TouchableOpacity 
              style={styles.recentSearchContent}
              onPress={() => {
                setSearchQuery(search);
                handleSearch(search);
              }}
            >
              <Ionicons name="time-outline" size={20} color="#888" />
              <Text style={styles.recentSearchText}>{search}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => clearRecentSearch(search)}
              style={styles.deleteButton}
            >
              <Ionicons name="close-circle-outline" size={20} color="#888" />
            </TouchableOpacity>
          </View>
        ))}
        {recentSearches.length === 0 && (
          <Text style={styles.emptyRecentText}>No recent searches yet</Text>
        )}
      </View>
    );
  };

  const PostItem = ({ item, router }) => {
    return (
      <TouchableOpacity
        onPress={() => router.push({
          pathname: '/post_content',
          params: { id: item.id }
        })}
      >
        <View style={styles.postContainer}>
          <View style={styles.postHeader}>
            <ExpoImage
              source={{ uri: item.userImage }}
              style={styles.userImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
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
                  transition={200}
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
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            Keyboard.dismiss();
            router.back();
          }}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={24} color="#000" style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search posts"
            placeholderTextColor="#abb7c2"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => handleSearch()}
            returnKeyType="search"
            autoFocus={true}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
            >
              <Ionicons name="close-circle" size={20} color="#000" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={searchResults}
        renderItem={({ item }) => (
          <PostItem
            item={item}
            router={router}
          />
        )}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={() => (
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          ) : null
        )}
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
    padding: 16,
    paddingTop: 8,
    backgroundColor: '#000',
  },
  backButton: {
    marginRight: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: '#000',
  },
  recentSearchesContainer: {
    padding: 16,
  },
  recentSearchesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recentSearchesTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  clearAllText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  recentSearchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recentSearchText: {
    color: '#fff',
    marginLeft: 12,
    fontSize: 14,
  },
  emptyRecentText: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  postContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    marginBottom: 16,
    padding: 16,
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
    fontWeight: '600',
  },
  dateLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    color: '#888',
    fontSize: 12,
  },
  location: {
    color: '#888',
    fontSize: 12,
  },
  contentContainer: {
    marginBottom: 12,
  },
  textContainer: {
    marginBottom: 12,
  },
  postTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  postContent: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  mainImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  additionalImagesIndicator: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 4,
    paddingHorizontal: 8,
  },
  additionalImagesText: {
    color: '#fff',
    fontSize: 12,
  },
  accompanyButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 15,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  accompanyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 4,
  },
});

export default CommunitySearch;
