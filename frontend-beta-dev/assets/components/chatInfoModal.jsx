import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    TouchableWithoutFeedback,
    ScrollView,
    SafeAreaView,
    Animated
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

const ChatInfoModal = ({ visible, onClose, chatSummary, initialTab }) => {
    const [activeTab, setActiveTab] = useState(initialTab || 'Photos/Videos');
    const slideAnim = useRef(new Animated.Value(500)).current;

    useEffect(() => {
        // Update activeTab when initialTab changes
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                bounciness: 0,
            }).start();
        } else {
            Animated.spring(slideAnim, {
                toValue: 500,
                useNativeDriver: true,
                bounciness: 0,
            }).start();
        }
    }, [visible]);

    const handleClose = () => {
        Animated.spring(slideAnim, {
            toValue: 500,
            useNativeDriver: true,
            bounciness: 0,
        }).start(onClose);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'Photos/Videos':
                return (
                    <ScrollView>
                        <View style={styles.dateSection}>
                            <Text style={styles.dateSectionText}>2025.2.5</Text>
                            <View style={styles.imageGrid}>
                                {chatSummary?.sharedMedia?.slice(0, 6).map((media, index) => (
                                    <ExpoImage
                                        key={index}
                                        source={{ uri: media.url }}
                                        style={styles.gridImage}
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                        transition={150}
                                    />
                                ))}
                            </View>
                        </View>
                    </ScrollView>
                );
            case 'Shared TripLists':
                return (
                    <ScrollView>
                        {chatSummary?.sharedTrips?.map((trip, index) => (
                            <TouchableOpacity key={index} style={styles.tripListItem}>
                                <ExpoImage
                                    source={{ uri: trip.imageUrl }}
                                    style={styles.tripListImage}
                                    contentFit="cover"
                                    cachePolicy="memory-disk"
                                    transition={150}
                                />
                                <View style={styles.tripListDetails}>
                                    <Text style={styles.tripListName}>{trip.name}</Text>
                                    <Text style={styles.tripListSubtitle}>
                                        Triplist · {trip.senderId === 45 ? 'trippy' : 'amy.lee'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                );
            case 'Shared Places':
                return (
                    <View style={styles.sharedPlacesContainer}>
                        {chatSummary?.sharedPlaces?.map((place, index) => (
                            <TouchableOpacity key={index} style={styles.sharedPlaceItem}>
                                <ExpoImage
                                    source={{ uri: place.imageUrl }}
                                    style={styles.sharedPlaceImage}
                                    contentFit="cover"
                                    cachePolicy="memory-disk"
                                    transition={150}
                                />
                                <View style={styles.sharedPlaceDetails}>
                                    <Text style={styles.sharedPlaceName}>{place.name}</Text>
                                    <Text style={styles.sharedPlaceSubtitle}>{place.address}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={handleClose}
        >
            <TouchableWithoutFeedback onPress={handleClose}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
                        <Animated.View
                            style={[
                                styles.modalContent,
                                { transform: [{ translateX: slideAnim }] }
                            ]}
                        >
                            <SafeAreaView style={styles.safeArea}>

                                {/* Header */}
                                <View style={styles.header}>
                                    <TouchableOpacity onPress={handleClose}>
                                        <Ionicons name="close" size={24} color="white" />
                                    </TouchableOpacity>
                                    <Text style={styles.headerTitle}>12/4 after work</Text>
                                    <TouchableOpacity>
                                        {/* <Ionicons name="checkmark" size={24} color="white" /> */}
                                    </TouchableOpacity>
                                </View>

                                {/* Tabs */}
                                <View style={styles.tabContainer}>
                                    {['Photos/Videos', 'Shared TripLists', 'Shared Places'].map((tab) => (
                                        <TouchableOpacity
                                            key={tab}
                                            style={[
                                                styles.tab,
                                                activeTab === tab && styles.activeTab
                                            ]}
                                            onPress={() => setActiveTab(tab)}
                                        >
                                            <Text style={[
                                                styles.tabText,
                                                activeTab === tab && styles.activeTabText
                                            ]}>
                                                {tab}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Content */}
                                {renderContent()}
                            </SafeAreaView>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = {
    safeArea: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        flex: 1,
        // right: 0,
        // bottom: 0,
        backgroundColor: 'black',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,

    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#1a1a1a',
    },
    headerTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    tab: {
        paddingVertical: 10,
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: 'white',
    },
    tabText: {
        color: '#888',
        fontWeight: 'bold',
    },
    activeTabText: {
        color: 'white',
    },
    dateSection: {
        padding: 10,
    },
    dateSectionText: {
        color: 'white',
        fontSize: 14,
        marginBottom: 10,
    },
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    gridImage: {
        width: '33.33%',
        aspectRatio: 1,
        padding: 2,
    },
    tripListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    tripListImage: {
        width: 60,
        height: 60,
        borderRadius: 10,
        marginRight: 10,
    },
    tripListName: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    tripListSubtitle: {
        color: '#888',
        fontSize: 14,
    },
    sharedPlacesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        padding: 10,
    },
    sharedPlaceItem: {
        width: '48%',
        marginBottom: 10,
    },
    sharedPlaceImage: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 10,
    },
    sharedPlaceName: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 5,
    },
    sharedPlaceSubtitle: {
        color: '#888',
        fontSize: 14,
    },
};

export default ChatInfoModal;