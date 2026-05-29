// src/lib/config.ts
import { getAuth } from 'firebase/auth';
import { getApiUrl } from './config';
interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
}

interface SiteConfig {
  api: ApiConfig;
  site: {
    name: string;
    domain: string;
    description: string;
    locale: string;
  };
}

// Load configuration from YAML
const config: SiteConfig | null = null;

// Synchronous getter for when config is already loaded
export const getConfig = (): SiteConfig => {
  if (!config) {
    throw new Error('Config not loaded. Call loadConfig() first.');
  }
  return config;
};

// Updated lib/api.ts with centralized config
import { auth } from './firebase';

export interface AuthError {
  code: string;
  message: string;
}

// Backend may return modified as a plain number (new) or Rust SystemTime struct (legacy)
export type RustSystemTime = { secs_since_epoch: number; nanos_since_epoch: number };
export interface FileTreeItem {
  type: 'file' | 'folder';
  size?: number;
  modified?: number | RustSystemTime;
  children?: Record<string, FileTreeItem>;
  /** True if the profile has any photo (own or tenant default). */
  has_photo?: boolean;
  /** True only if the profile has its own custom photo (not the tenant default). */
  has_own_photo?: boolean;
}

export function modifiedToMs(modified: FileTreeItem['modified']): number {
  if (!modified) return 0;
  if (typeof modified === 'number') return modified * 1000;
  return (modified as RustSystemTime).secs_since_epoch * 1000;
}

export function getLatestModified(item: FileTreeItem): number {
  if (item.type === 'file') return modifiedToMs(item.modified);
  if (!item.children) return 0;
  return Math.max(0, ...Object.values(item.children).map(getLatestModified));
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  requireAuth?: boolean;
  headers?: Record<string, string>;
}

/**
 * Get the current Firebase ID token
 */
async function getAuthToken(): Promise<string | null> {
  if (!auth.currentUser) {
    return null;
  }

  try {
    const token = await auth.currentUser.getIdToken();
    return token;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
}

/**
 * Make authenticated API request to backend
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    requireAuth = false,
    headers = {}
  } = options;

  // Prepare headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers
  };

  // Add auth token if required or available
  if (requireAuth || auth.currentUser) {
    const token = await getAuthToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    } else if (requireAuth) {
      throw new Error('Authentication required but no valid token available');
    }
  }

  // Attach referral code from localStorage (one-time, consumed on first authenticated request)
  if (typeof window !== 'undefined') {
    const refCode = localStorage.getItem('cvenom_ref');
    if (refCode) {
      requestHeaders['X-Referral-Code'] = refCode;
      localStorage.removeItem('cvenom_ref');
    }
  }

  // Get API base URL
  const apiUrl = getApiUrl();

  // Make request
  const response = await fetch(`${apiUrl}${endpoint}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Handle non-JSON responses (like PDF downloads)
  const contentType = response.headers.get('Content-Type');

  if (contentType && contentType.includes('application/pdf')) {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to download PDF`);
    }
    return response.blob() as T;
  }

  // Handle plain text responses (like file content)  
  if (contentType && contentType.includes('text/plain')) {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch file content`);
    }
    return response.text() as T;
  }

  // Handle JSON responses
  const jsonData = await response.json();

  // Check for success:false in response body (even with HTTP 200)
  if (jsonData && typeof jsonData === 'object' && 'success' in jsonData && jsonData.success === false) {
    throw new Error(jsonData.error || 'Operation failed');
  }

  // Handle HTTP error status codes
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required or token expired');
    }
    if (response.status === 403) {
      throw new Error('Access denied');
    }

    const errorMessage = jsonData.message || jsonData.error || `HTTP ${response.status}`;
    throw new Error(errorMessage);
  }

  return jsonData;
}

/**
 * Permanently delete the current user's account and all associated data.
 * Removes all profile files on the server and the tenant DB record.
 */
export async function deleteAccount(): Promise<void> {
  await apiRequest('/me', {
    method: 'DELETE',
    requireAuth: true,
  });
}

export async function deleteCollaborator(personName: string) {
  return apiRequest('/delete-profile', {
    method: 'POST',
    body: { profile: personName },
    requireAuth: true
  });
}

// API functions using centralized config
export async function getTenantFileTree(): Promise<Record<string, FileTreeItem>> {
  return apiRequest('/files/tree', {
    method: 'GET',
    requireAuth: true
  });
}

export async function getTenantFileContent(filePath: string): Promise<string> {
  return apiRequest(`/files/content?path=${encodeURIComponent(filePath)}`, {
    method: 'GET',
    requireAuth: true
  });
}

export async function saveTenantFileContent(filePath: string, content: string) {
  return apiRequest('/files/save', {
    method: 'POST',
    body: { path: filePath, content },
    requireAuth: true
  });
}

export async function createCollaborator(personName: string) {
  return apiRequest('/create', {
    method: 'POST',
    body: { profile: personName },
    requireAuth: true
  });
}

export async function uploadPicture(personName: string, file: File) {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const formData = new FormData();
  formData.append('profile', personName);
  formData.append('file', file);

  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/upload-picture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Authentication required or token expired');
    if (response.status === 413) throw new Error('File is too large. Please choose a smaller image (max 10 MB).');
    throw new Error(`Upload failed: ${response.status}`);
  }

  return response.json();
}

