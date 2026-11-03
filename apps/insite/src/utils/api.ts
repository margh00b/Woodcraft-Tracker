export const getWebAPIUrl = () => {
  if (__DEV__) {
    return process.env.EXPO_PUBLIC_TEST_IP;
  }

  return "https://core.woodcraftkc.com";
};
