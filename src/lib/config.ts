const getDefaultApiUrl = (): string => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_API_URL || 'https://studio.cvenom.com/api';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';
};

export const getApiUrl = (): string => {
  return getDefaultApiUrl();
};
