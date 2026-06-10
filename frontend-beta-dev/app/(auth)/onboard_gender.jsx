import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    TextInput,
    FlatList,
    Modal,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { onboardGender } from '../src/api/onboard_api';
import { LinearGradient } from 'expo-linear-gradient';

const GENDER_OPTIONS = [
    { id: 'woman', label: 'Woman' },
    { id: 'man', label: 'Man' },
    { id: 'more', label: 'More', hasArrow: true },
    { id: 'prefer_not', label: 'Prefer not to say' },
];

const MORE_GENDER_OPTIONS = [
    'Bigender',
    'Brothaboy',
    'Brotherboy',
    'Non-binary',
    'Genderfluid',
    'Genderqueer',
    'Two-Spirit',
    'Agender',
    'Cisgender',
    'Gender nonconforming',
    'Questioning',
];

const onboard_gender = () => {
    const router = useRouter();
    const [selectedGender, setSelectedGender] = useState(null);
    const [showMoreModal, setShowMoreModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredOptions, setFilteredOptions] = useState(MORE_GENDER_OPTIONS);
    const [isLoading, setIsLoading] = useState(false);

    const handleGenderSelect = (genderId) => {
        if (genderId === 'more') {
            setShowMoreModal(true);
        } else {
            setSelectedGender(genderId);
        }
    };

    const handleMoreGenderSelect = (gender) => {
        setSelectedGender(gender);
        setShowMoreModal(false);
        setSearchQuery('');
    };

    const handleSearch = (text) => {
        setSearchQuery(text);
        if (text.trim() === '') {
            setFilteredOptions(MORE_GENDER_OPTIONS);
        } else {
            const filtered = MORE_GENDER_OPTIONS.filter((option) =>
                option.toLowerCase().includes(text.toLowerCase())
            );
            setFilteredOptions(filtered);
        }
    };

    const handleNext = async () => {
        if (!selectedGender || isLoading) return;

        setIsLoading(true);
        try {
            // 성별 정보 저장
            let genderValue = selectedGender;

            // id를 실제 값으로 변환
            if (selectedGender === 'woman') genderValue = 'Woman';
            else if (selectedGender === 'man') genderValue = 'Man';
            else if (selectedGender === 'prefer_not') genderValue = 'Prefer not to say';
            // More 옵션에서 선택한 경우는 그대로 사용

            await onboardGender(genderValue);

            // 다음 온보딩 단계로 이동
            router.push('/onboard_age');
        } catch (error) {
            console.error('Error saving gender:', error);
            Alert.alert('Error', 'Failed to save gender. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const getDisplayLabel = () => {
        if (!selectedGender) return null;

        const mainOption = GENDER_OPTIONS.find(opt => opt.id === selectedGender);
        if (mainOption) return mainOption.label;

        return selectedGender; // More 옵션에서 선택한 경우
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="chevron-back" size={28} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Title */}
                <Text style={styles.title}>What's your gender?</Text>

                {/* Options */}
                <View style={styles.optionsContainer}>
                    {GENDER_OPTIONS.map((option) => {
                        const isSelected = selectedGender === option.id ||
                            (option.id === 'more' && selectedGender && !GENDER_OPTIONS.find(opt => opt.id === selectedGender));

                        return (
                            <TouchableOpacity
                                key={option.id}
                                style={styles.optionButton}
                                onPress={() => handleGenderSelect(option.id)}
                                activeOpacity={0.7}
                            >
                                {isSelected ? (
                                    <LinearGradient
                                        colors={['#5468FF', '#81D8D0']}
                                        style={styles.selectedGradient}>
                                        <View style={styles.textWrapper}>
                                            <Text style={styles.optionTextSelected}>
                                                {option.id === 'more' && selectedGender && !GENDER_OPTIONS.find(opt => opt.id === selectedGender)
                                                    ? selectedGender  // More에서 선택한 값 표시
                                                    : option.label    // 기본 라벨
                                                }
                                            </Text>
                                        </View>
                                        {option.hasArrow && (
                                            <Ionicons
                                                name="chevron-forward"
                                                size={20}
                                                color="#fff"
                                                style={styles.arrowIcon}
                                            />
                                        )}
                                    </LinearGradient>
                                ) : (
                                    <View style={styles.optionInner}>
                                        <View style={styles.textWrapper}>
                                            <Text style={styles.optionText}>{option.label}</Text>
                                        </View>
                                        {option.hasArrow && (
                                            <Ionicons
                                                name="chevron-forward"
                                                size={20}
                                                color="#fff"
                                                style={styles.arrowIcon}
                                            />
                                        )}
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Next Button */}
                <View style={styles.bottomContainer}>
                    {selectedGender && !isLoading ? (
                        <TouchableOpacity
                            style={styles.nextButton}
                            onPress={handleNext}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={['#5468FF', '#81D8D0']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.nextGradient}
                            >
                                <Text style={styles.nextButtonText}>
                                    {isLoading ? 'Submitting...' : 'NEXT'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <View style={[styles.nextButton, styles.nextButtonDisabled]}>
                            <Text style={styles.nextButtonTextDisabled}>NEXT</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* More Gender Options Modal */}
            <Modal
                visible={showMoreModal}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <SafeAreaView style={styles.modalContainer}>
                    {/* Modal Header */}
                    <View style={styles.modalHeader}>
                        <TouchableOpacity
                            onPress={() => {
                                setShowMoreModal(false);
                                setSearchQuery('');
                            }}
                        >
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Gender</Text>
                        <TouchableOpacity
                            onPress={() => {
                                if (searchQuery.trim()) {
                                    handleMoreGenderSelect(searchQuery);
                                }
                            }}
                        >
                            <Text
                                style={[
                                    styles.doneText,
                                    !searchQuery.trim() && styles.doneTextDisabled,
                                ]}
                            >
                                DONE
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Search Input */}
                    <View style={styles.searchContainer}>
                        <Ionicons
                            name="search"
                            size={20}
                            color="#666"
                            style={styles.searchIcon}
                        />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Start typing your gender"
                            placeholderTextColor="#666"
                            value={searchQuery}
                            onChangeText={handleSearch}
                            autoFocus
                        />
                    </View>

                    {/* Gender List */}
                    <FlatList
                        data={filteredOptions}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.genderItem}
                                onPress={() => handleMoreGenderSelect(item)}
                            >
                                <Text style={styles.genderItemText}>{item}</Text>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No results found</Text>
                            </View>
                        }
                    />
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    content: {
        flex: 1,
        paddingHorizontal: 10,
    },
    header: {
        paddingTop: 8,
        marginBottom: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 32,
    },
    optionsContainer: {
        gap: 20,
    },
    optionButton: {
        height: 40,
        borderRadius: 28,
        backgroundColor: '#25282D',
        overflow: 'hidden',
    },
    selectedGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    optionInner: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2a2a2a',
        paddingHorizontal: 24,
    },
    textWrapper: {
        flex: 1,
        alignItems: 'center',
    },
    arrowIcon: {
        position: 'absolute',
        right: 24,
    },
    optionText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#fff',
    },
    optionTextSelected: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 20,
        left: 12,
        right: 12,
    },
    nextButton: {
        height: 40,
        borderRadius: 10,
        overflow: 'hidden',
    },
    nextGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nextButtonDisabled: {
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    nextButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 1,
    },
    nextButtonTextDisabled: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
        letterSpacing: 1,
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2a2a2a',
    },
    cancelText: {
        fontSize: 16,
        color: '#81D8D0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    doneText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#81D8D0',
    },
    doneTextDisabled: {
        opacity: 0.3,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        marginHorizontal: 20,
        marginVertical: 16,
        paddingHorizontal: 12,
        height: 48,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#000',
    },
    genderItem: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2a2a2a',
    },
    genderItemText: {
        fontSize: 14,
        color: '#fff',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
    },
});

export default onboard_gender;