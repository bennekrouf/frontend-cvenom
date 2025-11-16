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

export interface FileTreeItem {
  type: 'file' | 'folder';
  size?: number;
  modified?: Date;
  children?: Record<string, FileTreeItem>;
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
    if (response.status === 401) {
      throw new Error('Authentication required or token expired');
    }
    throw new Error(`Upload failed: ${response.status}`);
  }

  return response.json();
}

export async function generateCV(
  personName: string,
  language: string,
  template: string = 'default'
): Promise<Blob> {
  return apiRequest('/generate', {
    method: 'POST',
    body: {
      profile: personName,
      lang: language,
      template: template
    },
    requireAuth: true
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

export async function healthCheck() {
  return apiRequest('/health', {
    method: 'GET',
    requireAuth: false
  });
}

export async function renameCollaborator(oldName: string, newName: string): Promise<unknown> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Authentication required');
  }

  const token = await user.getIdToken();

  const response = await fetch(`${getApiUrl()}/collaborators/${encodeURIComponent(oldName)}/rename`, {
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
