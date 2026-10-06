let applicationToken: string | null = null;

export function getAuthToken(): string | null {
  return applicationToken;
}

export function setAuthToken(token: string | null): void {
  applicationToken = token && token.trim() ? token : null;
}

export function clearAuthToken(): void {
  applicationToken = null;
}
