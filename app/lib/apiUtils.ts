/**
 * Utility functions for making authenticated API requests
 */

/**
 * Get the authentication token from local storage
 * @returns The authentication token or null if not found
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('moxiphy_auth_token');
}

/**
 * Add authentication headers to fetch options
 * @param options Existing fetch options
 * @returns Updated fetch options with authentication headers
 */
export function withAuth(options: RequestInit = {}): RequestInit {
  const token = getAuthToken();
  
  if (!token) {
    return options;
  }
  
  return {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  };
}

/**
 * Make an authenticated API request
 * @param url The API endpoint URL
 * @param options Fetch options
 * @returns Promise resolving to the fetch response
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, withAuth(options));
}
