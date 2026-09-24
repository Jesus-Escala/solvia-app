import type { HtmlTagDescriptor, Plugin } from 'vite';

/** Latin, variable-weight files of the UI fonts: the only ones needed for the first paint. */
const FONT_FILES = [
  '@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2',
  '@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2',
];

const preload = (href: string): HtmlTagDescriptor => ({
  tag: 'link',
  attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href, crossorigin: '' },
  injectTo: 'head-prepend',
});

/**
 * Preloads the UI fonts from index.html so text is drawn with them from the start instead of
 * swapping (and jumping) once the CSS discovers them. Dev serves them from node_modules; the
 * build points at the hashed assets.
 */
export function preloadFonts(): Plugin {
  return {
    name: 'solvia:preload-fonts',
    transformIndexHtml: {
      order: 'post',
      handler(_html, context) {
        if (!context.bundle) return FONT_FILES.map((file) => preload(`/node_modules/${file}`));
        const names = FONT_FILES.map((file) => file.split('/').pop()!.replace('.woff2', ''));
        return Object.values(context.bundle)
          .filter(
            (asset) =>
              asset.type === 'asset' && names.some((name) => asset.fileName.includes(name)),
          )
          .map((asset) => preload(`/${asset.fileName}`));
      },
    },
  };
}
