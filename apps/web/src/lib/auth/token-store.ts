// In-memory access token — never persisted to localStorage/sessionStorage.
// BroadcastChannel keeps multiple tabs in sync so only one tab refreshes.

let _accessToken: string | null = null;
let _expiresAt: number | null = null;

const channel = typeof window !== 'undefined' ? new BroadcastChannel('sneakereco-auth') : null;

type AuthMessage = { type: 'set'; accessToken: string; expiresAt: number } | { type: 'clear' };

export function setTokens(accessToken: string, expiresInSeconds: number): void {
  _accessToken = accessToken;
  _expiresAt = Date.now() + expiresInSeconds * 1000;
  channel?.postMessage({ type: 'set', accessToken, expiresAt: _expiresAt } satisfies AuthMessage);
}

export function clearTokens(): void {
  _accessToken = null;
  _expiresAt = null;
  channel?.postMessage({ type: 'clear' } satisfies AuthMessage);
}

/** Returns the stored access token, or null if absent or expiring within 30 s. */
export function getStoredToken(): string | null {
  if (!_accessToken || !_expiresAt) {
    return null;
  }
  if (Date.now() >= _expiresAt - 30_000) {
    return null;
  }
  return _accessToken;
}

/** Subscribe to token changes from other tabs. Returns an unsubscribe fn. */
export function subscribeToAuthChanges(callback: (token: string | null) => void): () => void {
  if (!channel) {
    return () => {};
  }

  const handler = (e: MessageEvent<AuthMessage>) => {
    if (e.data.type === 'set') {
      callback(e.data.accessToken);
    }
    if (e.data.type === 'clear') {
      callback(null);
    }
  };

  channel.addEventListener('message', handler);
  return () => channel.removeEventListener('message', handler);
}
