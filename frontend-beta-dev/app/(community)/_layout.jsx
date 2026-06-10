import { Stack } from "expo-router";
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const CommunityLayout = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={({ route }) => ({
          headerShown: false,
          animation: route.name === 'community_home' ? 'none' : 
                    ['post', 'post_content', 'messagelist'].includes(route.name) ? 'slide_from_right' : 'fade',
          animationDuration: 200,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        })}
      >
        <Stack.Screen name="not_ready" />
        <Stack.Screen 
          name="community_home" 
          options={{ 
            headerShown: false, 
            animation: 'none',
            animationDuration: 0,
            gestureEnabled: false
          }} 
        />
        <Stack.Screen name="community_search" />
        <Stack.Screen name="post" />
        <Stack.Screen name="post_content" />
        <Stack.Screen name="messagelist" />
      </Stack>
    </GestureHandlerRootView>
  );
}

export default CommunityLayout;

