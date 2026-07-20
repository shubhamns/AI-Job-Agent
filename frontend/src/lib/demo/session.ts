const DEMO_SESSION_KEY = "demo_session";

export function isDemoSession(): boolean {
  return localStorage.getItem(DEMO_SESSION_KEY) === "true";
}

export function startDemoSession(): void {
  localStorage.setItem(DEMO_SESSION_KEY, "true");
}

export function clearDemoSession(): void {
  localStorage.removeItem(DEMO_SESSION_KEY);
}
