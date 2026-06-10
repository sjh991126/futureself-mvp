import React from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import {
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Jost_600SemiBold } from '@expo-google-fonts/jost';

export default function PremiumLayout() {
    // Design file typography: Plus Jakarta Sans. Render proceeds on error (system fallback).
    const [loaded, error] = useFonts({
        PlusJakartaSans_400Regular,
        PlusJakartaSans_500Medium,
        PlusJakartaSans_600SemiBold,
        PlusJakartaSans_700Bold,
        PlusJakartaSans_800ExtraBold,
        Jost_600SemiBold,
    });
    if (!loaded && !error) return null;

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#000000' },
                animation: 'slide_from_right',
            }}
        />
    );
}
