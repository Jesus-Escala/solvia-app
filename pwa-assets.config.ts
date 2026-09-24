import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

/**
 * Generates the PWA icons from the Bowl logo: `npx pwa-assets-generator` (from this folder).
 * Maskable and Apple icons get the brand teal behind the rounded tile instead of white.
 */
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#0d9488' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#0d9488' } },
  },
  images: ['public/favicon.svg'],
});
