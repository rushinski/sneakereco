'use client';

declare global {
  interface Window {
    __SNEAKERECO_ACCESS_TOKEN__?: string;
    __SNEAKERECO_PRINCIPAL__?: unknown;
  }
}

export function setClientSession(accessToken: string, principal: unknown) {
  window.__SNEAKERECO_ACCESS_TOKEN__ = accessToken;
  window.__SNEAKERECO_PRINCIPAL__ = principal;
}

export function clearClientSession() {
  delete window.__SNEAKERECO_ACCESS_TOKEN__;
  delete window.__SNEAKERECO_PRINCIPAL__;
}