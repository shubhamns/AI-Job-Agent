import { clearTokens, getAccessToken, getRefreshToken } from "./cookies";
import { isDemoSession, clearDemoSession } from "./demo/session";

export function hasSession(): boolean {
  return isDemoSession() || Boolean(getAccessToken() || getRefreshToken());
}

export function clearSession(): void {
  clearTokens();
  clearDemoSession();
}

export { isDemoSession } from "./demo/session";