interface GeneratePdfResponse {
  success: boolean;
  download_url: string;
  filename: string;
  profile: string;
}

export async function generateCV(
  personName: string,
  language: string,
  template: string = 'default'
): Promise<Blob> {
  const result = await apiRequest<GeneratePdfResponse>('/generate', {
    method: 'POST',
    body: {
      profile: personName,
      lang: language,
      template: template
    },
    requireAuth: true
  });

  const resp = await fetch(result.download_url);
  if (!resp.ok) throw new Error(`Failed to download PDF: HTTP ${resp.status}`);
  const blob = await resp.blob();
  if (!blob || blob.size === 0) throw new Error('Downloaded PDF is empty — try again');
  return blob;
}

export async function generatePortfolio(
  personName: string,
  language: string,
  template: string = 'portfolio'
): Promise<{ success: boolean; download_url: string; filename: string; profile: string }> {
  return apiRequest('/portfolio/generate', {
    method: 'POST',
    body: { profile: personName, lang: language, template },
    requireAuth: true,
  });
}

export async function getTemplates() {
  const response = await apiRequest<{
    success: boolean;
    data: Array<{ name: string; description: string }>;
  }>('/templates', {
    method: 'GET',
    requireAuth: false
  });

  return response;  // Return as-is
}

export async function getCurrentUser() {
  return apiRequest('/me', {
    method: 'GET',
    requireAuth: true
  });
}

// ── SMTP admin ────────────────────────────────────────────────────────────────

export interface SmtpConfig {
  smtp_host:    string | null;
  smtp_port:    number | null;
  smtp_user:    string | null;
  email_from:   string | null;
  has_password: boolean;
}

export async function getSmtpConfig(): Promise<SmtpConfig> {
  return apiRequest<SmtpConfig>('/admin/smtp-config', { requireAuth: true });
}

export async function saveSmtpConfig(data: {
  smtp_host?:     string;
  smtp_port?:     number;
  smtp_user?:     string;
  smtp_password?: string;
  email_from?:    string;
}): Promise<void> {
  await apiRequest('/admin/smtp-config', {
    method: 'PUT',
    body: data,
    requireAuth: true,
  });
}

// ── Admin credit management ──────────────────────────────────────────────────

export interface AdminUserCredit {
  email: string;
  tenant_name: string;
  balance: number;
  joined_at: string;
}

export interface AdminCreditUsersResponse {
  success: boolean;
  total_users: number;
  total_credits: number;
  users: AdminUserCredit[];
}

export async function adminGetCreditUsers(): Promise<AdminCreditUsersResponse> {
  return apiRequest<AdminCreditUsersResponse>('/admin/credits/users', { requireAuth: true });
}

export async function adminAddCredits(email: string, amount: number, description?: string): Promise<{ success: boolean; new_balance: number }> {
  return apiRequest('/admin/credits', {
    method: 'POST',
    body: { email, amount, description },
    requireAuth: true,
  });
}

