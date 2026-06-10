import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

const getCurrentWeekDates = () => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 (Sunday) to 6 (Saturday)
  const startOfWeek = new Date(today); 
  startOfWeek.setDate(today.getDate() - dayOfWeek);

  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    weekDates.push({
      day: date.toLocaleString('en-US', { weekday: 'narrow' }), // e.g., 'S', 'M'
      date: date.getDate(),
      current: date.toDateString() === today.toDateString(),
    });
  }

  return weekDates;
};

const DayItem = ({ day, date, current }) => (
  <View style={styles.dayWrapper}>
    <LinearGradient
      colors={current ? ['#A14EBF', '#F58A07'] : ['transparent', 'transparent']}
      style={[styles.dayContainer, current && styles.currentDayContainer]}
    >
      <Text style={[styles.dayText, current && styles.currentDayText]}>{date}</Text>
    </LinearGradient>
    <Text style={[styles.dayLabel, current && styles.currentDayLabel]}>{day}</Text>
  </View>
);

const ScheduleComponent = () => {
  const [weekDates, setWeekDates] = useState([]);

  useEffect(() => {
    const dates = getCurrentWeekDates();
    setWeekDates(dates);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>View your scheduled activities for this week</Text>
        <TouchableOpacity onPress={() => router.push('/calendar')}>
          <Image source={require('../calendar.png')} style={styles.icon} />
        </TouchableOpacity>
      </View>
      <View style={styles.daysList}>
        {weekDates.map((item) => (
          <DayItem key={item.date.toString()} {...item} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    borderRadius: 20,
    padding: 15,
    margin: 12,
    borderColor: '#fff',
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Montserrat-SemiBold',
  },
  icon: {
    color: '#fff',
  },
  daysList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8
  },
  dayWrapper: {
    alignItems: 'center',
  },
  dayContainer: {
    width: 34,
    height: 34,
    borderRadius: 5,
    borderColor: '#fff',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8, // Increased margin for more separation
  },
  currentDayContainer: {
    // This style will be overridden by the LinearGradient component
  },
  dayText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  currentDayText: {
    color: '#fff',
  },
  dayLabel: {
    color: '#fff',
    fontSize: 10, // Reduced font size
    marginTop: 2, // Reduced margin
  },
  currentDayLabel: {
    color: '#fff',
    marginTop: 3,
  },
});

export default ScheduleComponent;

