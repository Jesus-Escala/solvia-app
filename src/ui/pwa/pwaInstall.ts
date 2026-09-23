import { useSyncExternalStore } from 'react';

/**
 * "Install as an app" state shared by the whole page (chip, menu items, guide dialog).
 *
 * Chrome/Edge/Android fire `beforeinstallprompt` once; each app's index.html captures it as early
 * as possible into `window.__pwaPrompt` (before React mounts), and this store keeps it afterwards.
 * Safari (iOS/macOS) has no prompt API, so the guide explains the manual steps instead.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    __pwaPrompt?: BeforeInstallPromptEvent | null;
  }
}

export type PwaPlatform = 'ios' | 'android' | 'safari-mac' | 'desktop' | 'other';

interface PwaState {
  /** The browser offered a native install prompt we can trigger. */
  canPrompt: boolean;
  /** Running as an installed app, or the user said they already installed it. */
  installed: boolean;
  guideOpen: boolean;
  platform: PwaPlatform;
}

const INSTALLED_KEY = 'solvia.pwa.installed';

function detectPlatform(): PwaPlatform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  const iPadOs = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  if (/iPad|iPhone|iPod/i.test(ua) || iPadOs) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/^((?!Chrome|Chromium|Edg|Android).)*Safari/i.test(ua) && /Mac/i.test(ua)) {
    return 'safari-mac';
  }
  if (/Chrome|Chromium|Edg/i.test(ua)) return 'desktop';
  return 'other';
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function readInstalledFlag() {
  try {
    // Older builds stored this permanently, which could hide the installer for good.
    localStorage.removeItem(INSTALLED_KEY);
    return sessionStorage.getItem(INSTALLED_KEY) === '1';
  } catch {
    return false;
  }
}

let state: PwaState = {
  canPrompt: typeof window !== 'undefined' && Boolean(window.__pwaPrompt),
  installed:
    typeof window !== 'undefined' && window.__pwaPrompt
      ? false
      : isStandalone() || readInstalledFlag(),
  guideOpen: false,
  platform: detectPlatform(),
};
const listeners = new Set<() => void>();

function setState(changes: Partial<PwaState>) {
  state = { ...state, ...changes };
  listeners.forEach((listener) => listener());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    window.__pwaPrompt = event as BeforeInstallPromptEvent;
    // The browser only offers the prompt when the app is NOT installed.
    setState({ canPrompt: true, installed: isStandalone() });
  });
  window.addEventListener('appinstalled', () => {
    window.__pwaPrompt = null;
    setState({ canPrompt: false, installed: true, guideOpen: false });
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Opens/closes the install guide and triggers the native prompt when available. */
export const pwaInstall = {
  openGuide: () => setState({ guideOpen: true }),
  closeGuide: () => setState({ guideOpen: false }),
  /** Shows the browser's native install dialog. Returns true when the user accepted. */
  async prompt(): Promise<boolean> {
    const event = window.__pwaPrompt;
    if (!event) return false;
    await event.prompt();
    const { outcome } = await event.userChoice;
    // A prompt can only be used once.
    window.__pwaPrompt = null;
    setState({
      canPrompt: false,
      ...(outcome === 'accepted' ? { installed: true, guideOpen: false } : {}),
    });
    return outcome === 'accepted';
  },
  /** "I already installed it": hide the install entry points for this browser session. */
  markInstalled() {
    try {
      sessionStorage.setItem(INSTALLED_KEY, '1');
    } catch {
      // Not persisted; hidden for this session only.
    }
    setState({ installed: true, guideOpen: false });
  },
};

export function usePwaInstall(): PwaState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

/** Whether to offer "Install as an app" in menus (hidden once installed). */
export function useCanOfferInstall() {
  return !usePwaInstall().installed;
}
