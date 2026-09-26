import { useFeedback } from '@/ui';
import { useStoreMapImage } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import { preparePlanImage } from '../../lib/planImage';

export const PLAN_IMAGE_TYPES = 'image/jpeg,image/png,image/webp';

/** Uploads a plan's picture from a chosen file, with a toast while it goes. */
export function useUploadPlanImage() {
  const { t } = useI18n();
  const { toast } = useFeedback();
  const image = useStoreMapImage();
  const upload = async (mapId: string, file: File) => {
    let prepared: { file: Blob; aspect: number };
    try {
      prepared = await preparePlanImage(file);
    } catch {
      toast.warning(t('locations.imageInvalid'));
      return false;
    }
    const id = toast.loading(t('locations.uploading'));
    try {
      await image.mutateAsync({ id: mapId, ...prepared });
      toast.update(id, { tone: 'success', title: t('locations.imageUploaded') });
      return true;
    } catch (error) {
      toast.dismiss(id);
      toast.apiError(error);
      return false;
    }
  };
  return { upload, pending: image.isPending };
}
