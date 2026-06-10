import { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  Animated,
  Modal,
  SafeAreaView,
  StatusBar,
  Linking,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL, TokenManager } from '../../app/src/config';
import Video from 'react-native-video';
import axios from 'axios';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ImageViewer = ({ visible, onClose, mediaItem }) => {
  const [aspectRatio, setAspectRatio] = useState(1);

  useEffect(() => {
    if (mediaItem) {
      if (mediaItem.media_type != 'VIDEO') {
        Image.getSize(mediaItem.media_url, (width, height) => {
          setAspectRatio(width / height);
        });
      }
    }
  }, [mediaItem]);

  if (!mediaItem) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
        >
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>

        <View style={styles.singleMediaContainer}>
          <View style={styles.mediaWrapper}>
            {mediaItem.media_type === 'VIDEO' ? (
              <Video
                source={{ uri: mediaItem.media_url }}
                style={[styles.fullScreenMedia, { aspectRatio }]}
                resizeMode="contain"
                controls={true}
                paused={false}
              />
            ) : (
              <ExpoImage
                source={{ uri: mediaItem.media_url }}
                style={[styles.fullScreenMedia, { aspectRatio }]}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            )}
          </View>
          <Text style={styles.singleMediaText} onPress={() => Linking.openURL(mediaItem.permalink)}>
            View more on Instagram
          </Text>
          <View style={styles.sectionDivider} />
          <View style={styles.Icons}>
            <Ionicons name="heart-outline" size={24} color="#fff" style={styles.actionIcon} />
            <View style={styles.textcontainer}>
              <Text style={styles.metrics}> {mediaItem.like_count}</Text>
            </View>
            <Ionicons name="chatbubble-outline" size={24} color="#fff" style={styles.actionIcon} />
            <View style={styles.textcontainer}>
              <Text style={styles.metrics}> {mediaItem.comments_count}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const ExternalHandle = ({ location_query = {} }) => {
  const [posts, setPosts] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [isImageViewerVisible, setImageViewerVisible] = useState(false);
  const [loading, setLoading] = useState(true); // 로딩 상태 추가

  // Animation value for horizontal movement
  const position = useRef(new Animated.Value(0)).current;

  // Calculate dimensions
  const gap = 2;
  const numberOfColumns = 3;
  const itemWidth = (SCREEN_WIDTH - 20 - (gap * (numberOfColumns - 1))) / numberOfColumns;

  const handleMediaPress = (item) => {
    setSelectedMedia(item);
    setImageViewerVisible(true);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getInstagramData(location_query);
        const filteredData = data.filter(item => item.media_url != null);
        setPosts(filteredData);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [location_query]);

  const getInstagramData = async (location_query) => {
    try {
      const token = await TokenManager.getAccessToken();
      const response = await axios.get(`${API_BASE_URL}/api/instagram/v1/${location_query}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error searching hashtags:', error);
      throw error;
    }
  };

  // Skeleton 컴포넌트
  const SkeletonGrid = () => (
    <View style={styles.gridContainer}>
      {[0, 1, 2].map((row) => (
        <View key={row} style={styles.row}>
          {[0, 1, 2].map((col) => (
            <View
              key={`${row}-${col}`}
              style={[
                styles.skeletonItem,
                { width: itemWidth, height: itemWidth }
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );

  const renderItem = ({ item }) => {
    if (!item.media_url) return null;

    return (
      <TouchableOpacity
        style={[styles.gridItem, { width: itemWidth, height: itemWidth }]}
        onPress={() => handleMediaPress(item)}
      >
        {item.media_type === 'VIDEO' ? (
          <Video
            source={{ uri: item.media_url }}
            style={styles.gridImage}
            paused={true}
            muted={true}
            resizeMode={'cover'}
            seekTime={0}
            poster={item.media_url}
          />
        ) : (
          <ExpoImage
            style={styles.gridImage}
            source={{ uri: item.media_url }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
            onError={(e) => console.log('Image load error:', e?.error)}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Grid View */}
      <View style={styles.gridView}>
        {loading ? (
          <SkeletonGrid />
        ) : posts.length === 0 ? (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No Instagram posts yet!</Text>
            <Text style={styles.noDataSubtext}>Check back later for updates</Text>
          </View>
        ) : (
          <FlatList
            data={posts}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={3}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.gridContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
      <ImageViewer
        visible={isImageViewerVisible}
        onClose={() => {
          setImageViewerVisible(false);
          setSelectedMedia(null);
        }}
        mediaItem={selectedMedia}
      />
    </View>
  );
};


export default ExternalHandle;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  gridView: {
    width: SCREEN_WIDTH,
  },
  gridContainer: {
    paddingBottom: 80,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 2,
    marginBottom: 2,
  },
  gridItem: {
    aspectRatio: 1,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  // Skeleton 스타일
  skeletonItem: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    aspectRatio: 1,
  },
  // No Data 스타일
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  noDataText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  noDataSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: StatusBar.currentHeight || 40,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 40,
    fontWeight: 'bold',
  },
  singleMediaContainer: {
    backgroundColor: '#25282D',
    borderRadius: 20,
    width: SCREEN_WIDTH * 0.8,
    paddingTop: 20,
    shadowColor: 'black',
    maxHeight: '80%',
  },
  mediaWrapper: {
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
  fullScreenMedia: {
    width: '100%',
    backgroundColor: '#25282D',
  },
  singleMediaText: {
    color: '#0084FF',
    textAlign: 'center',
    paddingTop: 15,
  },
  Icons: {
    flexDirection: "row",
    marginBottom: 15,
    marginLeft: 15,
    gap: 10,
    paddingTop: 15,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'white',
    marginTop: 15,
  },
  metrics: {
    color: 'white',
  },
  textcontainer: {
    flex: 1,
    maxWidth: 50,
    justifyContent: 'center',
  }
});