import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

// Locale-less /credits (linked from backend error messages) → /<locale>/credits.
export default async function CreditsRedirectPage() {
  const acceptLanguage = (await headers()).get('accept-language')?.toLowerCase() || '';
  const locale = acceptLanguage.includes('fr') ? 'fr' : acceptLanguage.includes('de') ? 'de' : 'en';
  redirect(`/${locale}/credits`);
}
