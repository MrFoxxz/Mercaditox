const { existsSync } = require("node:fs");
const path = require("node:path");

module.exports = ({ config }) => {
  const firebaseEnabled = existsSync(path.join(__dirname, "google-services.json"));
  return {
    ...config,
    extra: { ...config.extra, firebaseEnabled },
    android: {
      ...config.android,
      ...(firebaseEnabled ? { googleServicesFile: "./google-services.json" } : {}),
    },
    plugins: [
      ...config.plugins,
      ...(firebaseEnabled ? ["@react-native-firebase/app", "@react-native-firebase/auth"] : []),
    ],
  };
};
