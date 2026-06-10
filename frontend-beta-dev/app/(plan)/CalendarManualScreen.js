import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ConfirmationModal from '../../assets/components/ConfirmationModal';
import { useSingleFlightAction } from '../src/hooks/useSingleFlightAction';

const MAX_LENGTH = 20;

const CalendarManualScreen = ({ onSelectRange, onClose, startDateProp, endDateProp }) => {
    const [currentDate, setCurrentDate] = useState(() => {
        if (startDateProp) {
            return new Date(startDateProp);
        }
        return new Date();
    });
    const [startDate, setStartDate] = useState(startDateProp);
    const [endDate, setEndDate] = useState(endDateProp);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalTitle, setModalTitle] = useState('');
    const { run: runSaveRange, isRunning: isSavingRange } = useSingleFlightAction('plan:calendar-manual-save');

    useEffect(() => {
        setStartDate(startDateProp);
        setEndDate(endDateProp);
        if (startDateProp) {
            setCurrentDate(new Date(startDateProp));
        }
    }, [startDateProp, endDateProp]);

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    // Adjust first day of the month to align Monday as the first day of the week
    const adjustedFirstDayOfMonth = firstDayOfMonth === 0 ? 7 : firstDayOfMonth;

    const formatDateToYMD = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const calculateRangeLength = (start, end) => {
        const startMoment = new Date(start);
        const endMoment = new Date(end);
        return Math.ceil((endMoment - startMoment) / (1000 * 60 * 60 * 24)) + 1;
    };

    const onDayPress = (day) => {
        const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const formattedDate = formatDateToYMD(selectedDate);

        // Edit 모드에서 startDate와 endDate가 다를 때 (기존 범위가 있을 때)
        if (startDate && endDate && startDate !== endDate) {
            setStartDate(formattedDate);
            setEndDate(formattedDate);
            onSelectRange(formattedDate, formattedDate);
            return;
        }

        // startDate만 있을 때
        if (startDate && startDate === endDate) {
            const startDateObj = new Date(startDate);
            const rangeLength = calculateRangeLength(startDate, formattedDate);

            // 먼 날짜 선택 시 새로운 시작점으로 설정
            if (rangeLength > MAX_LENGTH) {
                setStartDate(formattedDate);
                setEndDate(formattedDate);
                onSelectRange(formattedDate, formattedDate);
            } else if (selectedDate >= startDateObj) {
                setEndDate(formattedDate);
                onSelectRange(startDate, formattedDate);
            } else {
                setModalTitle('Invalid Date Range');
                setModalMessage('End date cannot be before start date.');
                setModalVisible(true);
            }
        } else {
            // 처음 선택
            setStartDate(formattedDate);
            setEndDate(formattedDate);
            onSelectRange(formattedDate, formattedDate);
        }
    };

    const isDateSelected = (day) => {
        const date = formatDateToYMD(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
        return (date === startDate) || (date === endDate) || (startDate && endDate && date > startDate && date < endDate);
    };

    const isDateDisabled = (day) => {
        if (startDate && endDate && (startDate != endDate)) return false;

        const tentativeEnd = formatDateToYMD(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
        const rangeLength = calculateRangeLength(startDate, tentativeEnd);
        return rangeLength > MAX_LENGTH;
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
        <View style={styles.container}>
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
                    const isSelected = isDateSelected(day);
                    const isDisabled = isDateDisabled(day);
                    return (
                        <TouchableOpacity
                            key={day}
                            onPress={() => !isDisabled && onDayPress(day)}
                            style={[styles.day, isDisabled && styles.disabledDay]}
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
                                <Text style={[styles.dayText, isDisabled && styles.disabledDayText]}>{day}</Text>
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
                cancelText=""
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
    disabledDay: {
        opacity: 0.5,
    },
    disabledDayText: {
        color: '#888',
    },
});

export default CalendarManualScreen;
