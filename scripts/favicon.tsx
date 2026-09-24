/**
 * Writes public/favicon.svg from the <LogoMark> component, so the favicon and PWA icons
 * (`npm run icons` builds the PNGs from it) always show the same Bowl as the app.
 *
 *   npm run favicon && npm run icons
 */
import { writeFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { LogoMark } from '../src/ui/brand/Logo';

let markup = renderToStaticMarkup(<LogoMark size={64} />)
  // Size and a11y attributes only on the root element: inner shapes keep theirs.
  .replace(/^<svg[^>]*>/, (root) =>
    root
      .replace(/ (width|height|class|aria-hidden)="[^"]*"/g, '')
      .replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'),
  )
  .replace(/ class="[^"]*"/g, '');

// Short, file-safe gradient ids instead of React's generated ones.
const ids = [...new Set([...markup.matchAll(/id="([^"]+)"/g)].map((match) => match[1]!))];
ids.forEach((id, index) => {
  markup = markup.split(`"${id}"`).join(`"s${index}"`).split(`#${id})`).join(`#s${index})`);
});

writeFileSync('public/favicon.svg', `${markup}\n`);
console.log(`public/favicon.svg written (${markup.length} bytes)`);
