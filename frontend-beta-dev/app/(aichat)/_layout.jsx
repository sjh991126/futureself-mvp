import { Redirect, Stack } from "expo-router";
import React from 'react';

const AIChatLayout = () => {
  return (
    <Stack>
      <Stack.Screen name="chat" options={{ headerShown: false, animation: "none" }} />
    </Stack>
  );
}

export default AIChatLayout;