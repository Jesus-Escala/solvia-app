/** Escapes text for HTML built as a string (printed documents). */
export const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/**
 * Prints an HTML document through a hidden frame, so the page itself is not printed. Waits for
 * its pictures (QR codes) before opening the print dialog.
 */
export function printHtml(html: string) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, { position: 'fixed', width: '0', height: '0', border: '0' });
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  const view = frame.contentWindow;
  if (!doc || !view) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const pending = [...doc.images].filter((image) => !image.complete);
  let left = pending.length;
  const go = () => {
    view.focus();
    view.print();
    // Some browsers print asynchronously: keep the frame a moment before removing it.
    window.setTimeout(() => frame.remove(), 60_000);
  };
  if (left === 0) go();
  else
    pending.forEach((image) => {
      const done = () => {
        left -= 1;
        if (left === 0) go();
      };
      image.onload = done;
      image.onerror = done;
    });
}
