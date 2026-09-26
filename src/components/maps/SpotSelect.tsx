import type { StoreMap } from '../../lib/types';
import { useI18n } from '../../i18n/I18nProvider';

/** Where a product is kept: "Sin ubicación" first, then the spots grouped by plan. */
export function SpotSelect({
  id,
  describedBy,
  maps,
  value,
  onChange,
}: {
  id?: string;
  describedBy?: string;
  maps: StoreMap[];
  value: string | null;
  onChange: (spotId: string | null) => void;
}) {
  const { t } = useI18n();
  return (
    <select
      id={id}
      aria-describedby={describedBy}
      className="input"
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value || null)}
    >
      <option value="">{t('locations.product.none')}</option>
      {maps
        .filter((map) => map.spots.length > 0)
        .map((map) => (
          <optgroup key={map.id} label={map.name}>
            {map.spots.map((spot) => (
              <option key={spot.id} value={spot.id}>
                {spot.name}
              </option>
            ))}
          </optgroup>
        ))}
    </select>
  );
}
