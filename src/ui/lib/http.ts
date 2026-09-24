const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Field-level validation messages, keyed by field path. */
  get fieldErrors(): Record<string, string> {
    if (!Array.isArray(this.details)) return {};
    return Object.fromEntries(
      (this.details as Array<{ path?: string; message?: string }>)
        .filter((item) => item.path && item.message)
        .map((item) => [item.path as string, item.message as string]),
    );
  }
}

export type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Query;
  /** Return the raw response body as a Blob (e.g. PDFs). */
  blob?: boolean;
  auth?: boolean;
  /** Cancels the request (e.g. a search superseded by the next keystroke). */
  signal?: AbortSignal;
}

/** Where a client keeps its session tokens (each app uses its own storage keys). */
export interface TokenStore {
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  setTokens(accessToken: string, refreshToken: string): void;
}

export function buildUrl(path: string, query?: Query) {
  const url = `${API_URL}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${url}?${search}` : url;
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as {
      error?: { code: string; message: string; details?: unknown };
    };
    if (body.error) {
      return new ApiError(response.status, body.error.code, body.error.message, body.error.details);
    }
  } catch {
    // Non-JSON error body.
  }
  return new ApiError(response.status, 'HTTP_ERROR', response.statusText || 'Request failed');
}

/**
 * Creates a JSON API client with bearer auth and transparent token refresh.
 *
 * @param tokens       token storage of the app
 * @param refreshPath  endpoint that exchanges a refresh token, e.g. `/auth/refresh`
 */
export function createApiClient({
  tokens,
  refreshPath,
}: {
  tokens: TokenStore;
  refreshPath: string;
}) {
  let onUnauthorized: (() => void) | null = null;
  let refreshPromise: Promise<boolean> | null = null;

  async function refreshTokens(): Promise<boolean> {
    const refreshToken = tokens.getRefreshToken();
    if (!refreshToken) return false;
    // Share one in-flight refresh between concurrent requests.
    refreshPromise ??= fetch(buildUrl(refreshPath), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (response) => {
        if (!response.ok) return false;
        const pair = (await response.json()) as { accessToken: string; refreshToken: string };
        tokens.setTokens(pair.accessToken, pair.refreshToken);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
    return refreshPromise;
  }

  async function request<T>(path: string, options: RequestOptions = {}, retry = true): Promise<T> {
    const { method = 'GET', body, query, blob = false, auth = true, signal } = options;
    // The interface language (set on <html lang> by the I18nProvider): the API writes statements
    // and WhatsApp messages in it.
    const headers: Record<string, string> = {
      'Accept-Language': document.documentElement.lang || navigator.language,
    };
    const token = tokens.getAccessToken();
    if (auth && token) headers.Authorization = `Bearer ${token}`;

    let payload: BodyInit | undefined;
    if (body instanceof FormData) {
      payload = body;
    } else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    let response: Response;
    try {
      response = await fetch(buildUrl(path, query), { method, headers, body: payload, signal });
    } catch (error) {
      // A cancelled request is not a network problem: let the caller (TanStack Query) see it.
      if (signal?.aborted) throw error;
      throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection.');
    }

    if (response.status === 401 && auth && retry) {
      if (await refreshTokens()) {
        return request<T>(path, options, false);
      }
      onUnauthorized?.();
    }

    if (!response.ok) {
      throw await toApiError(response);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (blob ? await response.blob() : await response.json()) as T;
  }

  return {
    get: <T>(path: string, query?: Query, options?: { signal?: AbortSignal }) =>
      request<T>(path, { query, signal: options?.signal }),
    post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
    put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
    patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
    delete: <T = void>(path: string) => request<T>(path, { method: 'DELETE' }),
    blob: (path: string) => request<Blob>(path, { blob: true }),
    public: {
      get: <T>(path: string) => request<T>(path, { auth: false }),
      post: <T>(path: string, body?: unknown) =>
        request<T>(path, { method: 'POST', body, auth: false }),
    },
    /** Registers the callback run when the session cannot be refreshed (logs the user out). */
    setUnauthorizedHandler(handler: () => void) {
      onUnauthorized = handler;
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

/** Human readable message for any thrown value. */
export function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

/** Small localStorage-backed token store; `prefix` keeps each app's session separate. */
export function createTokenStore<U>(prefix: string) {
  const keys = {
    access: `${prefix}.accessToken`,
    refresh: `${prefix}.refreshToken`,
    user: `${prefix}.user`,
  };
  const read = (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };
  const write = (key: string, value: string | null) => {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      // Storage unavailable (private mode): the session lasts only for this page load.
    }
  };
  return {
    getAccessToken: () => read(keys.access),
    getRefreshToken: () => read(keys.refresh),
    setTokens(accessToken: string, refreshToken: string) {
      write(keys.access, accessToken);
      write(keys.refresh, refreshToken);
    },
    getUser(): U | null {
      const raw = read(keys.user);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as U;
      } catch {
        return null;
      }
    },
    setUser: (user: U) => write(keys.user, JSON.stringify(user)),
    clear() {
      write(keys.access, null);
      write(keys.refresh, null);
      write(keys.user, null);
    },
  };
}
