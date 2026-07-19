export const normalizeAdminUserProfile = (user, fallbackEmail = '') => {
  if (!user || typeof user !== 'object') {
    return null;
  }

  const email = user.email || user.username || user.full_name || fallbackEmail || '';
  const username = user.username || user.email || fallbackEmail || '';

  return {
    ...user,
    id: user.id ?? null,
    email,
    username,
    name: user.full_name || user.name || username,
    role: user.role || 'admin',
    status: user.status || (user.is_active === false ? 'disabled' : 'active'),
    company_code: user.company_code || user.companyCode || null
  };
};

export const buildFallbackAdminProfile = (sessionUser, fallbackEmail = '') => {
  const email = sessionUser?.email || fallbackEmail || '';
  const fullName = sessionUser?.user_metadata?.full_name || sessionUser?.user_metadata?.name || email;

  return {
    id: sessionUser?.id ?? null,
    email,
    username: email,
    name: fullName,
    role: 'super_admin',
    status: 'active',
    company_code: null
  };
};

export const getAdminUserLookupValue = (emailOrUsername) => {
  const value = String(emailOrUsername || '').trim();
  return value || '';
};
