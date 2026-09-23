/** Public landing page (where people request access to Solvia). */
export const LANDING_URL = (
  (import.meta.env.VITE_LANDING_URL as string | undefined) ?? 'http://localhost:5174'
).replace(/\/$/, '');

/** Opens the landing's "request access" form directly. */
export const REQUEST_ACCESS_URL = `${LANDING_URL}/#solicitar-acceso`;

/** Sign-in page of this app, included in the "send via WhatsApp" message for new users. */
export const APP_LOGIN_URL = `${window.location.origin}/login`;
