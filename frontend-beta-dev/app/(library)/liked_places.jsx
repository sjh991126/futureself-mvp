import React, { useState, useEffect } from "react";
import {
    View, Text, TouchableOpacity, FlatList, Image, SafeAreaView, StyleSheet, RefreshControl
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { placeView } from "../src/api/ViewCounts";
import { getLikedPlaces } from "../src/api/LikeCheck";

const LikedPlaces = () => {
    const [places, setPlaces] = useState([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const router = useRouter();

    const fetchLikedPlaces = async (pageToLoad = 0, isRefresh = false) => {
        if (!isRefresh && !hasMore) return;

        try {
            if (isRefresh) {
                setRefreshing(true);
            } else if (pageToLoad > 0) {
                setLoadingMore(true);
            }

            const result = await getLikedPlaces(pageToLoad);
            const newContent = result.content;

            if (isRefresh) {
                setPlaces(newContent);
                setPage(1); // 첫 페이지 로드 후 다음 페이지는 1
            } else {
                setPlaces(prev => [...prev, ...newContent]);
                setPage(result.pageable.pageNumber + 1);
            }

            setHasMore(!result.last);
        } catch (error) {
            console.error("Error fetching liked places:", error);
        } finally {
            setLoadingMore(false);
            setRefreshing(false);
            setInitialLoading(false);
        }
    };

    useEffect(() => {
        fetchLikedPlaces(0, true);
    }, []);

    const renderPlace = ({ item }) => (
        <TouchableOpacity
            style={styles.placeItem}
            onPress={async () => {
                try {
                    await placeView(item.id);
                } catch (error) {
                    console.error('Error posting view count:', error);
                }

                router.push({
                    pathname: "/place_details",
                    params: {
                        placeId: item.id,
                    },
                });
            }}
        >
            {item.thumbnailUrl ? (
                <Image style={styles.placeImage} source={{ uri: item.thumbnailUrl }} />
            ) : (
                <View style={[styles.placeImage, { backgroundColor: "#333" }]} />
            )}
            <View style={styles.placeTextContainer}>
                <Text style={styles.placeTitle} numberOfLines={2}>
                    {item.name}
                </Text>
                <View style={styles.locationRatingContainer}>
                    <Text style={styles.placeLocation}>
                        {item.shortFormattedAddress?.split(",").pop() || ""}
                    </Text>
                    <Text style={styles.placeRating}>
                        {` · ${parseFloat(item.rating || 0).toFixed(1)} ★`}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const PlaceSkeleton = () => (
        <View style={styles.placeItem}>
            <View style={[styles.skeletonBase, styles.placeImageSkeleton]} />
            <View style={styles.placeTextContainer}>
                <View style={[styles.skeletonBase, styles.placeTitleSkeleton]} />
                <View style={[styles.skeletonBase, styles.placeLocationSkeleton]} />
            </View>
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backIconContainer}>
                    <Ionicons name="chevron-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.title}>Liked Locations</Text>
            </View>
            <FlatList
                data={initialLoading ? Array(6).fill(0) : places}
                renderItem={initialLoading ? PlaceSkeleton : renderPlace}
                keyExtractor={(item, index) =>
                    initialLoading ? `skeleton-${index}` : `place-${item.id}`
                }
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => fetchLikedPlaces(0, true)}
                        tintColor="#fff"
                        colors={["#fff"]}
                    />
                }
                onEndReached={() => {
                    if (!initialLoading && !loadingMore && hasMore) {
                        fetchLikedPlaces(page);
                    }
                }}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    loadingMore ? (
                        <>
                            <PlaceSkeleton />
                            <PlaceSkeleton />
                            <PlaceSkeleton />
                        </>
                    ) : null
                }
                ListEmptyComponent={
                    !initialLoading && places.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="heart-outline" size={48} color="#fff" style={{ marginBottom: 10 }} />
                            <Text style={styles.emptyText}>No liked places yet.</Text>
                        </View>
                    ) : null
                }
            />
        </SafeAreaView>
    );
};

export default LikedPlaces;

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        position: 'relative',
    },
    backIconContainer: {
        position: 'absolute',
        left: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        fontFamily: "Monsterrat-Bold",
        textAlign: "center",
    },
    listContainer: {
        paddingHorizontal: 10,
        paddingBottom: 20,
        flexGrow: 1, // 추가: empty state가 제대로 중앙에 위치하도록
    },
    placeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 6,
        backgroundColor: '#000',
        borderRadius: 14,
        paddingBottom: 8,
        marginHorizontal: 10,
    },
    placeImage: {
        width: 76,
        height: 76,
        borderRadius: 10,
    },
    placeTextContainer: {
        flex: 1,
        marginLeft: 15,
        marginRight: 10,
        justifyContent: 'center',
    },
    placeTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    locationRatingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    placeLocation: {
        color: '#fff',
        fontSize: 12,
        fontFamily: "Monsterrat-Regular",
    },
    placeRating: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#fff',
        marginLeft: 5,
    },
    skeletonBase: {
        backgroundColor: '#2a2a2a',
        borderRadius: 4,
        overflow: 'hidden'
    },
    placeImageSkeleton: {
        width: 76,
        height: 76,
        borderRadius: 8
    },
    placeTitleSkeleton: {
        width: '80%',
        height: 16,
        marginBottom: 8,
    },
    placeLocationSkeleton: {
        width: '60%',
        height: 12,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
        minHeight: 400, // 추가: 최소 높이 설정
    },
    emptyText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
        marginTop: 10,
    },
});