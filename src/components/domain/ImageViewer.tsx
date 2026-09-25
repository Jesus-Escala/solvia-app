import { Modal } from '@/ui';
import { useI18n } from '../../i18n/I18nProvider';

/** A picture shown big, to see a product well (null: closed). */
export function ImageViewer({
  image,
  onClose,
}: {
  image: { url: string; title: string } | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <Modal
      open={image !== null}
      size="xl"
      flush
      title={image?.title ?? ''}
      onClose={onClose}
      closeLabel={t('common.close')}
    >
      {image && (
        <div className="flex items-center justify-center bg-surface-2 p-4 sm:p-6">
          <img
            src={image.url}
            alt={image.title}
            className="max-h-[calc(100dvh-10rem)] w-auto max-w-full rounded-xl object-contain shadow-card"
          />
        </div>
      )}
    </Modal>
  );
}
