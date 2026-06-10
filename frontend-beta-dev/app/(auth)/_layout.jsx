import React from 'react';
import { Stack } from "expo-router";
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const AuthLayout = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 200,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }}
      >
        <Stack.Screen
          name="login"
          options={
            {
              gestureEnabled: false,
              headerBackVisible: false,
            }
          }
        />
        <Stack.Screen
          name="EmailVerify"
          options={
            {
              gestureEnabled: false,
              headerBackVisible: false,
            }
          }
        />
        <Stack.Screen name="otp" />
        <Stack.Screen name="setusername" />
        <Stack.Screen name="setpassword" />
        <Stack.Screen name="setprofile" />
        <Stack.Screen name="forgotpassword" />
        <Stack.Screen name="onboard_gender" />
        <Stack.Screen name="onboard_age" />
        <Stack.Screen name="onboard_groups" />
        <Stack.Screen name="onboard_foods" />
        <Stack.Screen name="onboard_country" />
        <Stack.Screen name="onboard_passions" />
        {/* <Stack.Screen name="onboard_terms" /> */}
        <Stack.Screen name="guide" />
      </Stack>
    </GestureHandlerRootView>
  );
}

export default AuthLayout;