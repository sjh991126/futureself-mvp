import { Redirect, Stack } from "expo-router";
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import React from 'react';

const HomeLayout = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={({ route }) => ({
          headerShown: false,
          animation: route.name === 'homepage' ? 'none' : 
                    ['categories', 'all_search', 'search_page', 'elastic_search'].includes(route.name) ? 'slide_from_right' : 'fade',
          animationDuration: 200,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        })}
      >
        <Stack.Screen 
          name="homepage" 
          options={{ 
            headerShown: false, 
            animation: 'none',
            animationDuration: 0,
            gestureEnabled: false
          }} 
        />
        <Stack.Screen name="calendar" />
        <Stack.Screen name="full_map" />
        <Stack.Screen name='write_review' />
        <Stack.Screen name="categories" />
        <Stack.Screen name="all_search" />
        <Stack.Screen name="search_page" />
        <Stack.Screen name="elastic_search" />
        <Stack.Screen name="notification" />
        <Stack.Screen name="themescreen" />
      </Stack>
    </GestureHandlerRootView>
  );
}

export default HomeLayout;