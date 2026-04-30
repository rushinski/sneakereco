'use client';

declare global {
  interface Window {
    __SNEAKERECO_PLATFORM_ACCESS_TOKEN__?: string;
    __SNEAKERECO_PLATFORM_PRINCIPAL__?: unknown;
  }
}

export function setClientSession(accessToken: string, principal: unknown) {
  window.__SNEAKERECO_PLATFORM_ACCESS_TOKEN__ = accessToken;
  window.__SNEAKERECO_PLATFORM_PRINCIPAL__ = principal;
}