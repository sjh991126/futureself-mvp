module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // NOTE: 'expo-router/babel' removed — merged into babel-preset-expo since SDK 50
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
          allowUndefined: true,
        },
      ],
      // Reanimated 4: plugin moved to react-native-worklets. Must stay last.
      'react-native-worklets/plugin',
    ],
  };
};
