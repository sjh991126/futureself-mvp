import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AchievementBadge = ({ level, isVisible = true }) => {
  if (!isVisible) return null;

  return (
    <View style={styles.badgeContainer}>
      <Ionicons name="trophy" size={16} color="#FFD700" />
      <Text style={styles.badgeText}>Level {level}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#FFD700',
    gap: 4,
  },
  badgeText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default AchievementBadge; 