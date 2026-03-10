// src/lib/cvDataService.ts
// API calls for the CV form editor.
// Backend routes: GET /profiles/:name/cv-data, PUT /profiles/:name/cv-data

import { auth } from './firebase';
import type { CvFormData } from '@/types/cvFormData';

async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
}

function getApiBase(): string {
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_CVENOM_API_URL || 'https://api.cvenom.com';
  }
  return process.env.NEXT_PUBLIC_CVENOM_API_URL || 'http://127.0.0.1:4002';
}

/**
 * Fetch the unified CV data for a profile.
 * Parses cv_params.toml + experiences_en.typ on the backend.
 */
export async function getCvData(profileName: string): Promise<CvFormData> {
  const token = await getAuthToken();
  const encoded = encodeURIComponent(profileName);

  const res = await fetch(`${getApiBase()}/profiles/${encoded}/cv-data`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to load CV data (${res.status}): ${text}`);
  }

  return res.json() as Promise<CvFormData>;
}

/**
 * Save the unified CV data for a profile.
 * Regenerates cv_params.toml and experiences_en.typ on the backend.
 */
export async function saveCvData(profileName: string, data: CvFormData): Promise<void> {
  const token = await getAuthToken();
  const encoded = encodeURIComponent(profileName);

  const res = await fetch(`${getApiBase()}/profiles/${encoded}/cv-data`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to save CV data (${res.status}): ${text}`);
  }
}
