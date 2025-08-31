// src/lib/api.ts - Updated for tenant-specific file operations
import { auth } from './firebase';

export interface AuthError {
  code: string;
  message: string;
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

  // Make request
  const response = await fetch(`http://127.0.0.1:8000${endpoint}`, {
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
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required or token expired');
    }
    if (response.status === 403) {
      throw new Error('Access denied');
    }
    
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // Ignore JSON parse error, use default message
    }
    
    throw new Error(errorMessage);
  }

  return response.json();
}

// Tenant-specific file operations

export async function getTenantFileTree() {
  return apiRequest('/api/files/tree', {
    method: 'GET',
    requireAuth: true  // Now requires authentication for tenant isolation
  });
}

export async function getTenantFileContent(filePath: string): Promise<string> {
  return apiRequest(`/api/files/content?path=${encodeURIComponent(filePath)}`, {
    method: 'GET',
    requireAuth: true  // Now requires authentication for tenant isolation
  });
}

export async function saveTenantFileContent(filePath: string, content: string) {
  return apiRequest('/api/files/save', {
    method: 'POST',
    body: { path: filePath, content },
    requireAuth: true
  });
}

// Existing API functions
export async function createCollaborator(personName: string) {
  return apiRequest('/api/create', {
    method: 'POST',
    body: { person: personName },
    requireAuth: true
  });
}

export async function uploadPicture(personName: string, file: File) {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const formData = new FormData();
  formData.append('person', personName);
  formData.append('file', file);

  const response = await fetch('http://127.0.0.1:8000/api/upload-picture', {
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
  return apiRequest('/api/generate', {
    method: 'POST',
    body: { 
      person: personName, 
      lang: language,
      template: template
    },
    requireAuth: true
  });
}

export async function getTemplates() {
  return apiRequest('/api/templates', {
    method: 'GET',
    requireAuth: false  // This endpoint remains public
  });
}

export async function getCurrentUser() {
  return apiRequest('/api/me', {
    method: 'GET',
    requireAuth: true
  });
}

export async function healthCheck() {
  return apiRequest('/api/health', {
    method: 'GET',
    requireAuth: false
  });
}
