export const isSessionExpired = (session, now = Date.now() / 1000) => {
  if (!session) return true;
  if (typeof session.expires_at === 'number' && session.expires_at > 0) {
    return session.expires_at <= now;
  }
  return false;
};

export const hasValidStoredAuthState = (storedSession, storedUser) => {
  if (!storedSession || !storedUser) return false;
  if (!storedUser.id || !storedUser.email) return false;
  if (isSessionExpired(storedSession)) return false;
  return true;
};