export async function healthCheck() {
  return apiRequest('/health', {
    method: 'GET',
    requireAuth: false
  });
}

// ── ATS Optimization ──────────────────────────────────────────────────────────

export interface KeywordAnalysis {
  job_title: string;
  company: string;
  required_skills: string[];
  preferred_skills: string[];
  keywords: string[];
  experience_level: string;
  key_responsibilities: string[];
  matched_keywords: string[];
  missing_keywords: string[];
}

export interface OptimizeResponse {
  optimized_typst: string;
  /** Serialised CvJson — pass to saveOptimizedProfile() to create a new profile. */
  optimized_cv_json?: string;
  job_title: string;
  company_name: string;
  optimizations: string[] | null;
  keyword_analysis: KeywordAnalysis | null;
  /** ATS match percentage before optimization (0-100) */
  before_score?: number;
  /** ATS match percentage after optimization (0-100) */
  after_score?: number;
  saved: boolean;
  status: string;
}

export interface OptimizeApiResponse {
  type: string;
  success: boolean;
  message: string;
  data: OptimizeResponse;
}

/**
 * Optimize CV for ATS and return structured analysis + Typst content.
 * Saves optimized files to disk but does NOT generate PDF.
 * If cvJson is omitted, the server loads CV data from the profile directory.
 */
export async function optimizeCV(
  profile: string,
  jobUrl: string,
  language: string = 'en',
  template: string = 'default',
  cvJson?: string,
  jobDescription?: string,
): Promise<OptimizeApiResponse> {
  return apiRequest('/optimize', {
    method: 'POST',
    body: {
      profile,
      job_url: jobUrl,
      lang: language,
      template,
      ...(cvJson !== undefined ? { cv_json: cvJson } : {}),
      ...(jobDescription ? { job_description: jobDescription } : {}),
    },
    requireAuth: true,
  });
}

/**
 * Optimize CV for ATS **and** immediately compile + download the PDF.
 * Returns the PDF metadata and download URL.
 * If cvJson is omitted, the server loads CV data from the profile directory.
 */
export async function optimizeAndGenerate(
  profile: string,
  jobUrl: string,
  language: string = 'en',
  template: string = 'default',
  cvJson?: string,
  jobDescription?: string,
): Promise<Blob> {
  return apiRequest<Blob>('/optimize-and-generate', {
    method: 'POST',
    body: {
      profile,
      job_url: jobUrl,
      lang: language,
      template,
      ...(cvJson !== undefined ? { cv_json: cvJson } : {}),
      ...(jobDescription ? { job_description: jobDescription } : {}),
    },
    requireAuth: true,
  });
}

/**
 * Save an optimized CV under a new profile name.
 * Pass the `optimized_cv_json` string returned by optimizeCV().
 */
export async function saveOptimizedProfile(
  profileName: string,
  cvJson: string,
  language: string = 'en',
): Promise<{ success: boolean; message: string }> {
  return apiRequest('/save-optimized', {
    method: 'POST',
    body: {
      profile_name: profileName,
      cv_json: cvJson,
      lang: language,
    },
    requireAuth: true,
  });
}

// ── Cover Letter ──────────────────────────────────────────────────────────────

export interface CoverLetterApiResponse {
  success: boolean;
  message: string;
  data: {
    cover_letter: string;
    lang: string;
    profile: string;
  };
}

/**
 * Generate a cover letter tailored to a job description using the profile's CV data.
 * Costs 20 credits.
 */
export async function generateCoverLetter(
  profile: string,
  jobDescription: string,
  lang: string = 'en',
): Promise<CoverLetterApiResponse> {
  return apiRequest('/cover-letter', {
    method: 'POST',
    body: { profile, job_description: jobDescription, lang },
    requireAuth: true,
  });
}

/**
 * Export a cover letter as a .docx file.
 * Returns a Blob that can be used to trigger a browser download.
 */
