// src/lib/currencyUtils.ts
//
// Locale-aware currency detection for the payment form.
//
// Strategy:
//   1. Read the browser's IANA timezone (Intl.DateTimeFormat).
//   2. Map timezone → ISO 4217 currency code.
//   3. Fall back to USD if unknown.
//
// All supported currencies use 2 decimal places (we skip JPY, KRW, etc.
// because Stripe treats zero-decimal currencies differently and they add
// complexity to the credit calculation).
//
// Credit rate: 1 whole currency unit = 100 credits, regardless of currency.
//   $1 = CHF 1 = €1 = £1 = CA$1 = A$1 = 100 credits.

export interface Currency {
  /** ISO 4217 lowercase code, e.g. 'chf' */
  code: string;
  /** Display symbol shown before the amount, e.g. 'CHF', '€', '£' */
  symbol: string;
  /** BCP 47 locale for Intl.NumberFormat, e.g. 'de-CH' */
  locale: string;
  /** Flag emoji for the currency picker */
  flag: string;
  /** Human-readable label */
  label: string;
}

// ── Supported currencies ──────────────────────────────────────────────────────

export const CURRENCIES: Record<string, Currency> = {
  usd: { code: 'usd', symbol: '$',    locale: 'en-US', flag: '🇺🇸', label: 'USD' },
  eur: { code: 'eur', symbol: '€',    locale: 'de-DE', flag: '🇪🇺', label: 'EUR' },
  gbp: { code: 'gbp', symbol: '£',    locale: 'en-GB', flag: '🇬🇧', label: 'GBP' },
  chf: { code: 'chf', symbol: 'CHF ', locale: 'de-CH', flag: '🇨🇭', label: 'CHF' },
  cad: { code: 'cad', symbol: 'CA$',  locale: 'en-CA', flag: '🇨🇦', label: 'CAD' },
  aud: { code: 'aud', symbol: 'A$',   locale: 'en-AU', flag: '🇦🇺', label: 'AUD' },
};

export const SUPPORTED_CURRENCIES = Object.values(CURRENCIES);

// ── Timezone → currency map ───────────────────────────────────────────────────
// Only entries that differ from the default (USD) need to be listed.

const TZ_CURRENCY: Record<string, string> = {
  // ── Switzerland & Liechtenstein ──
  'Europe/Zurich':  'chf',
  'Europe/Vaduz':   'chf',

  // ── United Kingdom & Crown Dependencies ──
  'Europe/London':  'gbp',
  'Europe/Jersey':  'gbp',
  'Europe/Guernsey':'gbp',
  'Europe/Isle_of_Man': 'gbp',

  // ── Eurozone ──
  'Europe/Paris':        'eur',
  'Europe/Berlin':       'eur',
  'Europe/Amsterdam':    'eur',
  'Europe/Brussels':     'eur',
  'Europe/Madrid':       'eur',
  'Europe/Rome':         'eur',
  'Europe/Vienna':       'eur',
  'Europe/Athens':       'eur',
  'Europe/Lisbon':       'eur',
  'Europe/Helsinki':     'eur',
  'Europe/Tallinn':      'eur',
  'Europe/Riga':         'eur',
  'Europe/Vilnius':      'eur',
  'Europe/Luxembourg':   'eur',
  'Europe/Dublin':       'eur',
  'Europe/Nicosia':      'eur',
  'Europe/Valletta':     'eur',
  'Europe/Ljubljana':    'eur',
  'Europe/Bratislava':   'eur',
  'Europe/Podgorica':    'eur',
  'Europe/Mariehamn':    'eur',
  'Atlantic/Azores':     'eur',
  'Atlantic/Madeira':    'eur',
  'Atlantic/Canary':     'eur',
  'Indian/Mayotte':      'eur',
  'Indian/Reunion':      'eur',
  'America/Guadeloupe':  'eur',
  'America/Martinique':  'eur',
  'America/Cayenne':     'eur',

  // ── Canada ──
  'America/Toronto':     'cad',
  'America/Vancouver':   'cad',
  'America/Edmonton':    'cad',
  'America/Winnipeg':    'cad',
  'America/Halifax':     'cad',
  'America/St_Johns':    'cad',
  'America/Regina':      'cad',
  'America/Moncton':     'cad',

  // ── Australia ──
  'Australia/Sydney':    'aud',
  'Australia/Melbourne': 'aud',
  'Australia/Brisbane':  'aud',
  'Australia/Perth':     'aud',
  'Australia/Adelaide':  'aud',
  'Australia/Darwin':    'aud',
  'Australia/Hobart':    'aud',
  'Australia/Lord_Howe': 'aud',
  'Pacific/Norfolk':     'aud',
};

// ── Detection ─────────────────────────────────────────────────────────────────

/**
 * Detect the user's preferred currency from their browser timezone.
 * Falls back to USD if the timezone is not in the map.
 */
export function detectCurrency(): Currency {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const code = TZ_CURRENCY[tz] ?? 'usd';
    return CURRENCIES[code] ?? CURRENCIES.usd;
  } catch {
    return CURRENCIES.usd;
  }
}

// ── Formatting ────────────────────────────────────────────────────────────────

/**
 * Format a whole-number amount in the given currency.
 * e.g. formatAmount(10, chf) → "CHF 10"
 *      formatAmount(10, eur) → "10 €"   (locale-dependent position)
 */
export function formatAmount(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: currency.code.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
