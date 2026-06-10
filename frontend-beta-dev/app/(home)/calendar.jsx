import React, { useState } from 'react';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { LinearGradient } from 'expo-linear-gradient';
import { View, Text, StyleSheet, Dimensions, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const CustomDayComponent = ({ date, state, marking }) => {
  const isSelected = marking?.selected;
  const today = new Date().toISOString().split('T')[0] === date.dateString;

  return (
    <View style={styles.dayContainer}>
      {isSelected ? (
        <LinearGradient
          colors={['#735bf2', '#f28a60']}
          style={styles.selectedDay}
        >
          <Text style={styles.selectedDayText}>{date.day}</Text>
        </LinearGradient>
      ) : (
        <View style={styles.dayTextContainer}>
          <Text style={[styles.dayText, state === 'disabled' && styles.disabledText, today && styles.todayText]}>
            {date.day}
          </Text>
          {today && <Text style={styles.todayLabel}>Today</Text>}
        </View>
      )}
    </View>
  );
};

const CalendarScreen = () => {
  const [selected, setSelected] = useState('');
  const router = useRouter();

  return (
    <View style={styles.screenContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
            <Image
            style={styles.arrowLeft}
            resizeMode="cover"
            source={require("../../assets/arrow_left.png")}
            />
        </TouchableOpacity>
        <Text style={styles.title}>Calendar</Text>
      </View>
      <View style={styles.calendarContainer}>
        <Calendar
          // Customize the appearance of the calendar
          style={styles.calendar}
          theme={{
            backgroundColor: '#000000',
            calendarBackground: '#000000',
            textSectionTitleColor: '#ffffff',
            textSectionTitleDisabledColor: '#d9e1e8',
            selectedDayBackgroundColor: '#00adf5',
            selectedDayTextColor: '#ffffff',
            todayTextColor: '#00adf5',
            dayTextColor: '#ffffff',
            textDisabledColor: '#d9e1e8',
            dotColor: '#ffffff',
            selectedDotColor: '#ffffff',
            arrowColor: '#ffffff',
            disabledArrowColor: '#d9e1e8',
            monthTextColor: '#ffffff',
            indicatorColor: '#ffffff',
            textDayFontFamily: 'monospace',
            textMonthFontFamily: 'monospace',
            textDayHeaderFontFamily: 'monospace',
            textDayFontWeight: '300',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '300',
            textDayFontSize: 12,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 14,
          }}
          onDayPress={(day) => {
            console.log('selected day', day);
            setSelected(day.dateString);
          }}
          markedDates={{
            '2024-07-17': { selected: true, marked: true, selectedColor: 'blue' },
            '2024-06-10': { marked: true },
            '2024-06-18': { selected: true, marked: true, selectedColor: 'blue' },
            '2024-06-19': { selected: true, marked: true, selectedColor: 'blue' },

          }}
          dayComponent={({ date, state, marking }) => (
            <CustomDayComponent date={date} state={state} marking={marking} />
          )}
        />
      </View>
    </View>
  );
};

export default CalendarScreen;

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center', // Center the calendar vertically
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 50, // Adjust as needed
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowLeft: {
    position: 'left',
    left: -123, // adjustment
    width: 24,
    height: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'Montserrat-ExtraBold',
    color: '#fff',
    left: -10 //adjustment
  },
  calendarContainer: {
    width: '100%',
    alignItems: 'center',
  },
  calendar: {
    borderWidth: 1,
    borderColor: 'black',
    height: 300,
    width: width, // Full width with some padding
  },
  dayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTextContainer: {
    alignItems: 'center',
    paddingVertical: 7.5, // Add vertical padding to increase spacing between dates
  },
  todayContainer: {
    paddingVertical: 0, // Remove padding for today
  },
  selectedDay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDayText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  dayText: {
    color: '#ffffff',
  },
  disabledText: {
    color: '#d9e1e8',
  },
  todayText: {
    color: '#735bf2',
  },
  todayLabel: {
    color: '#735bf2',
    fontSize: 12,
    marginTop: 0, // Add margin to separate the "Today" label from the date
  },
});
