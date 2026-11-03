export const getWebAPIUrl = () => {
  if (__DEV__) {
    return process.env.TEST_IP;
  }

  return "https://core.woodcraftkc.com";
};
