const getSupabaseBaseUrl = () => (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');

export const resolveProductImageUrl = (productOrValue) => {
  const rawValue = typeof productOrValue === 'object'
    ? productOrValue?.image_url || productOrValue?.picture || productOrValue?.imagename || productOrValue?.image
    : productOrValue;
  const imageValue = String(rawValue || '').trim();

  if (!imageValue) return null;
  if (/^(https?:|data:|blob:)/i.test(imageValue)) return imageValue;

  const encodedPath = imageValue.split('/').map((part) => encodeURIComponent(part)).join('/');
  const baseUrl = getSupabaseBaseUrl();
  return baseUrl ? `${baseUrl}/storage/v1/object/public/products/${encodedPath}` : imageValue;
};