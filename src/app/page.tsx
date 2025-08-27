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

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Redirecting...</p>
      </div>
    </div>
  );
}
