import { useEffect, useRef, useState } from 'react';
import { Spinner } from '@/ui';

type PdfDocument = import('pdfjs-dist').PDFDocumentProxy;

/** Loads pdf.js (and its worker) only the first time a PDF is shown. */
async function loadPdfJs() {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs;
}

/**
 * Every page of a PDF drawn on canvases, as wide as the viewer (× `zoom`). Works the same on
 * phones, where browsers cannot show a PDF inside the page.
 */
export function PdfPages({
  blob,
  zoom,
  maxWidth = null,
  onError,
}: {
  blob: Blob;
  zoom: number;
  /** Width of a page at 100% for narrow documents (a ticket); null fills the viewer. */
  maxWidth?: number | null;
  onError: (error: unknown) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PdfDocument | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let task: { destroy: () => Promise<void> } | null = null;
    void (async () => {
      try {
        const pdfjs = await loadPdfJs();
        const loading = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
        task = loading;
        if (cancelled) {
          void loading.destroy();
          return;
        }
        const loaded = await loading.promise;
        if (!cancelled) setPdf(loaded);
      } catch (error) {
        if (!cancelled) onError(error);
      }
    })();
    return () => {
      cancelled = true;
      // Frees the document and its worker.
      void task?.destroy();
    };
  }, [blob, onError]);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={container} className="min-h-full bg-surface-3/60 p-3 sm:p-5">
      {!pdf || width === 0 ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          {Array.from({ length: pdf.numPages }, (_, index) => (
            <PdfPage
              key={index}
              pdf={pdf}
              number={index + 1}
              width={(maxWidth === null ? width : Math.min(width, maxWidth)) * zoom}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PdfPage({ pdf, number, width }: { pdf: PdfDocument; number: number; width: number }) {
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let task: { cancel: () => void } | null = null;
    void (async () => {
      try {
        const page = await pdf.getPage(number);
        if (cancelled || !holder.current) return;
        const base = page.getViewport({ scale: 1 });
        const ratio = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: (width / base.width) * ratio });
        // A fresh canvas per render: pdf.js refuses two renders on the same canvas, and a resize
        // cancels the previous one. It replaces the old canvas only once it is fully drawn.
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / ratio)}px`;
        canvas.style.height = `${Math.floor(viewport.height / ratio)}px`;
        canvas.className = 'block';
        // 'print' draws in one go instead of in animation frames, so a page also finishes while
        // the tab is in the background (our PDFs have no annotations, so it looks the same).
        const render = page.render({ canvas, viewport, intent: 'print' });
        task = render;
        await render.promise;
        if (!cancelled) holder.current?.replaceChildren(canvas);
      } catch (error) {
        if (!cancelled) console.warn('Could not draw the PDF page', error);
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [pdf, number, width]);

  return (
    <div
      ref={holder}
      className="max-w-none overflow-hidden rounded-sm bg-white shadow-card"
      style={{ width: Math.floor(width), minHeight: 120 }}
    />
  );
}
