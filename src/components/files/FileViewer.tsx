import { Download, FileSpreadsheet, FileText, Minus, Plus, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, IconButton, Modal, Spinner, useFeedback, type DownloadedFile } from '@/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { PdfPages } from './PdfPages';
import { SheetGrid } from './SheetGrid';

export type ViewerKind = 'pdf' | 'xlsx';

export interface ViewerRequest {
  kind: ViewerKind;
  title: string;
  /** Fetches the file; called each time the viewer opens. */
  load: () => Promise<DownloadedFile>;
  /** Used when the server sends no file name. */
  fileName: string;
}

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function saveFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: fileName });
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Shows a PDF or an Excel file inside the page (nothing opens in another tab), with a button to
 * download it. `request` null = closed.
 */
export function FileViewer({
  request,
  onClose,
}: {
  request: ViewerRequest | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { toast } = useFeedback();
  const [file, setFile] = useState<DownloadedFile | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(2);
  const [current, setCurrent] = useState<ViewerRequest | null>(request);

  // A new request starts from a clean state (no leftovers of the previous file).
  if (request !== current) {
    setCurrent(request);
    setFile(null);
    setFailed(false);
    setZoomIndex(2);
  }

  useEffect(() => {
    if (!request) return;
    let cancelled = false;
    request
      .load()
      .then((result) => {
        if (!cancelled) setFile(result);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        toast.apiError(error);
        onClose();
      });
    return () => {
      cancelled = true;
    };
  }, [request, toast, onClose]);

  const onPreviewError = useCallback((error: unknown) => {
    console.warn('Could not preview the file', error);
    setFailed(true);
  }, []);

  const kind = request?.kind ?? current?.kind ?? 'pdf';
  const name = file?.fileName ?? request?.fileName ?? '';

  return (
    <Modal
      open={request !== null}
      onClose={onClose}
      size="full"
      flush
      closeLabel={t('common.close')}
      title={
        <span className="inline-flex min-w-0 items-center gap-2">
          {kind === 'pdf' ? (
            <FileText className="h-5 w-5 shrink-0 text-danger-ink" />
          ) : (
            <FileSpreadsheet className="h-5 w-5 shrink-0 text-success-ink" />
          )}
          <span className="truncate">{request?.title ?? current?.title}</span>
        </span>
      }
      description={name}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          {kind === 'pdf' ? (
            <div className="flex items-center gap-1">
              <IconButton
                label={t('viewer.zoomOut')}
                variant="secondary"
                disabled={zoomIndex === 0}
                onClick={() => setZoomIndex((index) => Math.max(0, index - 1))}
              >
                <Minus className="h-4 w-4" />
              </IconButton>
              <button
                type="button"
                onClick={() => setZoomIndex(2)}
                title={t('viewer.fit')}
                className="inline-flex h-9 min-w-16 items-center justify-center gap-1 rounded-lg px-2 text-sm text-muted tabular-nums hover:bg-surface-3"
              >
                {zoomIndex !== 2 && <RotateCcw className="h-3.5 w-3.5" />}
                {Math.round(ZOOMS[zoomIndex]! * 100)}%
              </button>
              <IconButton
                label={t('viewer.zoomIn')}
                variant="secondary"
                disabled={zoomIndex === ZOOMS.length - 1}
                onClick={() => setZoomIndex((index) => Math.min(ZOOMS.length - 1, index + 1))}
              >
                <Plus className="h-4 w-4" />
              </IconButton>
            </div>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              {t('common.close')}
            </Button>
            <Button
              icon={<Download className="h-4 w-4" />}
              disabled={!file}
              onClick={() => file && saveFile(file.blob, name)}
            >
              {kind === 'pdf' ? t('viewer.downloadPdf') : t('viewer.downloadExcel')}
            </Button>
          </div>
        </div>
      }
    >
      {!file ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-sm text-muted">
          <Spinner />
          {t('viewer.preparing')}
        </div>
      ) : failed ? (
        <div className="p-5">
          <Alert tone="warning">{t('viewer.cannotPreview')}</Alert>
        </div>
      ) : kind === 'pdf' ? (
        <PdfPages blob={file.blob} zoom={ZOOMS[zoomIndex]!} onError={onPreviewError} />
      ) : (
        <SheetGrid blob={file.blob} onError={onPreviewError} />
      )}
    </Modal>
  );
}
