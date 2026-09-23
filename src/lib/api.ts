import { createApiClient } from '@/ui';
import { tokenStorage } from '../auth/tokenStorage';

export { ApiError, errorMessage } from '@/ui';

/** API client of the business app (tenant session, refreshed through `/auth/refresh`). */
export const api = createApiClient({ tokens: tokenStorage, refreshPath: '/auth/refresh' });

/** Registers the callback run when the session cannot be refreshed (logs the user out). */
export const setUnauthorizedHandler = api.setUnauthorizedHandler;
