import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUserQuests, completeQuest } from '../../app/src/api/quests';
import { incrementUserPoints, getUserPoints } from '../../app/src/api/userPoints';

const ContributorRewards = ({ onQuestUpdate, user }) => {
  const [quests, setQuests] = useState([]);
  const [userPoints, setUserPoints] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(3);
  const [pointsToNextLevel, setPointsToNextLevel] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [allQuestsCompleted, setAllQuestsCompleted] = useState(false);

  useEffect(() => {
    fetchQuests();
  }, []);

  const fetchQuests = async () => {
    try {
      setIsLoading(true);
      
      // Try to get data from backend first
      try {
        const data = await getUserQuests();
        setQuests(data.quests || []);
        setUserPoints(data.userPoints || 0);
        setCurrentLevel(data.currentLevel || 3);
        setPointsToNextLevel(data.pointsToNextLevel || 100);
        
        // Check if all quests are completed
        const completed = (data.quests || []).every(quest => quest.isCompleted);
        setAllQuestsCompleted(completed);
        
        // Notify parent component about initial quest status
        if (onQuestUpdate) {
          onQuestUpdate({
            currentLevel: data.currentLevel || 3,
            allQuestsCompleted: completed,
            userPoints: data.userPoints || 0,
            pointsToNextLevel: data.pointsToNextLevel || 100
          });
        }
        
        console.log('✅ Successfully loaded quest data from backend');
        return;
        
      } catch (backendError) {
        console.log('⚠️ Backend not ready, using demo data:', backendError.message);
      }
      
      // Fallback to demo data when backend isn't ready
      console.log('🎮 Using demo quest data for UI preview');
      const fallbackQuests = [
        {
          activityType: 'WRITE_REVIEW',
          targetCount: 2,
          currentProgress: 0,
          isCompleted: false
        },
        {
          activityType: 'UPLOAD_POST',
          targetCount: 2,
          currentProgress: 0,
          isCompleted: false
        },
        {
          activityType: 'COLLABORATE',
          targetCount: 1,
          currentProgress: 0,
          isCompleted: false
        }
      ];
      
      setQuests(fallbackQuests);
      setUserPoints(0);
      setCurrentLevel(3);
      setPointsToNextLevel(100);
      setAllQuestsCompleted(false);
      
      // Notify parent component about fallback status
      if (onQuestUpdate) {
        onQuestUpdate({
          currentLevel: 3,
          allQuestsCompleted: false,
          userPoints: 0,
          pointsToNextLevel: 100
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestCompletion = async (activityType) => {
    try {
      // Try to use the working points API to increment points
      console.log(`Completing quest: ${activityType}`);
      
      // Increment points using the working API
      await incrementUserPoints(10); // Give 10 points per quest completion
      
      // Get updated points
      const pointsData = await getUserPoints();
      const newPoints = pointsData.user_points || 0;
      setUserPoints(newPoints);
      
      // Calculate level and progress (simple calculation)
      const newLevel = Math.floor(newPoints / 100) + 3; // Start at level 3
      const pointsInCurrentLevel = newPoints % 100;
      const pointsToNext = 100 - pointsInCurrentLevel;
      
      setCurrentLevel(newLevel);
      setPointsToNextLevel(pointsToNext);
      
      // Update quest completion status locally
      setQuests(prevQuests => {
        const updatedQuests = prevQuests.map(quest => 
          quest.activityType === activityType 
            ? { 
                ...quest, 
                currentProgress: Math.min(quest.currentProgress + 1, quest.targetCount), 
                isCompleted: quest.currentProgress + 1 >= quest.targetCount 
              }
            : quest
        );
        
        // Check if all quests are now completed
        const allCompleted = updatedQuests.every(quest => quest.isCompleted);
        
        if (allCompleted && !allQuestsCompleted) {
          setAllQuestsCompleted(true);
          Alert.alert(
            '🎉 Congratulations!',
            'Congrats on finishing your weekly tasks! Check back next week for new challenges!',
            [{ text: 'Awesome!', style: 'default' }]
          );
        }
        
        // Update parent component
        if (onQuestUpdate) {
          onQuestUpdate({
            currentLevel: newLevel,
            allQuestsCompleted: allCompleted,
            userPoints: newPoints,
            pointsToNextLevel: pointsToNext
          });
        }
        
        return updatedQuests;
      });
      
      console.log(`✅ Quest completed! Points: ${newPoints}, Level: ${newLevel}`);
      
    } catch (error) {
      console.error('Error completing quest:', error);
      
      // Fallback: simulate quest completion locally when API isn't available
      console.log('Using fallback quest completion for:', activityType);
      
      // Update quest completion status locally
      setQuests(prevQuests => {
        const updatedQuests = prevQuests.map(quest => 
          quest.activityType === activityType 
            ? { 
                ...quest, 
                currentProgress: Math.min(quest.currentProgress + 1, quest.targetCount), 
                isCompleted: quest.currentProgress + 1 >= quest.targetCount 
              }
            : quest
        );
        
        // Check if all quests are now completed
        const allCompleted = updatedQuests.every(quest => quest.isCompleted);
        
        if (allCompleted && !allQuestsCompleted) {
          setAllQuestsCompleted(true);
          Alert.alert(
            '🎉 Congratulations!',
            'Congrats on finishing your weekly tasks! Check back next week for new challenges!',
            [{ text: 'Awesome!', style: 'default' }]
          );
        }
        
        // Update parent component with fallback data
        const newPoints = userPoints + 10;
        const newLevel = Math.floor(newPoints / 100) + 3;
        const pointsToNext = 100 - (newPoints % 100);
        
        if (onQuestUpdate) {
          onQuestUpdate({
            currentLevel: newLevel,
            allQuestsCompleted: allCompleted,
            userPoints: newPoints,
            pointsToNextLevel: pointsToNext
          });
        }
        
        return updatedQuests;
      });
      
      // Simulate points update locally
      setUserPoints(prev => prev + 10);
      const newPoints = userPoints + 10;
      const newLevel = Math.floor(newPoints / 100) + 3;
      setCurrentLevel(newLevel);
      setPointsToNextLevel(100 - (newPoints % 100));
    }
  };

  const getQuestIcon = (activityType) => {
    switch (activityType) {
      case 'WRITE_REVIEW':
        return 'star-outline';
      case 'COLLABORATE':
        return 'people-outline';
      case 'UPLOAD_POST':
        return 'camera-outline';
      default:
        return 'checkmark-circle-outline';
    }
  };

  const getQuestTitle = (activityType, targetCount) => {
    switch (activityType) {
      case 'WRITE_REVIEW':
        return `Write ${targetCount} ${targetCount === 1 ? 'review' : 'reviews'}`;
      case 'COLLABORATE':
        return 'Collaborate on a triplist';
      case 'UPLOAD_POST':
        return `Upload ${targetCount} ${targetCount === 1 ? 'post' : 'posts'} to community`;
      default:
        return 'Complete task';
    }
  };

  const calculateProgress = (current, target) => {
    return Math.min((current / target) * 100, 100);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading rewards...</Text>
      </View>
    );
  }

  if (allQuestsCompleted) {
    return (
      <View style={styles.completedContainer}>
        <View style={styles.badgeContainer}>
          <Ionicons name="trophy" size={50} color="#FFD700" />
        </View>
        <Text style={styles.completedTitle}>Unlock your Contributor Rewards</Text>
        <Text style={styles.completedMessage}>
          Congrats on finishing your weekly tasks! Check back next week for new challenges!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Unlock your Contributor Rewards</Text>
      <Text style={styles.subtitle}>{pointsToNextLevel} points away from Level {currentLevel + 1}</Text>
      
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${((100 - pointsToNextLevel) / 100) * 100}%` }]} />
        </View>
      </View>

      <View style={styles.questsContainer}>
        {quests.map((quest, index) => (
          <View key={index} style={styles.questItem}>
            <View style={styles.questHeader}>
              <View style={styles.questIconContainer}>
                <Ionicons 
                  name={quest.isCompleted ? 'checkmark-circle' : getQuestIcon(quest.activityType)} 
                  size={20} 
                  color={quest.isCompleted ? '#4CAF50' : '#fff'} 
                />
              </View>
              <View style={styles.questTextContainer}>
                <Text style={styles.questTitle}>
                  {getQuestTitle(quest.activityType, quest.targetCount)}
                </Text>
                <Text style={styles.questProgress}>
                  {quest.currentProgress}/{quest.targetCount}
                </Text>
              </View>
              {quest.isCompleted && (
                <Ionicons name="checkmark" size={20} color="#4CAF50" />
              )}
            </View>
            
            <View style={styles.questProgressBarContainer}>
              <View style={styles.questProgressBar}>
                <View 
                  style={[
                    styles.questProgressFill, 
                    { 
                      width: `${calculateProgress(quest.currentProgress, quest.targetCount)}%`,
                      backgroundColor: quest.isCompleted ? '#4CAF50' : '#00BFFF'
                    }
                  ]} 
                />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 20,
    marginVertical: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  completedContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 20,
    marginVertical: 15,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  badgeContainer: {
    marginBottom: 15,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  completedTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    color: '#888',
    fontSize: 12,
    marginBottom: 15,
  },
  completedMessage: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  progressBarContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00BFFF',
    borderRadius: 3,
  },
  questsContainer: {
    gap: 15,
  },
  questItem: {
    gap: 8,
  },
  questHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  questIconContainer: {
    width: 24,
    alignItems: 'center',
  },
  questTextContainer: {
    flex: 1,
  },
  questTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  questProgress: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  questProgressBarContainer: {
    marginLeft: 36,
  },
  questProgressBar: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  questProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  loadingText: {
    color: '#888',
    textAlign: 'center',
    fontSize: 14,
  },
});

export default ContributorRewards; 