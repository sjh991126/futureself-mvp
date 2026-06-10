import * as React from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const LibraryLayout = () => {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack
                screenOptions={({ route }) => ({
                    headerShown: false,
                    animation: route.name === 'list' ? 'none' :
                        ['list_details', 'place_details'].includes(route.name) ? 'slide_from_right' : 'fade',
                    animationDuration: 200,
                    gestureEnabled: true,
                    gestureDirection: 'horizontal',
                })}
            >
                <Stack.Screen
                    name="list"
                    options={{
                        headerShown: false,
                        animation: 'none',
                        animationDuration: 0,
                        gestureEnabled: false
                    }}
                />
                <Stack.Screen name="list_details" />
                <Stack.Screen name="place_details" />
                <Stack.Screen
                    name="chatscreen"
                    options={{
                        animation: 'slide_from_right',
                        animationDuration: 120,
                    }}
                />
                <Stack.Screen name="photopicker" />
                <Stack.Screen name="createhighlight" options={{ headerShown: false, animation: "none" }} />
                <Stack.Screen name="highlightviewer" options={{ headerShown: false, animation: "none" }} />
                <Stack.Screen name='liked_places' options={{ headerShown: false, animation: "none" }} />
            </Stack>

        </GestureHandlerRootView>
    );
}

export default LibraryLayout;