export async function exportCoverLetterDocx(
  coverLetter: string,
  name: string,
  lang: string,
): Promise<Blob> {
  const token = await getAuthToken();
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/cover-letter/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ cover_letter: coverLetter, name, lang }),
  });
  if (!response.ok) {
    throw new Error(`Export failed: ${response.statusText}`);
  }
  return response.blob();
}

export async function renameCollaborator(oldName: string, newName: string): Promise<unknown> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Authentication required');
  }

  const token = await user.getIdToken();

  const response = await fetch(`${getApiUrl()}/profiles/${encodeURIComponent(oldName)}/rename`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      conversation_id: null, // or omit if optional
      new_name: newName
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));

    if (response.status === 401) {
      throw new Error('Authentication failed: Session expired or invalid token');
    } else if (response.status === 409) {
      throw new Error('Collaborator name already exists');
    } else if (response.status === 404) {
      throw new Error('Collaborator not found');
    } else if (response.status === 400) {
      throw new Error(errorData.error || 'Invalid profile name format');
    }

    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

// ── Business Developer API ────────────────────────────────────────────────────

export interface BdInfo {
  email: string;
  name: string;
  referral_code: string;
  commission_rate: number;
  referral_url: string;
  customer_count: number;
  estimated_revenue_usd: number;
  created_at: string;
}

export interface CustomerRow {
  tenant_name: string;
  email: string | null;
  joined_at: string;
}

export async function bdRegister(name: string): Promise<{ success: boolean; data: BdInfo }> {
  return apiRequest('/bd/register', {
    method: 'POST',
    body: { name },
    requireAuth: true,
  });
}

export async function bdGetMe(): Promise<{ success: boolean; data: BdInfo }> {
  return apiRequest('/bd/me', { requireAuth: true });
}

export async function bdGetCustomers(): Promise<{ success: boolean; customers: CustomerRow[] }> {
  return apiRequest('/bd/customers', { requireAuth: true });
}

export async function bdAttachRef(code: string): Promise<{ success: boolean }> {
  return apiRequest('/bd/attach-ref', {
    method: 'POST',
    body: { code },
    requireAuth: true,
  });
}

export interface CommissionRow {
  customer_email: string;
  amount_dollars: number;
  commission_dollars: number;
  status: 'pending' | 'paid';
  created_at: string;
  paid_at: string | null;
}

export async function bdGetCommissions(): Promise<{
  success: boolean;
  pending_dollars: number;
  paid_dollars: number;
  commissions: CommissionRow[];
}> {
  return apiRequest('/bd/commissions', { requireAuth: true });
}

// ── Preferences ─────────────────────────────────────────────────────────────

export interface EmailPreferences {
  cv_ready?: boolean;
  portfolio_ready?: boolean;
  cover_letter_ready?: boolean;
  cv_imported?: boolean;
  translation_ready?: boolean;
  ats_results?: boolean;
  nudge?: boolean;
  win_back?: boolean;
  new_template?: boolean;
}

export interface UserPreferences {
  email_prefs: EmailPreferences;
  preferred_lang: string;
}

export async function getPreferences(): Promise<UserPreferences> {
  return apiRequest('/preferences', { requireAuth: true });
}

export async function updatePreferences(prefs: Partial<UserPreferences>): Promise<{ success: boolean }> {
  return apiRequest('/preferences', {
    method: 'PUT',
    body: prefs,
    requireAuth: true,
  });
}

// ── Feedback ──────────────────────────────────────────────────────────────────

export async function checkFeedbackEligible(): Promise<{ eligible: boolean }> {
  return apiRequest('/feedback/eligible', { requireAuth: true });
}

export async function submitFeedback(data: {
  score: number;
  reason: string;
  contact_ok: boolean;
}): Promise<{ success: boolean; message: string; credits_granted: number }> {
  return apiRequest('/feedback', {
    method: 'POST',
    body: data,
    requireAuth: true,
  });
}

export interface FeedbackRow {
  id: number;
  email: string;
  score: number;
  reason: string;
  contact_ok: boolean;
  credits_granted: boolean;
  created_at: string;
}

export async function adminGetFeedbacks(): Promise<{ success: boolean; feedbacks: FeedbackRow[] }> {
  return apiRequest('/admin/feedbacks', { requireAuth: true });
}
