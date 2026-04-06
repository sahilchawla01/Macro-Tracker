/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json');

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra || {}),
      usdaApiKey: process.env.EXPO_PUBLIC_USDA_API_KEY ?? '',
    },
  },
};
