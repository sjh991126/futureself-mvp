import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Modal,
    TouchableWithoutFeedback,
    Animated,
    SafeAreaView,
    StyleSheet
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ChatInfoModal from './chatInfoModal';

const ChatArchives = ({ visible, onClose, chatSummary }) => {
    const router = useRouter();
    const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
    const [selectedTab, setSelectedTab] = useState('Photos/Videos');
    const slideAnim = useRef(new Animated.Value(500)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [modalVisible, setModalVisible] = useState(visible);

    useEffect(() => {
        if (visible) {
            setModalVisible(true);
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    bounciness: 0,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 500,
                    useNativeDriver: true,
                    bounciness: 0,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                })
            ]).start(() => {
                setModalVisible(false);
                onClose();
            });
        }
    }, [visible]);

    const handleClose = () => {
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 500,
                useNativeDriver: true,
                bounciness: 0,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            })
        ]).start(() => {
            setModalVisible(false);
            onClose();
        });
    };

    const handleSectionPress = (section) => {
        setSelectedTab(section);
        setIsDetailModalVisible(true);
    };

    const navigateToUserProfile = (userId) => {
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 500,
                useNativeDriver: true,
                bounciness: 0,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            })
        ]).start(() => {
            setModalVisible(false);
            onClose();

            setTimeout(() => {
                router.push({
                    pathname: '/publicprofile',
                    params: { userId: userId }
                });
            }, 100);
        });
    };

    return (
        <Modal
            visible={modalVisible}
            transparent={true}
            animationType="none"
            onRequestClose={handleClose}
        >
            <TouchableWithoutFeedback onPress={handleClose}>
                <View style={styles.modalOverlayTouch}>
                    <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
                        <Animated.View
                            style={[
                                styles.modalContent,
                                { transform: [{ translateX: slideAnim }] }
                            ]}
                        >
                            <SafeAreaView style={styles.safeArea}>
                                <View style={styles.header}>
                                    <TouchableOpacity onPress={handleClose}>
                                        <Ionicons name="chevron-back" size={24} color="white" />
                                    </TouchableOpacity>
                                    <Text style={styles.headerTitle}>
                                        Chatroom Archives
                                    </Text>
                                    <View style={{ width: 24 }} />
                                </View>
                                <ScrollView style={styles.mainContentScroll} showsVerticalScrollIndicator={false}>

                                    {/* Photos Section */}
                                    <TouchableOpacity
                                        style={styles.section}
                                        onPress={() => handleSectionPress('Photos/Videos')}
                                    >
                                        <View style={styles.sectionTitleContainer}>
                                            <Ionicons name="images-outline" size={20} color="white" />
                                            <Text style={styles.sectionTitle}>Photos/Videos</Text>
                                            <Ionicons name="chevron-forward" size={20} color="white" />
                                        </View>
                                        <ScrollView
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            style={styles.mediaPreview}
                                        >
                                            {chatSummary?.sharedMedia?.slice(0, 4).map((media, index) => (
                                                <ExpoImage
                                                    key={index}
                                                    source={{ uri: media.url }}
                                                    style={styles.mediaPreviewItem}
                                                    contentFit="cover"
                                                    cachePolicy="memory-disk"
                                                />
                                            ))}
                                        </ScrollView>
                                    </TouchableOpacity>

                                    {/* Shared TripLists Section */}
                                    <TouchableOpacity
                                        style={styles.section}
                                        onPress={() => handleSectionPress('Shared TripLists')}
                                    >
                                        <View style={styles.sectionTitleContainer}>
                                            <Ionicons name="list" size={20} color="white" />
                                            <Text style={styles.sectionTitle}>Shared TripLists</Text>
                                            <Ionicons name="chevron-forward" size={20} color="white" />
                                        </View>
                                        <ScrollView
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            style={styles.tripListPreview}
                                        >
                                            {chatSummary?.sharedTrips?.slice(0, 2).map((trip, index) => (
                                                <View key={index} style={styles.tripListItem}>
                                                    <ExpoImage
                                                        source={{ uri: trip.imageUrl }}
                                                        style={styles.tripListImage}
                                                        contentFit="cover"
                                                        cachePolicy="memory-disk"
                                                        transition={150}
                                                    />
                                                    <Text style={styles.tripListName}>{trip.name}</Text>
                                                    {/* <Text style={styles.tripListAuthor}>Kiana Lee</Text> */}
                                                </View>
                                            ))}
                                        </ScrollView>
                                    </TouchableOpacity>

                                    {/* Shared Places Section */}
                                    <TouchableOpacity
                                        style={styles.section}
                                        onPress={() => handleSectionPress('Shared Places')}
                                    >
                                        <View style={styles.sectionTitleContainer}>
                                            <Ionicons name="location-outline" size={20} color="white" />
                                            <Text style={styles.sectionTitle}>Shared Places</Text>
                                            <Ionicons name="chevron-forward" size={20} color="white" />
                                        </View>
                                        <ScrollView
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            style={styles.placesPreview}
                                        >
                                            {chatSummary?.sharedPlaces?.slice(0, 2).map((place, index) => (
                                                <View key={index} style={styles.placeItem}>
                                                    <ExpoImage
                                                        source={{ uri: place.imageUrl }}
                                                        style={styles.placeImage}
                                                        contentFit="cover"
                                                        cachePolicy="memory-disk"
                                                        transition={150}
                                                    />
                                                    <View style={styles.placeDetails}>
                                                        <Text style={styles.placeName}>{place.name}</Text>
                                                        <View style={styles.placeRating}>
                                                            <Ionicons name="star" size={12} color="#FFD700" />
                                                            <Text style={styles.ratingText}>{place.rating || ' '}</Text>
                                                        </View>
                                                    </View>
                                                </View>
                                            ))}
                                        </ScrollView>
                                    </TouchableOpacity>

                                    {/* Chat Members Section */}
                                    <View style={styles.membersSection}>
                                        <Text style={styles.membersSectionTitle}>Chat members</Text>
                                        <View style={styles.membersList}>
                                            {chatSummary?.members?.length ? (
                                                chatSummary.members.map((member, index) => (
                                                    <TouchableOpacity
                                                        key={index}
                                                        style={styles.memberItem}
                                                        onPress={() => navigateToUserProfile(member.userId)}
                                                    >
                                                        {member.imageUrl ? (
                                                            <ExpoImage
                                                                source={{ uri: member.imageUrl }}
                                                                style={styles.memberAvatar}
                                                                contentFit="cover"
                                                                cachePolicy="memory-disk"
                                                            />
                                                        ) : (
                                                            <View style={styles.iconContainer}>
                                                                <Ionicons name="person" size={30} color="#888" />
                                                            </View>
                                                        )}
                                                        <View style={styles.memberInfo}>
                                                            <Text style={styles.memberName}>{member.name}</Text>
                                                            <Text style={styles.memberUsername}>{member.userName}</Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                ))
                                            ) : (
                                                <View style={styles.emptyMembersState}>
                                                    <Text style={styles.emptyMembersText}>
                                                        No chat members available.
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </ScrollView>
                            </SafeAreaView >
                        </Animated.View >
                    </TouchableWithoutFeedback >
                </View >
            </TouchableWithoutFeedback >
            {/* Detailed Modal */}
            < ChatInfoModal
                visible={isDetailModalVisible}
                onClose={() => setIsDetailModalVisible(false)}
                chatSummary={chatSummary}
                initialTab={selectedTab}
            />
        </Modal >
    );
};

const styles = StyleSheet.create({
    modalOverlayTouch: {
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: '80%',
        paddingVertical: 20,
        backgroundColor: '#1a1a1a',
        borderTopLeftRadius: 20,
        borderBottomLeftRadius: 20,
    },
    safeArea: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    },
    mainContentScroll: {
        flex: 1,
    },
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    headerTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    section: {
        marginVertical: 10,
    },
    sectionTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        marginBottom: 10,
    },
    sectionTitle: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        flex: 1,
        marginLeft: 10,
    },
    mediaPreview: {
        paddingHorizontal: 15,
    },
    mediaPreviewItem: {
        width: 100,
        height: 100,
        borderRadius: 10,
        marginRight: 10,
    },
    tripListPreview: {
        paddingHorizontal: 15,
    },
    tripListItem: {
        marginRight: 15,
        width: 150,
    },
    tripListImage: {
        width: '100%',
        height: 150,
        borderRadius: 10,
    },
    tripListName: {
        color: 'white',
        marginTop: 5,
        fontSize: 12,
        fontWeight: 'bold',
    },
    tripListAuthor: {
        color: '#888',
        fontSize: 12,
    },
    placesPreview: {
        paddingHorizontal: 15,
    },
    placeItem: {
        marginRight: 15,
        width: 150,
    },
    placeImage: {
        width: '100%',
        height: 150,
        borderRadius: 10,
    },
    placeDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 5,
        flexWrap: 'nowrap',
    },
    placeName: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    placeRating: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingText: {
        color: 'white',
        marginLeft: 5,
        fontSize: 12,
    },
    membersSection: {
        marginTop: 15,
        paddingHorizontal: 15,
    },
    membersSectionTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    membersList: {
        backgroundColor: '#1C1C1E',
        borderRadius: 10,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    memberAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 10,
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#ccc",
        justifyContent: 'center',
        alignItems: 'center',
        overflow: "hidden",
        marginRight: 10,
    },
    memberName: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    memberInfo: {
        flex: 1,
    },
    memberUsername: {
        color: '#888',
        fontSize: 14,
    },
    emptyMembersState: {
        paddingHorizontal: 16,
        paddingVertical: 18,
    },
    emptyMembersText: {
        color: '#888',
        fontSize: 14,
    },
});

export default ChatArchives;
