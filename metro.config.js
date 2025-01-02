const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./app/globals.css" });
// Commit 2: Progress update on Object Assist
// Clean Commit 2: Progress update on Object Assist
// Corrected Timeline Commit 2 - 2025-01-02T10:00:00
