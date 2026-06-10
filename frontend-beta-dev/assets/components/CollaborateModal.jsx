import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, TextInput, FlatList, Keyboard, KeyboardAvoidingView, TouchableOpacity, Modal, Image, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchUsers } from '../../app/src/api/user';
import { sendCollaborateRequest } from '../../app/src/api/collaborate';
import { LinearGradient } from 'expo-linear-gradient';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoadingSpinner from '../../app/LoadingSpinner';

const CustomHandle = () => (
    <View style={styles.handleContainer}>
        <View style={styles.handle} />
    </View>
);

const CustomCheckbox = ({ isChecked, onPress }) => (
    <TouchableOpacity onPress={onPress}>
        <LinearGradient
            colors={isChecked ? ['#5468FF', '#81D8D0'] : ['#25282D', '#25282D']}
            style={[
                styles.checkbox,
                isChecked ? styles.checkedCheckbox : styles.uncheckedCheckbox
            ]}
        >
            {isChecked && (
                <View style={styles.checkmarkContainer}>
                    <Ionicons name="checkmark" size={12} color="white" />
                </View>
            )}
        </LinearGradient>
    </TouchableOpacity>
);

const CollaborateModal = ({ isVisible, onClose, tripListId, onCollaboratorAdded, creatorId, existingCollaborators }) => {
    console.log('existingCollaborators', existingCollaborators);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [recentSearches, setRecentSearches] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchInputRef = useRef(null);
    const bottomSheetRef = useRef(null);
    const [isLoading, setIsLoading] = useState(false);

    const snapPoints = useMemo(() => ['50%', '90%'], []);
    const flatListKey = useMemo(() => isSearching ? 'searching-list' : 'default-list', [isSearching]);

    useEffect(() => {
        const loadRecentSearches = async () => {
            try {
                const storedSearches = await AsyncStorage.getItem('recentSearches');
                if (storedSearches) {
                    const parsedSearches = JSON.parse(storedSearches);
                    console.log('Raw recent searches:', parsedSearches);
                    
                    // Filter to include only items that have userId (user searches)
                    const userSearches = parsedSearches.filter(item => 
                        item && 
                        item.userId !== undefined &&
                        item.userName // Ensure it has a userName too
                    );
                    
                    console.log('Filtered user searches:', userSearches);
                    setRecentSearches(userSearches);
                }
            } catch (error) {
                console.error('Error loading recent searches:', error);
                // Reset recent searches on error
                setRecentSearches([]);
            }
        };
        loadRecentSearches();
    }, []);

    useEffect(() => {
        const saveRecentSearches = async () => {
            try {
                await AsyncStorage.setItem('recentSearches', JSON.stringify(recentSearches));
            } catch (error) {
                console.error('Error saving recent searches:', error);
            }
        };
        if (recentSearches.length > 0) {
            saveRecentSearches();
        }
    }, [recentSearches]);

    useEffect(() => {
        if (searchQuery) {
            const fetchUsers = async () => {
                try {
                    const users = await searchUsers(searchQuery);
                    const normalizedUsers = (Array.isArray(users) ? users : []).map((user) => ({
                        ...user,
                        userId: user.userId ?? user.id,
                        name: user.name ?? user.userName ?? user.username ?? '',
                        userName: user.userName ?? user.username ?? '',
                    }));

                    const validUsers = normalizedUsers.filter(user =>
                        user.userId &&
                        user.name &&
                        user.userId !== creatorId &&
                        (!existingCollaborators || !existingCollaborators.some(collaborator => collaborator.collaboratorId === user.userId))
                    );
                    setSearchResults(validUsers);
                } catch (error) {
                    console.error('Error searching users:', error);
                    setSearchResults([]);
                }
            };
            fetchUsers();
        } else {
            setSearchResults([]);
        }
    }, [searchQuery, creatorId, existingCollaborators]);

    const handleSelectUser = (user) => {
        setSelectedUsers(prevUsers => {
            const alreadySelected = prevUsers.some(selected => selected.userId === user.userId);
            if (alreadySelected) {
                return prevUsers.filter(selected => selected.userId !== user.userId);
            } else {
                return [...prevUsers, user];
            }
        });
    };

    const handleCollaborate = async () => {
        setIsLoading(true);
        if (selectedUsers.length === 0) return;

        try {
            const collaborators = selectedUsers.map(user => ({
                collaboratorId: user.userId,
                collaboratorName: user.name,
                collaboratorImageUrl: user.imageUrl || null,
            }));

            const response = await sendCollaborateRequest({ tripListId, collaboratorIds: collaborators.map(collab => collab.collaboratorId) });

            if (response) {
                const updatedRecentSearches = [...new Set([...selectedUsers, ...recentSearches])].slice(0, 9);
                setRecentSearches(updatedRecentSearches);

                try {
                    await AsyncStorage.setItem('recentSearches', JSON.stringify(updatedRecentSearches));
                } catch (error) {
                    console.error('Error saving recent searches to AsyncStorage:', error);
                }

                setSelectedUsers([]);
            }
            setSearchQuery('');
            setIsSearching(false);
            onClose();
        } catch (error) {
            console.error('Error adding collaborators:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenSearch = () => {
        setIsSearching(true);
        bottomSheetRef.current?.expand();
        setSearchResults([]);
    };

    const handleCancelSearch = () => {
        setIsSearching(false);
        setSearchQuery('');
        Keyboard.dismiss();
        bottomSheetRef.current?.snapToIndex(1);
    };

    const renderUserItem = ({ item }) => {
        const isSelected = selectedUsers.some(selected => selected.userId === item.userId);

        return isSearching ? (
            <View style={styles.searchUserItem}>
                {item.imageUrl ? (
                    <Image
                        style={styles.searchUserImage}
                        resizeMode="cover"
                        source={{ uri: item.imageUrl }}
                        onError={(e) => console.log('Failed to load image', e.nativeEvent.error)}
                    />
                ) : (
                    <View style={styles.iconContainer}>
                        <Ionicons name="person" size={24} color="#888" />
                    </View>
                )}
                <View style={styles.userDetails}>
                    <Text style={styles.searchUserName}>{item.name}</Text>
                    <Text style={styles.searchUserUsername}>{item.userName}</Text>
                </View>
                <CustomCheckbox
                    isChecked={isSelected}
                    onPress={() => handleSelectUser(item)}
                />
            </View>
        ) : (
            <TouchableOpacity style={styles.userItem} onPress={() => handleSelectUser(item)}>
                <View style={{ position: 'relative' }}>
                    {item.imageUrl ? (
                        <Image
                            style={styles.userImage}
                            resizeMode="cover"
                            source={{ uri: item.imageUrl }}
                            onError={(e) => console.log('Failed to load image', e.nativeEvent.error)}
                        />
                    ) : (
                        <View style={styles.userIconImage}>
                            <Ionicons name="person" size={24} color="#888" />
                        </View>
                    )}
                    <View style={styles.checkboxContainer}>
                        <CustomCheckbox
                            isChecked={isSelected}
                            onPress={() => handleSelectUser(item)}
                        />
                    </View>
                </View>
                <Text style={styles.userName}>{item.name}</Text>
            </TouchableOpacity>
        );
    };

    const renderSelectedUser = (user) => (
        <View key={user.userId} style={styles.selectedUserItem}>
            {user.imageUrl ? (
                <Image
                    style={styles.selectedUserImage}
                    resizeMode="cover"
                    source={{ uri: user.imageUrl }}
                    onError={(e) => console.log('Failed to load image', e.nativeEvent.error)}
                />
            ) : (
                <View style={styles.selectedUserIcon}>
                    <Ionicons name="person" size={24} color="#888" />
                </View>
            )}
            <Text style={styles.selectedUserName}>{user.name}</Text>
            <TouchableOpacity onPress={() => handleSelectUser(user)}>
                <Ionicons name="close-circle" size={20} color="#fff" />
            </TouchableOpacity>
        </View>
    );

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Modal
                transparent
                visible={isVisible}
                onRequestClose={() => {
                    onClose();
                    setSearchQuery('');
                    setIsSearching(false);
                }}
            >
                <View style={styles.modalContainer}>
                    {isLoading ? (
                        <View style={styles.loadingOverlay}>
                            <LoadingSpinner />
                        </View>
                    ) : (
                        <>
                            <TouchableWithoutFeedback onPress={() => {
                                onClose();
                                setSearchQuery('');
                                setIsSearching(false);
                            }}>
                                <View style={styles.modalOverlay} />
                            </TouchableWithoutFeedback>
                            <BottomSheet
                                ref={bottomSheetRef}
                                index={1}
                                snapPoints={snapPoints}
                                enablePanDownToClose={true}
                                onClose={() => {
                                    onClose();
                                    setSearchQuery('');
                                    setIsSearching(false);
                                }}
                                handleComponent={CustomHandle}
                                backgroundStyle={{ backgroundColor: '#161616' }}
                            >
                                <BottomSheetView style={styles.bottomSheetContent}>
                                    <View style={styles.header}>
                                        <View style={styles.searchContainer}>
                                            <Ionicons name="search" size={20} color="black" style={styles.searchIcon} />
                                            <TextInput
                                                ref={searchInputRef}
                                                style={styles.searchInput}
                                                placeholder="Search"
                                                placeholderTextColor="#ABB7C2"
                                                value={searchQuery}
                                                onChangeText={setSearchQuery}
                                                onFocus={handleOpenSearch}
                                            />
                                        </View>
                                        {isSearching && (
                                            <TouchableOpacity onPress={handleCancelSearch}>
                                                <Text style={styles.cancelButton}>CANCEL</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    {!isSearching && <Text style={styles.title}>Recently collaborated users</Text>}
                                    <FlatList
                                        key={flatListKey}
                                        data={isSearching && searchQuery ? searchResults : recentSearches}
                                        keyExtractor={(item, index) => item?.userId?.toString() || `item-${index}`}
                                        renderItem={renderUserItem}
                                        numColumns={isSearching ? 1 : 3}
                                        columnWrapperStyle={!isSearching ? styles.userRow : null}
                                        contentContainerStyle={styles.flatListContent}
                                    />
                                </BottomSheetView>
                            </BottomSheet>
                            <View style={styles.bottomContainer}>
                                {selectedUsers.length > 0 && (
                                    <View style={styles.selectedUsersContainer}>
                                        <FlatList
                                            data={selectedUsers}
                                            keyExtractor={(item, index) => item?.userId?.toString() || `item-${index}`}
                                            renderItem={({ item }) => renderSelectedUser(item)}
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                        />
                                    </View>
                                )}
                                <View style={styles.sendButtonContainer}>
                                    <TouchableOpacity onPress={handleCollaborate}>
                                        <LinearGradient
                                            style={styles.collaborateButton}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            colors={['#5468ff', '#81d8d0']}
                                        >
                                            <Text style={styles.collaborateButtonText}>SEND</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </>
                    )}
                </View>
            </Modal>
        </GestureHandlerRootView>
    );
};
const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    contentContainer: {
        flex: 1,
    },
    bottomSheetContainer: {
        flex: 1,
    },
    bottomSheetContent: {
        flex: 1,
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 10,
        marginHorizontal: 10,
    },
    searchIcon: {
        marginHorizontal: 5,
        color: 'black'
    },
    searchUserItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 15,
        backgroundColor: '#161616',
        borderRadius: 10,
        marginBottom: 10,
    },
    searchUserImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 15,
    },
    userDetails: {
        flex: 1,
        justifyContent: 'center',
    },
    searchUserName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    searchUserUsername: {
        fontSize: 14,
        color: '#ABB7C2',
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    uncheckedCheckbox: {
        borderWidth: 1,
        borderColor: 'white',
    },
    checkedCheckbox: {
        borderWidth: 0,
    },
    checkmarkContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        padding: 10,
        color: 'black',
    },
    cancelButton: {
        color: '#FFF',
        fontSize: 14,
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#161616',
    },
    flatListContent: {
        paddingBottom: 20,
        paddingHorizontal: '3%',
    },
    selectedUsersContainer: {
        width: '100%',
        backgroundColor: '#161616',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    sendButtonContainer: {
        width: '100%',
        padding: 20,
        backgroundColor: '#161616',
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    userItem: {
        width: '30%',
        alignItems: 'center',
        marginBottom: 20,
        marginRight: '3%',
        position: 'relative',
    },
    title: {
        fontSize: 14,
        color: '#ABB7C2',
        marginBottom: 12,
        marginHorizontal: 10,
    },
    checkboxContainer: {
        position: 'absolute',
        right: -5,
        bottom: 5,
    },
    userRow: {
        justifyContent: 'flex-start',
        width: '100%',
    },
    userImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginBottom: 5,
    },
    userIconImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginBottom: 5,
        backgroundColor: "#ccc",
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 15,
        backgroundColor: "#ccc",
        justifyContent: 'center',
        alignItems: 'center',
    },
    userName: {
        fontSize: 12,
        color: 'white',
        textAlign: 'center',
    },
    collaborateButton: {
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    collaborateButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    handle: {
        width: 80,
        height: 6,
        backgroundColor: '#fff',
        borderRadius: 3,
    },
    selectedUserImage: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 5,
    },
    selectedUserIcon: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 5,
    },
    selectedUserItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#333',
        borderRadius: 20,
        padding: 5,
        marginRight: 10,
        marginBottom: 10,
    },
    selectedUserName: {
        color: 'white',
        fontSize: 12,
        marginRight: 5,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 1000,
    },
});

export default CollaborateModal;
