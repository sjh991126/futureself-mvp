import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const DayComponent = ({ date, state, marking, onPress }) => {
    const markedStyle = marking?.startingDay || marking?.endingDay || marking?.color ? styles.marked : {};
    return (
        <TouchableOpacity onPress={() => onPress(date)}>
            <View style={[styles.dayContainer, markedStyle]}>
                <Text style={[styles.dayText, state === 'disabled' ? styles.disabledText : null]}>
                    {date.day}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    dayContainer: {
        width: 36, 
        height: 36, 
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayText: {
        color: 'white',
        fontSize: 16,
    },
    disabledText: {
        color: '#4d4d4d',
    },
    marked: {
        backgroundColor: '#5468FF',
        borderRadius: 18,
    },
});

export default DayComponent;
