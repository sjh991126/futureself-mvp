import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  ActivityIndicator,
  ScrollView,
  Platform
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
// import { Video } from 'expo-av';
let Video = null;
try {
  Video = require('expo-av').Video;
} catch (error) {
  console.warn('expo-av not available:', error);
}
import { Ionicons } from '@expo/vector-icons';

// 장소 데이터
const LOCATIONS = {
  "Entire Hong Kong": ['Hong Kong'],
  "Hong Kong Island": [
    'Kennedy Town', 'Sheung Wan', 'Central', 'Admiralty',
    'Eastern', 'Southern', 'Wanchai', 'Causeway Bay',
    'Northpoint'
  ],
  "Kowloon": [
    "Kowloon City", "Kwun Tong", "Sham Shui Po", 'Wong Tai Sin',
    'Yau Tsim Mong'
  ],
  "The New Territories": [
    'Lantau West', 'Lantau East', 'Lamma', 'Cheung Chau', 'Tsing Yi',
    'Kwai Tsing', 'North', 'Sai Kung', 'Sha Tin',
    'Tai Po', 'Tsuen Wan', 'Tuen Mun', 'Yuen Long'
  ],
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const HighlightViewer = ({ highlight, startIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showAddPlace, setShowAddPlace] = useState(false);

  const videoRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressAnimation = useRef(null);

  // Extract data from highlight prop
  const mediaItems = highlight?.mediaItems || [];
  const userName = highlight?.userName || '';
  const userImageUrl = highlight?.userImageUrl || '';
  const placeName = highlight?.placeName || '';
  const totalItems = mediaItems.length;

  // Validate that we have media items
  if (!mediaItems || mediaItems.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No media items available</Text>
        <TouchableOpacity onPress={onClose} style={styles.errorCloseButton}>
          <Text style={styles.errorCloseText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 진행 상태 바 애니메이션
  useEffect(() => {
    startProgressAnimation();

    return () => {
      if (progressAnimation.current) {
        progressAnimation.current.stop();
      }
    };
  }, [currentIndex]);

  const startProgressAnimation = () => {
    // 이전 애니메이션 중지
    if (progressAnimation.current) {
      progressAnimation.current.stop();
    }

    // 진행 상태 리셋
    progressAnim.setValue(0);

    // 현재 미디어 타입에 따라 애니메이션 기간 설정
    const currentMedia = mediaItems[currentIndex];
    const duration = currentMedia?.mediaType === 'VIDEO' ? 60000 : 5000; // 비디오는 최대 60초, 이미지는 5초

    // 새 애니메이션 시작
    progressAnimation.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration: duration,
      useNativeDriver: false
    });

    progressAnimation.current.start(({ finished }) => {
      if (finished && !isPaused) {
        goToNextItem();
      }
    });
  };

  // 비디오 플레이어 상태 관리
  const handleVideoLoad = () => {
    setIsLoading(false);
    if (videoRef.current) {
      videoRef.current.playAsync();
    }
  };

  const handleVideoEnd = () => {
    goToNextItem();
  };

  // 다음 아이템으로 이동
  const goToNextItem = () => {
    if (currentIndex < totalItems - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsLoading(true);
    } else {
      onClose(); // 마지막 아이템이면 뷰어 닫기
    }
  };

  // 이전 아이템으로 이동
  const goToPrevItem = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsLoading(true);
    }
  };

  // 터치 영역 제스처 핸들러
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (evt, gestureState) => {
        // 탭 위치에 따라 이전/다음 아이템으로 이동
        const touchX = evt.nativeEvent.locationX;

        if (touchX < SCREEN_WIDTH / 3) {
          // 화면 왼쪽 1/3 터치 시 이전 아이템
          goToPrevItem();
        } else if (touchX > (SCREEN_WIDTH * 2) / 3) {
          // 화면 오른쪽 1/3 터치 시 다음 아이템
          goToNextItem();
        } else {
          // 화면 중앙 터치 시 비디오 재생/중지 토글
          const currentMedia = mediaItems[currentIndex];
          if (currentMedia?.mediaType === 'VIDEO') {
            togglePlayPause();
          }
        }
      }
    })
  ).current;

  // 비디오 재생/중지 토글
  const togglePlayPause = async () => {
    if (!videoRef.current) return;

    if (isPaused) {
      await videoRef.current.playAsync();
      startProgressAnimation(); // Resume animation
      setIsPaused(false);
    } else {
      await videoRef.current.pauseAsync();
      if (progressAnimation.current) {
        progressAnimation.current.stop();
      }
      setIsPaused(true);
    }
  };

  // 현재 미디어 아이템 렌더링
  const renderCurrentMedia = () => {
    const media = mediaItems[currentIndex];
    
    if (!media) {
      return null;
    }

    if (media.mediaType === 'VIDEO') {
      if (!Video) {
        return (
          <View style={styles.mediaContainer}>
            <View style={styles.videoUnavailable}>
              <Ionicons name="videocam-off" size={50} color="#ccc" />
              <Text style={styles.videoUnavailableText}>Video playback unavailable</Text>
            </View>
          </View>
        );
      }
      return (
        <View style={styles.mediaContainer}>
          <Video
            ref={videoRef}
            source={{ uri: media.mediaUrl }}
            style={styles.mediaContent}
            resizeMode="contain"
            shouldPlay={true}
            isLooping={false}
            onLoad={handleVideoLoad}
            onPlaybackStatusUpdate={(status) => {
              if (status.didJustFinish) {
                handleVideoEnd();
              }
            }}
          />
          {isPaused && (
            <View style={styles.pauseOverlay}>
              <Ionicons name="play" size={50} color="white" />
            </View>
          )}
        </View>
      );
    } else {
      return (
        <View style={styles.mediaContainer}>
          <ExpoImage
            source={{ uri: media.mediaUrl }}
            style={styles.mediaContent}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={150}
            onLoad={() => setIsLoading(false)}
            onLoadStart={() => setIsLoading(true)}
          />
        </View>
      );
    }
  };

  // 진행 상태 바 렌더링
  const renderProgressBars = () => {
    return (
      <View style={styles.progressContainer}>
        {mediaItems.map((_, index) => (
          <View
            key={`progress-${index}`}
            style={[
              styles.progressBarBackground,
              { flex: 1, marginHorizontal: 2 }
            ]}
          >
            {index === currentIndex ? (
              <Animated.View
                style={[
                  styles.progressBarForeground,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    })
                  }
                ]}
              />
            ) : index < currentIndex ? (
              <View style={[styles.progressBarForeground, { width: '100%' }]} />
            ) : null}
          </View>
        ))}
      </View>
    );
  };

  // Calculate time ago (placeholder - you can implement actual logic)
  const getTimeAgo = () => {
    // This is a placeholder - implement actual time calculation based on createdAt
    return '2h';
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        {renderProgressBars()}
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            {userImageUrl ? (
              <ExpoImage
                source={{ uri: userImageUrl }}
                style={styles.userAvatar}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={[styles.userAvatar, styles.placeholderAvatar]}>
                <Ionicons name="person" size={20} color="#ccc" />
              </View>
            )}
            <Text style={styles.username}>{userName}</Text>
            <Text style={styles.dotSeparator}>•</Text>
            <Text style={styles.timestamp}>{getTimeAgo()}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 미디어 콘텐츠 */}
      <View
        style={styles.contentContainer}
        {...panResponder.panHandlers}
      >
        {renderCurrentMedia()}

        {/* 로딩 인디케이터 */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="white" />
          </View>
        )}
      </View>

      {/* 하단 설명 및 장소 정보 */}
      <View style={styles.footer}>
        {mediaItems[currentIndex]?.description ? (
          <Text style={styles.description}>
            {mediaItems[currentIndex].description}
          </Text>
        ) : null}

        <View style={styles.placeContainer}>
          {placeName ? (
            <View style={styles.placeInfo}>
              <Ionicons name="location" size={16} color="#3897f0" />
              <Text style={styles.placeName}>{placeName}</Text>
            </View>
          ) : (
            !showAddPlace && (
              <TouchableOpacity
                style={styles.addPlaceButton}
                onPress={() => setShowAddPlace(true)}
              >
                <Ionicons name="add-circle-outline" size={20} color="#3897f0" />
                <Text style={styles.addPlaceText}>Add Location</Text>
              </TouchableOpacity>
            )
          )}

          {showAddPlace && (
            <View style={styles.placeSelector}>
              <Text style={styles.placeSelectorTitle}>Select a location:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.locationScrollView}
              >
                {Object.entries(LOCATIONS).map(([region, places]) => (
                  places.map((place) => (
                    <TouchableOpacity
                      key={place}
                      style={styles.placeOption}
                      onPress={() => {
                        // 여기서 장소 저장 API 호출 (실제 구현 필요)
                        console.log(`Selected place: ${place}`);
                        setShowAddPlace(false);
                      }}
                    >
                      <Text style={styles.placeOptionText}>{place}</Text>
                    </TouchableOpacity>
                  ))
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  errorCloseButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#3897f0',
    borderRadius: 5,
  },
  errorCloseText: {
    color: '#fff',
    fontSize: 16,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 10,
    zIndex: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  progressBarBackground: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1,
  },
  progressBarForeground: {
    height: 2,
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  placeholderAvatar: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  username: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  dotSeparator: {
    color: '#fff',
    marginHorizontal: 6,
    fontSize: 10,
  },
  timestamp: {
    color: '#eee',
    fontSize: 14,
  },
  closeButton: {
    padding: 5,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaContent: {
    width: '100%',
    height: '100%',
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  description: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 10,
  },
  placeContainer: {
    marginTop: 10,
  },
  placeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeName: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 5,
  },
  addPlaceButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addPlaceText: {
    color: '#3897f0',
    fontSize: 14,
    marginLeft: 5,
  },
  placeSelector: {
    marginTop: 10,
  },
  placeSelectorTitle: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
  },
  locationScrollView: {
    maxHeight: 100,
  },
  placeOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(56, 151, 240, 0.2)',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#3897f0',
  },
  placeOptionText: {
    color: '#fff',
    fontSize: 14,
  },
  videoUnavailable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  videoUnavailableText: {
    color: '#ccc',
    marginTop: 10,
    fontSize: 16,
  },
});

export default HighlightViewer;