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

/** The job post a tailored profile was generated from (job.toml on the backend). */
export interface JobSource {
  url?: string;
  company: string;
  title: string;
  created_at: string;
}

/** Returns null when the profile was not made from a job post. */
export async function getProfileJob(profileName: string): Promise<JobSource | null> {
  const encoded = encodeURIComponent(profileName);
  const resp = await apiRequest<{ data: JobSource | null }>(`/profiles/${encoded}/job`, {
    method: 'GET',
    requireAuth: true,
  });
  return resp.data ?? null;
}
