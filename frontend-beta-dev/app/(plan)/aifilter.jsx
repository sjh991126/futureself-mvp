import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Dimensions, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Color } from "./planStyles";
import { router, useLocalSearchParams } from 'expo-router';
import CategoryIcon from '../../assets/icons/category.jsx';
import SoloIcon from '../../assets/icons/solo.jsx';
import CoupleIcon from '../../assets/icons/couple.jsx';
import FriendsIcon from '../../assets/icons/friends.jsx';
import FamilyIcon from '../../assets/icons/family.jsx';
import PetsIcon from '../../assets/icons/pet.jsx';
import DateIcon from '../../assets/icons/calendar_white.jsx';
import CalendarAIScreen from './CalendarAIScreen';
import { submitGeneralTripList } from '../src/api/aiGenerate.js';
import { useAppState } from "../src/AppStateHandler";
import { useSingleFlightAction } from '../src/hooks/useSingleFlightAction';
import { useAiJobStore } from '../src/state/aiJobStore';

const aifilter = () => {

    const [categoryOpen, setCategoryOpen] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedGroupSize, setSelectedGroupSize] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [selectedLocation, setSelectedLocation] = useState([]);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [contentHeight, setContentHeight] = useState(0);
    const [calendarHeight, setCalendarHeight] = useState(0);
    const screenHeight = Dimensions.get('window').height;
    const { location, categories: passedCategories, groupSize, startDate, endDate } = useLocalSearchParams();
    const setLastUsedFeature = useAppState();
    const scrollViewRef = useRef(null);
    const { run: runCreateTripList, isRunning: isCreateTripListRunning } = useSingleFlightAction('plan:aifilter-create');
    const { submit: submitJob } = useAiJobStore();

    const handleCalendarHeightChange = (height) => {
        setCalendarHeight(height);
    };

    useEffect(() => {
        setLastUsedFeature('aiTripList');
    }, [setLastUsedFeature]);

    useEffect(() => {
        console.log('Updated Calendar Height:', calendarHeight);
        setContentHeight(screenHeight + calendarHeight);
    }, [calendarHeight]);

    const categories = [
        "General",
        "Kid Friendly",
        "Museums",
        "Historical",
        "Outdoor Adventures",
        "Art & Cultural",
        "Amusement Parks"
    ];


    useEffect(() => {
        if (location) {
            setSelectedLocation(Array.isArray(location) ? location : location.split(','));
        }
        if (passedCategories) {
            setSelectedCategories(Array.isArray(passedCategories) ? passedCategories : passedCategories.split(','));
        }
        if (groupSize) {
            setSelectedGroupSize(groupSize);
        }
        if (startDate && endDate) {
            setDateRange({ start: startDate, end: endDate });
        }
    }, [location, passedCategories, groupSize, startDate, endDate]);


    const handleReset = () => {
        setSelectedCategories([]);
        setSelectedGroupSize('');
        setDateRange({ start: '', end: '' });
        setCalendarOpen(false);
        setSelectedLocation([]);
    };

    const groupSizes = [
        { name: 'Solo', icon: SoloIcon },
        { name: 'Couple', icon: CoupleIcon },
        { name: 'Friends', icon: FriendsIcon },
        { name: 'Family', icon: FamilyIcon },
        { name: 'Companion Pets', icon: PetsIcon }
    ];

    const toggleCategory = () => setCategoryOpen(!categoryOpen);

    const toggleCategorySelection = (category) => {
        setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const getSelectedCategoriesText = () => {
        if (selectedCategories.length === 0) return 'Select Category Type';
        const text = selectedCategories.join(', ');
        return text.length > 50 ? text.substring(0, 47) + '...' : text;
    };

    const CustomCheckbox = ({ isChecked }) => (
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
    );

    const toggleGroupSize = (size) => {
        setSelectedGroupSize(prevSize => prevSize === size ? '' : size);
    };

    const handleDateRangeSelect = (start, end) => {
        setDateRange({ start, end });
    };

    const toggleCalendar = () => {
        setCalendarOpen(!calendarOpen);
        
        if (!calendarOpen) {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    };

    const formatDate = (date) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(date).toLocaleDateString(undefined, options);
    };

    const getDateRangeText = () => {
        if (dateRange.start && dateRange.start == dateRange.end) {
            return `${formatDate(dateRange.start)}`;
        } else if (dateRange.start && dateRange.end) {
            return `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`;
        } else {
            return 'Add custom date range';
        }
    };

    const isCreateButtonEnabled = selectedCategories.length > 0 && selectedGroupSize && dateRange.start && dateRange.end && selectedLocation.length > 0;

    const getSelectedLocationsText = () => {
        if (selectedLocation.length === 0) return 'Select Location';
        const text = selectedLocation.join(', ');
        return text.length > 50 ? text.substring(0, 47) + '...' : text;
    };


    const handleCreate = async () => {
        await runCreateTripList(async () => {
            const tripData = {
                startDate: dateRange.start,
                endDate: dateRange.end,
                regions: selectedLocation,
                categories: selectedCategories,
                groupType: selectedGroupSize
            };

            try {
                const requestId = await submitGeneralTripList(tripData);
                submitJob(requestId, 'general', tripData);
                Alert.alert(
                    'Trip Plan Started',
                    "We're creating your AI trip plan. We'll notify you when it's ready.",
                    [
                        {
                            text: 'OK',
                            onPress: () => router.replace('/homepage'),
                        },
                    ],
                    { cancelable: false }
                );
            } catch (error) {
                console.error('Error submitting trip list:', error);
                Alert.alert(
                    'Request Failed',
                    error?.response?.data?.message
                        || "Couldn't start trip plan generation. Please try again."
                );
            }
        });
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
            <View style={styles.container}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.push('/modeselect')}>
                            <Ionicons name="chevron-back" size={26} color="white" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.mainContainer}>
                        <ScrollView
                            ref={scrollViewRef}
                            style={styles.scrollView}
                            contentContainerStyle={styles.scrollContent}
                            scrollEnabled={true}
                            onContentSizeChange={(width, height) => {
                                setContentHeight(height + (calendarOpen ? calendarHeight : 0));
                                if (calendarOpen) {
                                    scrollViewRef.current?.scrollToEnd({ animated: true });
                                }
                            }}
                        >
                            <Text style={styles.title}>Filter</Text>

                            <Text style={styles.sectionTitle}>Category</Text>
                            <TouchableOpacity style={styles.dropdown} onPress={toggleCategory}>
                                <CategoryIcon style={styles.icon} width={20} height={20} />
                                <Text style={styles.dropdownText} numberOfLines={1} ellipsizeMode='tail'>
                                    {getSelectedCategoriesText()}
                                </Text>
                                <Ionicons name={categoryOpen ? 'chevron-up' : 'chevron-down'} size={24} color="#81D8D0" />
                            </TouchableOpacity>
                            {categoryOpen && (
                                <View style={styles.categoryList}>
                                    {categories.reduce((rows, category, index) => {
                                        if (index % 2 === 0) rows.push([]);
                                        rows[rows.length - 1].push(
                                            <TouchableOpacity
                                                key={category}
                                                onPress={() => toggleCategorySelection(category)}
                                                style={styles.categoryItem}
                                            >
                                                <CustomCheckbox isChecked={selectedCategories.includes(category)} />
                                                <Text style={styles.categoryText}>{category}</Text>
                                            </TouchableOpacity>
                                        );
                                        return rows;
                                    }, []).map((row, index) => (
                                        <View key={index} style={styles.categoryRow}>
                                            {row}
                                        </View>
                                    ))}
                                </View>
                            )}

                            <Text style={styles.sectionTitle}>Group Size</Text>
                            <View style={styles.groupSizeContainer}>
                                {groupSizes.map((size, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => toggleGroupSize(size.name)}
                                        style={[
                                            styles.groupSizeButton,
                                            selectedGroupSize === size.name && styles.selectedGroupSizeButton
                                        ]}
                                    >
                                        {selectedGroupSize === size.name && (
                                            <LinearGradient
                                                colors={['#5468FF', '#81D8D0']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={styles.gradientOverlay}
                                            />
                                        )}
                                        <size.icon width={20} height={20} />
                                        <Text style={[
                                            styles.groupSizeText,
                                            selectedGroupSize === size.name && styles.selectedGroupSizeText
                                        ]}>
                                            {size.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.sectionTitle}>Date</Text>
                            <TouchableOpacity style={styles.dateButton} onPress={toggleCalendar}>
                                <DateIcon width={20} height={20} />
                                <Text style={styles.dropdownText} numberOfLines={1} ellipsizeMode='tail'>
                                    {getDateRangeText()}
                                </Text>
                                <Ionicons name={calendarOpen ? 'chevron-up' : 'chevron-down'} size={24} color="#81D8D0" />
                            </TouchableOpacity>
                            {calendarOpen && (
                                <View style={styles.calendarContainer}>
                                    <CalendarAIScreen
                                        onSelectRange={handleDateRangeSelect}
                                        startDateProp={dateRange.start}
                                        endDateProp={dateRange.end}
                                        onClose={toggleCalendar}
                                        onHeightChange={handleCalendarHeightChange}
                                    />
                                </View>
                            )}
                            <Text style={styles.sectionTitle}>Location</Text>
                            <TouchableOpacity
                                style={styles.locationButton}
                                onPress={() => router.push({
                                    pathname: '/locationfilter',
                                    params: {
                                        location: selectedLocation.length > 0 ? selectedLocation.join(',') : '',
                                        categories: selectedCategories.join(','),
                                        groupSize: selectedGroupSize,
                                        startDate: dateRange.start,
                                        endDate: dateRange.end,
                                    }
                                })}
                            >
                                <Ionicons name="location-outline" size={20} color="white" />
                                <Text style={styles.locationText}>
                                    {getSelectedLocationsText()}
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>

                        <View style={styles.bottomButtonsContainer}>
                            <TouchableOpacity 
                                style={[styles.resetButton, { flex: 2 }]} 
                                onPress={handleReset}
                            >
                                <Text style={styles.resetButtonText}>RESET</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    isCreateButtonEnabled ? styles.gradientCreateButton : styles.disabledCreateButton,
                                    { flex: 3 }
                                ]}
                                onPress={isCreateButtonEnabled ? handleCreate : null}
                                disabled={!isCreateButtonEnabled || isCreateTripListRunning}
                            >
                                {isCreateButtonEnabled ? (
                                    <LinearGradient
                                        colors={['#5468FF', '#81D8D0']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={[styles.gradientOverlay, styles.centerContent]}
                                    >
                                        <Text style={styles.createButtonText}>{isCreateTripListRunning ? 'CREATING...' : 'CREATE'}</Text>
                                    </LinearGradient>
                                ) : (
                                    <Text style={styles.disabledCreateButtonText}>CREATE</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    header: {
        flexDirection: 'row',
        paddingVertical: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: 'white',
        marginTop: 20,
    },
    sectionTitle: {
        fontSize: 16,
        color: 'white',
        fontWeight: '600',
        marginTop: 30,
    },
    dropdown: {
        paddingHorizontal: 8,
        backgroundColor: Color.buttonColor,
        height: 45,
        borderRadius: 7,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
    },
    locationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Color.buttonColor,
        paddingHorizontal: 15,
        height: 45,
        borderRadius: 7,
        marginTop: 10,
    },
    locationText: {
        marginLeft: 10,
        color: 'white',
        flex: 1,
    },
    icon: {
        marginHorizontal: 5,
        marginTop: -2
    },
    calendarContainer: {
        borderColor: 'white',
        borderWidth: 1,
        paddingHorizontal: 28,
        borderRadius: 10,
        marginTop: 10,
    },
    dropdownText: {
        color: 'white',
        flex: 1,
        marginLeft: 10,
    },
    categoryList: {
        backgroundColor: Color.buttonColor,
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 7,
        marginTop: 8,
        justifyContent: 'space-between'
    },
    categoryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '50%',
    },
    categoryText: {
        marginLeft: 16,
        color: 'white',
        fontSize: 12,
    },
    checkbox: {
        width: 14,
        height: 14,
        borderRadius: 2,
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
    groupSizeContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 5
    },
    groupSizeButton: {
        backgroundColor: Color.buttonColor,
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
        margin: 5,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
    },
    gradientOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    createButtonText: {
        textAlign: 'center',
        fontWeight: 'bold',
        color: 'white',
    },
    groupSizeText: {
        color: 'white',
        marginLeft: 10,
        fontSize: 12
    },
    dateButton: {
        backgroundColor: Color.buttonColor,
        paddingHorizontal: 15,
        height: 45,
        borderRadius: 7,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
    },

    mainContainer: {
        flex: 1,
        paddingHorizontal: 10,
    },

    scrollView: {
        flex: 1,
    },

    scrollContent: {
        paddingBottom: 20,
    },

    bottomButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingBottom: 24,
        backgroundColor: 'black',
    },

    resetButton: {
        backgroundColor: 'black',
        padding: 15,
        borderRadius: 7,
        borderWidth: 1,
        borderColor: 'white',
        flex: 1,
        marginRight: 10,
    },
    resetButtonText: {
        textAlign: 'center',
        fontWeight: 'bold',
        color: 'white'
    },
    gradientCreateButton: {
        borderRadius: 7,
        flex: 1,
        marginLeft: 10,
        overflow: 'hidden',
    },
    disabledCreateButton: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 7,
        flex: 1,
        marginLeft: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledCreateButtonText: {
        textAlign: 'center',
        fontWeight: 'bold',
        color: 'black',
    },
});

export default aifilter;
