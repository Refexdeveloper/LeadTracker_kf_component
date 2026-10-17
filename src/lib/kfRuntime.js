const DEV_KISSFLOW_ORIGIN = 'https://development-refexgroup.kissflow.com';
const LIVE_KISSFLOW_ORIGIN = 'https://refexgroup.kissflow.com';

export function resolveKissflowOrigin() {
  const origin = typeof window !== 'undefined' && window?.location?.origin ? String(window.location.origin) : '';
  if (origin && origin.includes('kissflow.com')) return origin;

  const isDev =
    (typeof import.meta !== 'undefined' && import.meta?.env?.DEV) ||
    (typeof process !== 'undefined' && process?.env?.NODE_ENV === 'development');

  return isDev ? DEV_KISSFLOW_ORIGIN : LIVE_KISSFLOW_ORIGIN;
}

export function resolveKissflowAccountId(kfInstance, fallbackAccountId = '') {
  const sdkAccountId = String(kfInstance?.account?._id || '').trim();
  if (sdkAccountId) return sdkAccountId;

  const candidates = [];
  const safePush = (v) => {
    if (v) candidates.push(String(v));
  };

  safePush(typeof window !== 'undefined' ? window?.location?.href : '');
  safePush(typeof window !== 'undefined' ? window?.location?.pathname : '');
  safePush(typeof document !== 'undefined' ? document?.referrer : '');

  try {
    safePush(typeof window !== 'undefined' ? window?.top?.location?.href : '');
    safePush(typeof window !== 'undefined' ? window?.top?.location?.pathname : '');
    safePush(typeof window !== 'undefined' ? window?.parent?.location?.href : '');
    safePush(typeof window !== 'undefined' ? window?.parent?.location?.pathname : '');
  } catch {
    // Cross-origin/sandboxed frames: ignore.
  }

  const re = /\/(?:flow|case|metadata)\/2\/([^/]+)/i;
  for (const raw of candidates) {
    const match = raw.match(re);
    if (match?.[1]) return match[1];
  }

  return fallbackAccountId;
}

export async function kfGetJson(kfInstance, path, absoluteUrl) {
  if (kfInstance?.api) {
    const resp = await kfInstance.api(path, { method: 'GET', headers: { Accept: 'application/json' } });
    return resp?.data ?? resp ?? null;
  }

  const origin = resolveKissflowOrigin();
  const url = absoluteUrl || `${origin}${path}`;
  const res = await fetch(url, { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function parseKfApiError(data, status) {
  if (data?.status === 'error' || data?.error_code) {
    return data.en_message || data.message || 'Kissflow request failed';
  }
  if (status && status >= 400) {
    return data?.en_message || data?.message || `HTTP ${status}`;
  }
  return '';
}

export async function kfMutateJson(kfInstance, path, { method = 'POST', body } = {}) {
  const headers = { Accept: 'application/json' };
  let fetchBody;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    // Kissflow SDK + fetch both expect a JSON string (same as Postman raw body).
    fetchBody = typeof body === 'string' ? body : JSON.stringify(body);
  }

  if (kfInstance?.api) {
    const resp = await kfInstance.api(path, {
      method,
      headers,
      body: fetchBody,
    });
    const data = resp?.data ?? resp ?? null;
    const err = parseKfApiError(data);
    if (err) throw new Error(err);
    return data;
  }

  const origin = resolveKissflowOrigin();
  const res = await fetch(`${origin}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: fetchBody,
  });
  const data = await res.json().catch(() => ({}));
  const err = parseKfApiError(data, res.status);
  if (err) throw new Error(err);
  return data;
}

