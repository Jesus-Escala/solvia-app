import { Camera, CheckCircle2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Modal, Spinner } from '@/ui';
import { useI18n } from '../../i18n/I18nProvider';

type ScannerState = 'starting' | 'scanning' | 'denied' | 'noCamera' | 'insecure' | 'failed';

/** The same code read again within this time is the same scan (the camera sees it many times). */
const REPEAT_MS = 1800;

/** A short beep and a vibration: the scan was read (as a supermarket scanner does). */
function signal() {
  try {
    navigator.vibrate?.(40);
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const context = new AudioCtx();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 1320;
    gain.gain.value = 0.08;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.09);
    oscillator.onended = () => void context.close();
  } catch {
    // No sound: the code is still used.
  }
}

/**
 * Reads the products' QR codes and barcodes (EAN, UPC, Code 128) with the device camera, the back
 * one on phones. Several products can be scanned one after another; each code is handed to
 * `onCode` once. The library loads only when the scanner opens.
 */
export function CameraScanner({
  open,
  onClose,
  onCode,
}: {
  open: boolean;
  onClose: () => void;
  onCode: (code: string) => void;
}) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      title={t('scanner.title')}
      description={t('scanner.hint')}
      onClose={onClose}
      closeLabel={t('common.close')}
    >
      {open && <Scanner onCode={onCode} onClose={onClose} />}
    </Modal>
  );
}

function Scanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const { t } = useI18n();
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<ScannerState>(() =>
    window.isSecureContext && navigator.mediaDevices ? 'starting' : 'insecure',
  );
  const [last, setLast] = useState<string | null>(null);
  const latest = useRef(onCode);
  useEffect(() => {
    latest.current = onCode;
  });

  useEffect(() => {
    if (state === 'insecure' || !video.current) return;
    let cancelled = false;
    let stop: (() => void) | null = null;
    const seen = new Map<string, number>();
    void (async () => {
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all(
          [import('@zxing/browser'), import('@zxing/library')],
        );
        const hints = new Map([
          [
            DecodeHintType.POSSIBLE_FORMATS,
            [
              BarcodeFormat.QR_CODE,
              BarcodeFormat.EAN_13,
              BarcodeFormat.EAN_8,
              BarcodeFormat.UPC_A,
              BarcodeFormat.UPC_E,
              BarcodeFormat.CODE_128,
            ],
          ],
        ]);
        const reader = new BrowserMultiFormatReader(hints);
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } } },
          video.current!,
          (result) => {
            if (!result) return;
            const code = result.getText().trim();
            const now = Date.now();
            if (code === '' || now - (seen.get(code) ?? 0) < REPEAT_MS) return;
            seen.set(code, now);
            signal();
            setLast(code);
            latest.current(code);
          },
        );
        if (cancelled) controls.stop();
        else {
          stop = () => controls.stop();
          setState('scanning');
        }
      } catch (error) {
        if (cancelled) return;
        const name = error instanceof DOMException ? error.name : '';
        setState(
          name === 'NotAllowedError' || name === 'SecurityError'
            ? 'denied'
            : name === 'NotFoundError' || name === 'OverconstrainedError'
              ? 'noCamera'
              : 'failed',
        );
      }
    })();
    return () => {
      cancelled = true;
      stop?.();
    };
    // Starts once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const problem =
    state === 'denied' || state === 'noCamera' || state === 'insecure' || state === 'failed';

  return (
    <div className="space-y-4">
      {problem ? (
        <Alert tone="warning">{t(`scanner.errors.${state}`)}</Alert>
      ) : (
        <div className="relative overflow-hidden rounded-2xl bg-ink">
          <video
            ref={video}
            className="aspect-[4/3] w-full object-cover"
            muted
            playsInline
            autoPlay
          />
          {/* Where to point: a frame in the middle. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-[18%] rounded-2xl border-4 border-surface/85 shadow-[0_0_0_9999px_rgb(0_0_0/0.35)]"
          />
          {state === 'starting' && (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-surface">
              <Spinner />
              {t('scanner.starting')}
            </span>
          )}
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted">
          {last ? (
            <>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
              <span className="truncate">{t('scanner.read', { code: last })}</span>
            </>
          ) : (
            !problem && (
              <>
                <Camera className="h-4 w-4 shrink-0" />
                {t('scanner.waiting')}
              </>
            )
          )}
        </p>
        <Button onClick={onClose}>{t('scanner.done')}</Button>
      </div>
    </div>
  );
}
