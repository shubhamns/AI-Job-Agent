const ACCESS_TOKEN_KEY = "accesstoken";
const REFRESH_TOKEN_KEY = "refreshtoken";
const LEGACY_TOKEN_KEY = "jobpilot_token";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function readCookie(key: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(key: string, value: string, maxAge: number) {
  document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function deleteCookie(key: string) {
  document.cookie = `${key}=; path=/; max-age=0; SameSite=Lax`;
}

export function getAccessToken(): string | null {
  return readCookie(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return readCookie(REFRESH_TOKEN_KEY);
}

function setAccessToken(token: string) {
  writeCookie(ACCESS_TOKEN_KEY, token, MAX_AGE_SECONDS);
}

function setRefreshToken(token: string) {
  writeCookie(REFRESH_TOKEN_KEY, token, REFRESH_MAX_AGE_SECONDS);
}

export function setTokens(accessToken: string, refreshToken: string) {
  setAccessToken(accessToken);
  setRefreshToken(refreshToken);
}

export function clearTokens() {
  deleteCookie(ACCESS_TOKEN_KEY);
  deleteCookie(REFRESH_TOKEN_KEY);
  deleteCookie(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}
