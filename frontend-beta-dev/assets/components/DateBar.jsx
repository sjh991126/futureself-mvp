import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';

const DateBar = ({ startDate, endDate }) => {
    const formattedStartDate = format(parseISO(startDate), 'MMM d');
    const formattedEndDate = format(parseISO(endDate), 'MMM d');

    return (
        <LinearGradient
            colors={['#5468ff', '#81d8d0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.dateBar}
        >
            <Ionicons name="calendar-outline" size={24} color="white" style={styles.icon} />
            <Text style={styles.dateText}>{formattedStartDate} - {formattedEndDate}</Text>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    dateBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 10,
        marginVertical: 10,
        width: "97%",
        alignSelf: 'center'
    },
    icon: {
        marginRight: 15,
        marginLeft: 15
    },
    dateText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default DateBar;