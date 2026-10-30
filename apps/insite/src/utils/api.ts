import { Platform } from "react-native";

export const getWebAPIUrl = () => {
  if (__DEV__) {
    // Replace with your computer's actual local IP address
    return "http://192.168.5.138:3000";

    // (You can comment out the Android 10.0.2.2 and iOS localhost logic while testing on a physical phone)
  }

  return "https://your-production-web-app.com";
};
