'use client';

let csrfTokenPromise: Promise<string> | null = null;

export async function getCsrfToken() {
  if (!csrfTokenPromise) {
    csrfTokenPromise = fetch('/api/auth/csrf', {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as { csrfToken?: string };
        if (!response.ok || typeof payload.csrfToken !== 'string') {
          throw new Error('Failed to initialize CSRF protection');
        }

        return payload.csrfToken;
      })
      .catch((error) => {
        csrfTokenPromise = null;
        throw error;
      });
  }

  return csrfTokenPromise;
}