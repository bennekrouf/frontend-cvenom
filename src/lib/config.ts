const getDefaultApiUrl = (): string => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_CVENOM_API_URL || 'https://api.cvenom.com';
  }
  return process.env.NEXT_PUBLIC_CVENOM_API_URL || 'http://127.0.0.1:4002';
};

export const getApiUrl = (): string => {
  console.log("api url", getDefaultApiUrl());
  return getDefaultApiUrl();
};
