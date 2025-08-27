import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'fr'] as const;
export const defaultLocale = 'en' as const;

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  locale = defaultLocale;

  try {
    const messages = (await import(`./messages/${locale}.json`)).default;
    return {
      locale,
      messages
    };
  } catch (error) {
    console.error('Error loading messages:', error);
    return {
      locale: 'en',
      messages: {}
    };
  }
});
