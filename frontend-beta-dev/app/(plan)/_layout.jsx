import { Redirect, Stack } from "expo-router";
import React from 'react';
import { TripProvider } from './../src/api/TripContext.js';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// import { StripeProvider } from '@stripe/stripe-react-native'
// import { STRIPE_PUBLISHABLE_KEY } from '@env';

const PlanLayout = () => {
  return (
    <TripProvider>
      {/* <StripeProvider
        publishableKey={STRIPE_PUBLISHABLE_KEY}
        merchantIdentifier="your_merchant_identifier" 
      ></StripeProvider> */}
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
          <Stack.Screen name="modeselect" />
          <Stack.Screen name="aifilter" />
          <Stack.Screen name="locationfilter" />
          <Stack.Screen name='triplist' />
          <Stack.Screen name='createtriplist' />
          <Stack.Screen name='manualselection' />
          <Stack.Screen name="add_place" />
          <Stack.Screen name="instant_list" />
          <Stack.Screen name='payment' />
        </Stack>
      </GestureHandlerRootView>
    </TripProvider>
  );
}

export default PlanLayout;

