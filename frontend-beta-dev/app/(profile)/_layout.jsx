import * as React from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const ProfileLayout = () => {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack
                screenOptions={({ route }) => ({
                    headerShown: false,
                    animation: route.name === 'profile' ? 'none' : 
                              ['publicprofile', 'followlist'].includes(route.name) ? 'slide_from_right' : 'fade',
                    animationDuration: 200,
                    gestureEnabled: true,
                    gestureDirection: 'horizontal',
                })}
            >
                <Stack.Screen 
                    name="profile" 
                    options={{ 
                        headerShown: false, 
                        animation: 'none',
                        animationDuration: 0,
                        gestureEnabled: false
                    }} 
                />
                <Stack.Screen name="editprofile" />
                <Stack.Screen name="settings" />
                <Stack.Screen name="publicprofile" />
                <Stack.Screen name="followlist" />
                <Stack.Screen name="blocked_users" />
            </Stack>
        </GestureHandlerRootView>
    );
}

export default ProfileLayout;
