import React from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView } from 'react-native';

const SkeletonLoader = () => {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.backButton} />
                    <View style={styles.headerSpacer} />
                    <View style={styles.chatButton} />
                </View>

                {/* List Image */}
                <View style={styles.listImageContainer}>
                    <View style={styles.listImageSkeleton} />
                </View>

                {/* Title */}
                <View style={styles.titleContainer}>
                    <View style={styles.titleSkeleton} />
                    <View style={styles.menuButton} />
                </View>

                {/* Profile Container */}
                <View style={styles.profileContainer}>
                    <View style={styles.profileImageSkeleton} />
                    <View style={styles.profileNameSkeleton} />
                </View>

                {/* Highlights Container */}
                <View style={styles.highlightsContainer}>
                    {[1, 2, 3, 4].map((item) => (
                        <View key={item} style={styles.highlightItem}>
                            <View style={styles.highlightCircleSkeleton} />
                            <View style={styles.highlightTextSkeleton} />
                        </View>
                    ))}
                </View>

                {/* Date Button */}
                <View style={styles.dateButtonSkeleton} />

                {/* Map Container */}
                <View style={styles.mapContainer}>
                    <View style={styles.mapSkeleton} />
                    {/* Filter Buttons */}
                    <View style={styles.filterButtonsContainer}>
                        {[1, 2, 3].map((day) => (
                            <View key={day} style={styles.filterButtonSkeleton} />
                        ))}
                    </View>
                    {/* Expand Icon */}
                    <View style={styles.expandIconSkeleton} />
                </View>

                {/* Trip Days */}
                {[1, 2, 3].map((day) => (
                    <View key={day} style={styles.dayContainer}>
                        {/* Day Header */}
                        <View style={styles.dayHeaderSkeleton} />

                        {/* Places */}
                        {[1, 2].map((place) => (
                            <View key={place} style={styles.placeItem}>
                                <View style={styles.placeImageSkeleton} />
                                <View style={styles.placeTextContainer}>
                                    <View style={styles.placeTitleSkeleton} />
                                    <View style={styles.placeAddressSkeleton} />
                                    <View style={styles.placeRatingSkeleton} />
                                </View>
                            </View>
                        ))}
                    </View>
                ))}
            </ScrollView>
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
        justifyContent: "space-between",
        alignItems: 'center',
        width: "100%",
        paddingHorizontal: 8,
        paddingVertical: 12,
    },
    backButton: {
        width: 36,
        height: 36,
        backgroundColor: '#333',
        borderRadius: 18,
    },
    headerSpacer: {
        flex: 1,
    },
    chatButton: {
        width: 36,
        height: 36,
        backgroundColor: '#333',
        borderRadius: 18,
    },
    listImageContainer: {
        width: 250,
        height: 250,
        alignSelf: 'center',
        marginBottom: 16,
    },
    listImageSkeleton: {
        width: '100%',
        height: '100%',
        backgroundColor: '#333',
        borderRadius: 8,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        marginBottom: 12,
    },
    titleSkeleton: {
        height: 24,
        flex: 1,
        backgroundColor: '#333',
        borderRadius: 4,
        marginRight: 16,
    },
    menuButton: {
        width: 24,
        height: 24,
        backgroundColor: '#333',
        borderRadius: 12,
    },
    profileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        marginTop: 10,
        marginBottom: 16,
    },
    profileImageSkeleton: {
        width: 40,
        height: 40,
        backgroundColor: '#333',
        borderRadius: 20,
    },
    profileNameSkeleton: {
        height: 16,
        flex: 1,
        backgroundColor: '#333',
        borderRadius: 4,
        marginLeft: 8,
    },
    highlightsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingTop: 10,
        marginBottom: 16,
    },
    highlightItem: {
        alignItems: 'center',
        marginHorizontal: 3,
        width: 64,
    },
    highlightCircleSkeleton: {
        width: 64,
        height: 64,
        backgroundColor: '#333',
        borderRadius: 32,
        marginBottom: 6,
    },
    highlightTextSkeleton: {
        width: 40,
        height: 12,
        backgroundColor: '#333',
        borderRadius: 2,
    },
    dateButtonSkeleton: {
        height: 45,
        backgroundColor: '#333',
        borderRadius: 10,
        marginVertical: 10,
        marginHorizontal: 4,
    },
    mapContainer: {
        position: 'relative',
        width: '97%',
        height: 225,
        alignSelf: "center",
        marginTop: 5,
        marginVertical: 16,
    },
    mapSkeleton: {
        width: '100%',
        height: '100%',
        backgroundColor: '#333',
        borderRadius: 10,
    },
    filterButtonsContainer: {
        position: 'absolute',
        top: 10,
        left: 10,
        flexDirection: 'row',
        zIndex: 1,
    },
    filterButtonSkeleton: {
        width: 60,
        height: 32,
        backgroundColor: '#555',
        borderRadius: 16,
        marginRight: 8,
    },
    expandIconSkeleton: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 38,
        height: 38,
        backgroundColor: '#555',
        borderRadius: 19,
    },
    dayContainer: {
        marginBottom: 16,
    },
    dayHeaderSkeleton: {
        height: 20,
        width: 150,
        backgroundColor: '#333',
        borderRadius: 4,
        marginBottom: 12,
        marginHorizontal: 15,
    },
    placeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        marginVertical: 5,
        marginHorizontal: 10,
    },
    placeImageSkeleton: {
        width: 76,
        height: 76,
        backgroundColor: '#333',
        borderRadius: 4,
        marginLeft: 10,
    },
    placeTextContainer: {
        flex: 1,
        marginHorizontal: 16,
    },
    placeTitleSkeleton: {
        height: 16,
        backgroundColor: '#333',
        borderRadius: 4,
        marginBottom: 6,
        width: '80%',
    },
    placeAddressSkeleton: {
        height: 12,
        backgroundColor: '#333',
        borderRadius: 4,
        marginBottom: 6,
        width: '90%',
    },
    placeRatingSkeleton: {
        height: 12,
        backgroundColor: '#333',
        borderRadius: 4,
        width: '40%',
    },
});

export default SkeletonLoader;