import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ConfirmationModal from '../../assets/components/ConfirmationModal';
import { useSingleFlightAction } from '../src/hooks/useSingleFlightAction';

const CalendarAIScreen = ({ onSelectRange, onClose, startDateProp, endDateProp, onHeightChange }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [startDate, setStartDate] = useState(startDateProp);
    const [endDate, setEndDate] = useState(endDateProp);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalTitle, setModalTitle] = useState('');
    const { run: runSaveRange, isRunning: isSavingRange } = useSingleFlightAction('plan:calendar-ai-save');

    useEffect(() => {
        setStartDate(startDateProp);
        setEndDate(endDateProp);
    }, [startDateProp, endDateProp]);

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const adjustedFirstDayOfMonth = firstDayOfMonth === 0 ? 7 : firstDayOfMonth;

    const formatDateToYMD = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleLayoutChange = (event) => {
        const { height } = event.nativeEvent.layout;
        if (onHeightChange) {
            onHeightChange(height);
        }
    };

    const onDayPress = (day) => {
        const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const formattedDate = formatDateToYMD(selectedDate);

        if (startDate && startDate == endDate) {
            const startDateObj = new Date(startDate);
            const dayDifference = (selectedDate - startDateObj) / (1000 * 60 * 60 * 24);

            if (dayDifference > 7) {
                setModalTitle('Date Range Exceeded');
                setModalMessage('You cannot select a date range\nlonger than 7 days.');
                setModalVisible(true);
            } else if (selectedDate >= startDateObj) {
                setEndDate(formattedDate);
                onSelectRange(startDate, formattedDate);
            } else {
                setModalTitle('Invalid Date Range');
                setModalMessage('End date cannot be before start date.');
                setModalVisible(true);
            }
        } else {
            setStartDate(formattedDate);
            setEndDate(formattedDate);
            onSelectRange(formattedDate, formattedDate);
        }
    };

    const isDateSelected = (day) => {
        const date = formatDateToYMD(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
        return (date === startDate) || (date === endDate) || (startDate && endDate && date > startDate && date < endDate);
    };

    const handleSave = () => {
        runSaveRange(async () => {
            if (startDate && endDate) {
                onSelectRange(startDate, endDate);
                onClose();
            }
        });
    };


    return (
        <View style={styles.container} onLayout={handleLayoutChange}>
            <View style={styles.header}>
                <Text style={styles.headerText}>
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </Text>
                <View style={styles.navigationButtons}>
                    <TouchableOpacity style={{ marginHorizontal: 5 }} onPress={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>
                        <Ionicons name="chevron-back" size={20} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity style={{ marginHorizontal: 5 }} onPress={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>
                        <Ionicons name="chevron-forward" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.calendar}>
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                    <Text key={day} style={styles.dayHeader}>{day}</Text>
                ))}
                {Array.from({ length: adjustedFirstDayOfMonth - 1 }).map((_, index) => (
                    <View key={`empty-${index}`} style={styles.emptyDay} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, index) => {
                    const day = index + 1;
                    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0); // Set time to midnight to compare dates only

                    const isSelected = isDateSelected(day);
                    const isPastDate = dayDate < today;

                    return (
                        <TouchableOpacity
                            key={day}
                            onPress={() => !isPastDate && onDayPress(day)} // Disable past dates from being pressed
                            style={styles.day}
                            disabled={isPastDate} // Disable past dates
                        >
                            {isSelected ? (
                                <LinearGradient
                                    colors={['#5468FF', '#81D8D0']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.selectedDay}
                                >
                                    <Text style={styles.selectedDayText}>{day}</Text>
                                </LinearGradient>
                            ) : (
                                <Text style={[styles.dayText, isPastDate && { color: 'gray' }]}>{day}</Text>
                            )}
                        </TouchableOpacity>
                    );
                })}

            </View>
            <TouchableOpacity onPress={handleSave} disabled={isSavingRange}>
                <Text style={[styles.saveText, isSavingRange && { opacity: 0.5 }]}>SAVE</Text>
            </TouchableOpacity>
            <ConfirmationModal
                visible={modalVisible}
                title={modalTitle}
                message={modalMessage}
                onConfirm={() => setModalVisible(false)}
                confirmText="OK"
                cancelText=''
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'black',
        padding: 20,
        borderRadius: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        padding: 10
    },
    headerText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    navigationButtons: {
        flexDirection: 'row',

    },
    calendar: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayHeader: {
        width: '14.28%',
        textAlign: 'center',
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 8,
    },
    emptyDay: {
        width: '14.28%',
        aspectRatio: 1,
    },
    day: {
        width: '14.28%',
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayText: {
        color: 'white',
        fontSize: 15,
    },
    selectedDay: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedDayText: {
        color: 'white',
        fontSize: 15,
    },
    saveText: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 24,
    },
});

export default CalendarAIScreen;
