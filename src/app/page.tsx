import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default async function RootRedirectPage() {
  try {
    const headersList = await headers();
    const acceptLanguage = headersList.get('accept-language') || '';
    const userLocale = acceptLanguage.toLowerCase().includes('fr') ? 'fr' : 'en';
    redirect(`/${userLocale}`);
  } catch (error) {
    console.error('Root redirect error:', error);
    redirect('/en');
  }
}
