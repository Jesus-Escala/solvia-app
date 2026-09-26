import { Check, ImagePlus } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import {
  Button,
  Field,
  Modal,
  cx,
  smallButtonClass,
  useErrorText,
  useErrorToast,
  useFeedback,
} from '@/ui';
import { useSaveSpot, useSaveStoreMap } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import type { MapSpot, SpotColor, StoreMap } from '../../lib/types';
import { SPOT_TONES } from './spotTones';
import { PLAN_IMAGE_TYPES, useUploadPlanImage } from './useUploadPlanImage';

const COLORS: SpotColor[] = ['primary', 'info', 'success', 'warning', 'danger', 'accent'];

/** Creates a plan (name and, optionally, its picture) or renames one. `map` undefined: closed. */
export function MapFormModal({
  map,
  onClose,
  onSaved,
}: {
  /** null: a new plan. */
  map: StoreMap | null | undefined;
  onClose: () => void;
  onSaved: (map: StoreMap) => void;
}) {
  const { t } = useI18n();
  return (
    <Modal
      open={map !== undefined}
      title={map ? t('locations.renameMap') : t('locations.newMap')}
      onClose={onClose}
      closeLabel={t('common.close')}
      size="sm"
    >
      {map !== undefined && (
        <MapForm
          key={map?.id ?? 'new'}
          map={map}
          onDone={(saved) => {
            onSaved(saved);
            onClose();
          }}
        />
      )}
    </Modal>
  );
}

function MapForm({ map, onDone }: { map: StoreMap | null; onDone: (map: StoreMap) => void }) {
  const { t } = useI18n();
  const errors = useErrorText();
  const { toast } = useFeedback();
  const save = useSaveStoreMap();
  const { upload, pending } = useUploadPlanImage();
  const [name, setName] = useState(map?.name ?? '');
  const [file, setFile] = useState<File | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useErrorToast(save.error);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const saved = await save.mutateAsync({ id: map?.id ?? null, name });
    toast.success(t(map ? 'locations.mapRenamed' : 'locations.mapCreated'));
    if (file) await upload(saved.id, file);
    onDone(saved);
  };

  return (
    <form onSubmit={(event) => void submit(event).catch(() => null)} className="space-y-4">
      <Field label={t('locations.mapName')} error={errors.field(save.error, 'name')}>
        {(id) => (
          <input
            id={id}
            className="input"
            required
            maxLength={60}
            autoFocus
            placeholder={t('locations.mapNamePlaceholder')}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        )}
      </Field>
      {map === null && (
        <Field
          label={t('locations.mapImage')}
          optionalLabel={t('common.optional')}
          hint={t('locations.mapImageHint')}
        >
          {(id, describedBy) => (
            <div className="flex min-w-0 items-center gap-2">
              <button
                id={id}
                type="button"
                aria-describedby={describedBy}
                onClick={() => input.current?.click()}
                className={smallButtonClass('sm', 'shrink-0')}
              >
                <ImagePlus className="h-4 w-4" />
                {t('locations.chooseImage')}
              </button>
              {file && <span className="truncate text-sm text-muted">{file.name}</span>}
              <input
                ref={input}
                type="file"
                accept={PLAN_IMAGE_TYPES}
                className="hidden"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  event.target.value = '';
                }}
              />
            </div>
          )}
        </Field>
      )}
      <div className="flex justify-end">
        <Button type="submit" loading={save.isPending || pending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}

/**
 * Names a new spot (where it was tapped: `at`) or edits one (`spot`), with its pin color.
 * `target` null: closed.
 */
export function SpotFormModal({
  target,
  onClose,
  onSaved,
}: {
  target: { mapId: string; spot: MapSpot | null; at: { x: number; y: number } | null } | null;
  onClose: () => void;
  onSaved: (map: StoreMap, spot: MapSpot | null) => void;
}) {
  const { t } = useI18n();
  return (
    <Modal
      open={target !== null}
      title={target?.spot ? t('locations.spot.edit') : t('locations.spot.new')}
      onClose={onClose}
      closeLabel={t('common.close')}
      size="sm"
    >
      {target && (
        <SpotForm
          key={target.spot?.id ?? `${target.at?.x}-${target.at?.y}`}
          target={target}
          onDone={(map, spot) => {
            onSaved(map, spot);
            onClose();
          }}
        />
      )}
    </Modal>
  );
}

function SpotForm({
  target,
  onDone,
}: {
  target: { mapId: string; spot: MapSpot | null; at: { x: number; y: number } | null };
  onDone: (map: StoreMap, spot: MapSpot | null) => void;
}) {
  const { t } = useI18n();
  const errors = useErrorText();
  const { toast } = useFeedback();
  const save = useSaveSpot();
  const [name, setName] = useState(target.spot?.name ?? '');
  const [color, setColor] = useState<SpotColor>(target.spot?.color ?? 'primary');
  useErrorToast(save.error);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const map = await save.mutateAsync({
      mapId: target.mapId,
      spotId: target.spot?.id ?? null,
      input: { name, color, ...(target.at && { x: target.at.x, y: target.at.y }) },
    });
    toast.success(t(target.spot ? 'locations.spot.updated' : 'locations.spot.created'));
    // The new spot is the one at the tapped place with that name.
    const spot =
      map.spots.find((item) =>
        target.spot
          ? item.id === target.spot.id
          : item.name === name.trim() &&
            Math.abs(item.x - (target.at?.x ?? -1)) < 1e-6 &&
            Math.abs(item.y - (target.at?.y ?? -1)) < 1e-6,
      ) ?? null;
    onDone(map, spot);
  };

  return (
    <form onSubmit={(event) => void submit(event).catch(() => null)} className="space-y-4">
      <Field label={t('locations.spot.name')} error={errors.field(save.error, 'name')}>
        {(id) => (
          <input
            id={id}
            className="input"
            required
            maxLength={60}
            autoFocus
            placeholder={t('locations.spot.namePlaceholder')}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        )}
      </Field>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t('locations.spot.color')}</legend>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={color === option}
              aria-label={t(`locations.spot.colors.${option}`)}
              title={t(`locations.spot.colors.${option}`)}
              onClick={() => setColor(option)}
              className={cx(
                'flex h-9 w-9 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-surface transition',
                SPOT_TONES[option].pin,
                color === option ? 'ring-2 ring-ink' : 'hover:scale-105',
              )}
            >
              {color === option && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex justify-end">
        <Button type="submit" loading={save.isPending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
