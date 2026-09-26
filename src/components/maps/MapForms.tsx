import { Check, ImagePlus } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import {
  Button,
  COLOR_PALETTE,
  ColorInput,
  Field,
  readableTextColor,
  Modal,
  cx,
  smallButtonClass,
  useErrorText,
  useErrorToast,
  useFeedback,
} from '@/ui';
import { useSaveSpot, useSaveStoreMap } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import type { MapSpot, StoreMap } from '../../lib/types';
import type { SpotArea } from './MapStage';
import { DEFAULT_SPOT_COLOR, spotHex } from './spotTones';
import { PLAN_IMAGE_TYPES, useUploadPlanImage } from './useUploadPlanImage';

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

/** What the spot form works on: a new area (`area`, where it was drawn) or a spot to edit. */
export interface SpotTarget {
  mapId: string;
  spot: MapSpot | null;
  area: SpotArea | null;
}

/** Quick colors (one shade of the main families); "Más colores" opens the whole palette. */
const QUICK_COLORS = [8, 11, 6, 3, 1, 13, 16, 2].map((family) => COLOR_PALETTE[family]![6]!);

/** Names a new area or edits one (`target.spot`), with its color. `target` null: closed. */
export function SpotFormModal({
  target,
  onClose,
  onSaved,
}: {
  target: SpotTarget | null;
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
          key={target.spot?.id ?? `${target.area?.x}-${target.area?.y}`}
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
  target: SpotTarget;
  onDone: (map: StoreMap, spot: MapSpot | null) => void;
}) {
  const { t } = useI18n();
  const errors = useErrorText();
  const { toast } = useFeedback();
  const save = useSaveSpot();
  const [name, setName] = useState(target.spot?.name ?? '');
  const [color, setColor] = useState(target.spot ? spotHex(target.spot.color) : DEFAULT_SPOT_COLOR);
  useErrorToast(save.error);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const map = await save.mutateAsync({
      mapId: target.mapId,
      spotId: target.spot?.id ?? null,
      input: { name, color, ...target.area },
    });
    toast.success(t(target.spot ? 'locations.spot.updated' : 'locations.spot.created'));
    // The new spot is the one with that name where the area was drawn.
    const spot =
      map.spots.find((item) =>
        target.spot
          ? item.id === target.spot.id
          : item.name === name.trim() &&
            Math.abs(item.x - (target.area?.x ?? -1)) < 1e-6 &&
            Math.abs(item.y - (target.area?.y ?? -1)) < 1e-6,
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
      <Field label={t('locations.spot.color')} hint={t('locations.spot.colorHint')}>
        {(id, describedBy) => (
          <div className="space-y-2" aria-describedby={describedBy}>
            <div className="flex flex-wrap gap-2">
              {QUICK_COLORS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={color === option}
                  aria-label={option}
                  title={option}
                  onClick={() => setColor(option)}
                  className={cx(
                    'flex h-8 w-8 items-center justify-center rounded-full ring-offset-2 ring-offset-surface transition',
                    color === option ? 'ring-2 ring-ink' : 'hover:scale-105',
                  )}
                  style={{ backgroundColor: option }}
                >
                  {color === option && (
                    <Check className="h-4 w-4" style={{ color: readableTextColor(option) }} />
                  )}
                </button>
              ))}
            </div>
            <ColorInput id={id} value={color} onChange={(next) => next && setColor(next)} />
          </div>
        )}
      </Field>
      <div className="flex justify-end">
        <Button type="submit" loading={save.isPending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
