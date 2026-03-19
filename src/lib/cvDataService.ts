// src/lib/cvDataService.ts
// API calls for the CV form editor.
// Backend routes: GET /profiles/:name/cv-data, PUT /profiles/:name/cv-data
//
// Uses the shared apiRequest() helper so auth, base URL, and error handling
// are identical to every other API call in the app.

import { apiRequest } from './api';
import type { CvFormData } from '@/types/cvFormData';

/**
 * Fetch the unified CV data for a profile.
 * Parses cv_params.toml + experiences_en.typ on the backend and returns CvFormData.
 */
export async function getCvData(profileName: string, lang = 'en'): Promise<CvFormData> {
  const encoded = encodeURIComponent(profileName);
  return apiRequest<CvFormData>(`/profiles/${encoded}/cv-data?lang=${encodeURIComponent(lang)}`, {
    method: 'GET',
    requireAuth: true,
  });
}

/**
 * Save the unified CV data for a profile.
 * Regenerates cv_params.toml and experiences_{lang}.typ on the backend.
 */
export async function saveCvData(profileName: string, data: CvFormData, lang = 'en'): Promise<void> {
  const encoded = encodeURIComponent(profileName);
  await apiRequest(`/profiles/${encoded}/cv-data?lang=${encodeURIComponent(lang)}`, {
    method: 'PUT',
    body: data,
    requireAuth: true,
  });
}
