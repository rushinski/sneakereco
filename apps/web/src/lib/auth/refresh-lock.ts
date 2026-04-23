// Ensures only one token refresh runs at a time.
// Concurrent callers wait on the same promise instead of all hitting /auth/refresh.

let _refreshPromise: Promise<string> | null = null;

export async function withRefreshLock(
  doRefresh: () => Promise<string>,
): Promise<string> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = doRefresh().finally(() => {
    _refreshPromise = null;
  });

  return _refreshPromise;
}
