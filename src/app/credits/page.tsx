import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

// Locale-less /credits (linked from backend error messages, and mayorana.ch's
// "Back to CVenom" with ?subscribed=1) → /<locale>/credits, query kept.
export default async function CreditsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const acceptLanguage = (await headers()).get('accept-language')?.toLowerCase() || '';
  const locale = acceptLanguage.includes('fr') ? 'fr' : acceptLanguage.includes('de') ? 'de' : 'en';
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const v of Array.isArray(value) ? value : value ? [value] : []) query.append(key, v);
  }
  const qs = query.toString();
  redirect(`/${locale}/credits${qs ? `?${qs}` : ''}`);
}
