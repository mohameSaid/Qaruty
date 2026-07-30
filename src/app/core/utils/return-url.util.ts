const LOGIN_PATH = '/login';

/**
 * Validates and normalizes a `returnUrl` query param.
 *
 * Rejects anything that isn't a safe, internal, relative path: absolute/
 * protocol-relative URLs (open-redirect risk), the login page itself
 * (redirect loop), and nested/duplicated `returnUrl` params (e.g.
 * `/foo?returnUrl=/login?returnUrl=...`), which are stripped so only the
 * outermost target survives.
 *
 * Returns `null` when the value should be ignored in favor of a default route.
 */
export function sanitizeReturnUrl(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }

  let url = raw.trim();
  if (!url) {
    return null;
  }

  if (/^[a-z]+:\/\//i.test(url) || url.startsWith('//') || url.includes('\\')) {
    return null;
  }

  if (!url.startsWith('/')) {
    return null;
  }

  try {
    const parsed = new URL(url, 'http://internal');
    parsed.searchParams.delete('returnUrl');
    url = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }

  const pathOnly = url.split('?')[0].split('#')[0].toLowerCase();
  if (pathOnly === LOGIN_PATH || pathOnly.startsWith(`${LOGIN_PATH}/`)) {
    return null;
  }

  return url;
}
