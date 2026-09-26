import { useState } from 'react';
import { Modal, Skeleton } from '@/ui';
import { useStoreMaps } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import { MapStage, type MapView } from './MapStage';

/**
 * Where a product is: its plan with the spot marked (3D by default), to find it on the spot.
 * `target` null: closed.
 */
export function SpotMapModal({
  target,
  onClose,
}: {
  target: { mapId: string; spotId: string; title: string } | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <Modal
      open={target !== null}
      title={target?.title ?? ''}
      onClose={onClose}
      closeLabel={t('common.close')}
      size="lg"
    >
      {target && <SpotMap mapId={target.mapId} spotId={target.spotId} />}
    </Modal>
  );
}

function SpotMap({ mapId, spotId }: { mapId: string; spotId: string }) {
  const maps = useStoreMaps();
  const [view, setView] = useState<MapView>('3d');
  const [focus] = useState(() => ({ id: spotId, at: Date.now() }));
  const map = maps.data?.find((item) => item.id === mapId) ?? null;
  if (!map) return <Skeleton className="h-[55dvh] rounded-2xl" />;
  return (
    <MapStage
      className="h-[55dvh] border border-line"
      map={map}
      view={view}
      onViewChange={setView}
      selectedId={spotId}
      highlight={new Set([spotId])}
      focus={focus}
      onSelect={() => null}
    />
  );
}
