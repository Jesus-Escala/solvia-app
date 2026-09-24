import { WhatsAppIcon } from '../brand/WhatsAppIcon';
import { Check, Copy, KeyRound } from 'lucide-react';
import { useState } from 'react';
import { useUiI18n } from '../i18n/context';
import { Button } from './Button';
import { Modal } from './Modal';

/**
 * Shows a newly generated temporary password exactly once, with copy and "send via WhatsApp"
 * shortcuts. The user must change it at first sign-in.
 */
export function TemporaryPasswordDialog({
  credentials,
  appUrl,
  onClose,
}: {
  /** `null` keeps the dialog closed. */
  credentials: { name: string; email: string; password: string } | null;
  /** Sign-in URL included in the WhatsApp message. */
  appUrl: string;
  onClose: () => void;
}) {
  const { t } = useUiI18n();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!credentials) return;
    try {
      await navigator.clipboard.writeText(credentials.password);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (insecure context): the password is still visible to copy by hand.
    }
  };

  const whatsappText = credentials
    ? t('tempPassword.message', {
        name: credentials.name,
        email: credentials.email,
        password: credentials.password,
        url: appUrl,
      })
    : '';

  return (
    <Modal
      open={credentials !== null}
      size="sm"
      title={t('tempPassword.title')}
      onClose={onClose}
      footer={<Button onClick={onClose}>{t('tempPassword.done')}</Button>}
    >
      {credentials && (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {t('tempPassword.intro', { name: credentials.name })}
          </p>
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary-soft/60 p-3">
            <KeyRound className="h-5 w-5 shrink-0 text-primary-ink" />
            <code className="min-w-0 flex-1 truncate font-mono text-lg font-semibold tracking-wider text-ink select-all">
              {credentials.password}
            </code>
            <Button
              size="sm"
              variant="secondary"
              icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              onClick={() => void copy()}
            >
              {copied ? t('tempPassword.copied') : t('tempPassword.copy')}
            </Button>
          </div>
          <p className="truncate text-xs text-subtle">{credentials.email}</p>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary-ink hover:underline"
          >
            <WhatsAppIcon />
            {t('tempPassword.whatsapp')}
          </a>
        </div>
      )}
    </Modal>
  );
}
