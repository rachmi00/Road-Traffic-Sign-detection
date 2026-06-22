// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Allow Metro to bundle .tflite model files placed in assets/models/
config.resolver.assetExts.push('tflite');

module.exports = config;
