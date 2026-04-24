export function normalizeHost(host: string): string {
  return host.split(':')[0]?.toLowerCase() ?? '';
}

export function isDedicatedStoreAdminHost(host: string): boolean {
  const normalizedHost = normalizeHost(host);
  return (
    normalizedHost.startsWith('admin.') &&
    !normalizedHost.endsWith('.sneakereco.com') &&
    !normalizedHost.endsWith('.sneakereco.test')
  );
}

export function getStoreAdminExternalPath(pathname: string, host: string): string {
  const normalizedPath = pathname === '' ? '/' : pathname;

  if (isDedicatedStoreAdminHost(host)) {
    if (normalizedPath === '/admin') {
      return '/';
    }

    return normalizedPath.startsWith('/admin/')
      ? normalizedPath.slice('/admin'.length)
      : normalizedPath;
  }

  if (normalizedPath === '/') {
    return '/admin';
  }

  return normalizedPath.startsWith('/admin')
    ? normalizedPath
    : `/admin${normalizedPath === '/' ? '' : normalizedPath}`;
}
