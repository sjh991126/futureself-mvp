import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import React, { useEffect, useState, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api, { API_BASE_URL, TokenManager } from '../../app/src/config';
import Star from '../../assets/components/star_component';

import ReviewText from './review_text';

const GoogleReviews = ({ googleid }) => {
  const router = useRouter();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);  // ref로 로드 상태 추적

  // 화면 진입 시 한 번만 실행
  useEffect(() => {
    const fetchReviews = async () => {
      if (!googleid || hasLoadedRef.current) return;  // 이미 로드했으면 중단
      
      hasLoadedRef.current = true;  // 즉시 true로 설정하여 중복 호출 방지
      setLoading(true);
      
      try {
        console.log("Google Id to be fetched:", googleid);
        const token = await TokenManager.getAccessToken();
        const response = await api.get(`/api/places/${googleid}/reviews/google`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setReviews(response.data || []);
        console.log('Google Reviews fetched:', response.data);
      } catch (error) {
        console.error('Error fetching Google reviews:', error);
        hasLoadedRef.current = false;  // 에러 시 재시도 가능하도록
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);  // 빈 의존성 배열 - 마운트 시 한 번만

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 1; i <= fullStars; i++) {
      stars.push(<Star key={i} filled />);
    }

    if (hasHalfStar) {
      stars.push(<Star key={fullStars + 1} halfFilled />);
    }

    return stars;
  };

  const ReviewSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map((item) => (
        <View key={item} style={styles.skeletonItem}>
          <View style={styles.skeletonProfile} />
          <View style={styles.skeletonContent}>
            <View style={styles.skeletonName} />
            <View style={styles.skeletonStars} />
            <View style={styles.skeletonText} />
            <View style={[styles.skeletonText, { width: '85%' }]} />
            <View style={[styles.skeletonText, { width: '70%' }]} />
          </View>
        </View>
      ))}
    </View>
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.reviewItemContainer}
      onPress={() => {
        console.log('Pressed Google Review for:', item.name);
      }}
    >
      <View style={styles.userContainer}>
        {item.imageLink ? (
          <ExpoImage
            style={styles.reviewProfile}
            contentFit="cover"
            cachePolicy="memory-disk"
            source={{ uri: item.imageLink }}
            onError={(e) => console.log('User image load error:', e?.error)}
          />
        ) : (
          <View style={styles.iconContainer}>
            <Ionicons name="person" size={28} color="#888" />
          </View>
        )}
        <Text style={styles.reviewProfileName}>{item.name}</Text>
      </View>
      <View style={styles.ratingContainer}>
        {renderStars(parseFloat(item.rating))}
      </View>
      <ReviewText text={item.reviewText || item.text} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.reviewContainer}>
      {loading ? (
        <ReviewSkeleton />
      ) : reviews.length === 0 ? (
        <View style={styles.noReviewsContainer}>
          <Text style={styles.noReviewsText}>No reviews yet!</Text>
          <Text style={styles.noReviewsSubtext}>Check back later for Google reviews</Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(_, index) => index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContentContainer}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={true}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  reviewContainer: {
    flex: 1,
    paddingHorizontal: 8,
    nestedScrollEnabled: true,
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewProfileName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#fff",
    marginLeft: 10,
  },
  listContentContainer: {
    paddingBottom: 80,
  },
  reviewItemContainer: {
    marginBottom: 20,
  },
  reviewProfile: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#ccc",
    justifyContent: 'center',
    alignItems: 'center',
    overflow: "hidden",
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewContent: {
    fontSize: 13,
    fontWeight: "400",
    color: "#fff",
  },
  noReviewsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  noReviewsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  noReviewsSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonContainer: {
    flex: 1,
    paddingVertical: 10,
  },
  skeletonItem: {
    marginBottom: 20,
  },
  skeletonProfile: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 10,
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonName: {
    width: '50%',
    height: 15,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    marginBottom: 10,
  },
  skeletonStars: {
    width: '30%',
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonText: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    marginBottom: 6,
  },
});

export default GoogleReviews;