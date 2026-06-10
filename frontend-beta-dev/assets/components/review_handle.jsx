import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, FlatList, ActivityIndicator } from 'react-native';
import React, { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import PencilIcon from '../../assets/icons/pencil_icon';
import ImageViewing from 'react-native-image-viewing';
import axios from 'axios';
import api, { API_BASE_URL, TokenManager } from '../../app/src/config';
import ReviewText from './review_text';

const ReviewHandle = ({ id, name, googleid, style = {} }) => {
    const router = useRouter();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isImageViewerVisible, setImageViewerVisible] = useState(false);
    const [imageViewerIndex, setImageViewerIndex] = useState(0);
    const [imageUrlsArray, setImageUrlsArray] = useState([]);

    const ReviewSkeleton = () => (
        <View style={styles.skeletonContainer}>
            {[1, 2, 3].map((item) => (
                <View key={item} style={styles.skeletonItem}>
                    <View style={styles.skeletonProfile} />
                    <View style={styles.skeletonContent}>
                        <View style={styles.skeletonTitle} />
                        <View style={styles.skeletonName} />
                        <View style={styles.skeletonText} />
                        <View style={[styles.skeletonText, { width: '80%' }]} />
                    </View>
                </View>
            ))}
        </View>
    );

    const handleReviewPress = async (placeId, title) => {
        try {
            await AsyncStorage.setItem('placeId', placeId);
            await AsyncStorage.setItem('title', title);
            router.push('/write_review');
        } catch (error) {
            console.error('Error saving data to AsyncStorage:', error);
        }
    };

    const fetchReviews = useCallback(async () => {
        setLoading(true);
        try {
            console.log("Fetching reviews for ID:", id);
            const token = await TokenManager.getAccessToken();
            const response = await api.get(`/api/places/${id}/reviews`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setReviews(response.data);
            console.log('Reviews fetched:', response.data);
        } catch (error) {
            console.error('Error fetching reviews:', error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useFocusEffect(
        useCallback(() => {
            fetchReviews();
        }, [fetchReviews])
    );

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.review_item_container} key={item.reviewId.toString()}>
            <View style={styles.review_profile_container}>
                <TouchableOpacity
                    onPress={() => router.push({
                        pathname: '/publicprofile',
                        params: { userId: item.user.userId }
                    })}
                >
                    {item.user.imageUrl ? (
                        <Image
                            style={styles.review_profile}
                            resizeMode="cover"
                            source={{ uri: item.user.imageUrl }}
                            onError={(e) => console.log('User image load error:', e.nativeEvent.error)}
                        />
                    ) : (
                        <View style={styles.iconContainer}>
                            <Ionicons name="person" size={28} color="#888" />
                        </View>
                    )}
                </TouchableOpacity>
                <View style={styles.review_profile_name_container}>
                    <View style={styles.review_text_container}>
                        <Text style={styles.title}>{item.title}</Text>
                        <Text style={styles.review_profile_name}>{item.user.username}</Text>
                    </View>
                </View>
            </View>
            <ReviewText text={item.content} />
            {item.images && item.images.length > 0 && (
                <ScrollView horizontal directionalLockEnabled={true} style={styles.image_scroll_view} nestedScrollEnabled={true}>
                    {item.images.map((imageUri, index) => (
                        <TouchableOpacity
                            key={index}
                            onPress={() => {
                                setImageViewerIndex(index);
                                setImageUrlsArray(item.images.map(url => ({ uri: url })));
                                setImageViewerVisible(true);
                            }}
                        >
                            <Image
                                style={styles.review_image}
                                source={{ uri: imageUri }}
                                onError={(e) => console.log('Review image load error:', e.nativeEvent.error)}
                            />
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={[styles.review_container]}>
            {loading ? (
                <ReviewSkeleton />
            ) : reviews.length === 0 ? (
                <View style={styles.noReviewsContainer}>
                    <Text style={styles.noReviewsText}>No reviews yet!</Text>
                    <Text style={styles.noReviewsSubtext}>Be the first one to write one</Text>
                </View>
            ) : (
                <FlatList
                    data={reviews}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.reviewId.toString()}
                    contentContainerStyle={styles.flatListContent}
                    showsVerticalScrollIndicator={true}
                />
            )}

            <ImageViewing
                images={imageUrlsArray}
                imageIndex={imageViewerIndex}
                visible={isImageViewerVisible}
                onRequestClose={() => setImageViewerVisible(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    review_container: {
        flex: 1,
        paddingHorizontal: 8,
        position: 'relative',
    },
    review: {
        fontSize: 16,
        fontWeight: "600",
        color: "#fff",
        marginBottom: 10,
    },
    scrollView: {
        flex: 1,
    },
    review_item_container: {
        marginBottom: 20,
    },
    review_profile_container: {
        flexDirection: "row",
        alignItems: "center",
    },
    review_profile: {
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
    review_profile_name_container: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginLeft: 15,
    },
    review_text_container: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: "700",
        color: "#fff",
    },
    review_profile_name: {
        fontSize: 11,
        fontWeight: "600",
        color: "#fff",
    },
    review_profile_button: {
        borderRadius: 20,
        backgroundColor: "#303030",
        paddingHorizontal: 15,
        paddingVertical: 5,
    },
    review_profile_button_text: {
        fontSize: 12,
        fontWeight: "700",
        color: "#fff",
    },
    review_content: {
        fontSize: 13,
        fontWeight: "400",
        color: "#fff",
        marginTop: 10,
    },
    image_scroll_view: {
        marginTop: 10,
    },
    review_image: {
        width: 100,
        height: 100,
        borderRadius: 10,
        marginRight: 10,
    },
    pencil: {
        marginRight: 5
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
    flatListContent: {
        paddingBottom: 80,
    },
    // Skeleton 스타일
    skeletonContainer: {
        flex: 1,
        paddingVertical: 10,
    },
    skeletonItem: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    skeletonProfile: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    skeletonContent: {
        flex: 1,
        marginLeft: 15,
    },
    skeletonTitle: {
        width: '60%',
        height: 14,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 4,
        marginBottom: 6,
    },
    skeletonName: {
        width: '40%',
        height: 11,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 4,
        marginBottom: 10,
    },
    skeletonText: {
        width: '100%',
        height: 10,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 4,
        marginBottom: 6,
    },
});

export default ReviewHandle;