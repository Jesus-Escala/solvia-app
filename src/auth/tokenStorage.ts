import { createTokenStore } from '@/ui';
import type { SessionUser } from '../lib/types';

/** Session of the business app (tokens + cached user) in localStorage under `solvia.*`. */
export const tokenStorage = createTokenStore<SessionUser>('solvia');
