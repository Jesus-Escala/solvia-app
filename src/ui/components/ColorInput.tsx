import { Check, ChevronDown, Pipette, X } from 'lucide-react';
import { useUiI18n } from '../i18n/context';
import { Popover } from './Overlays';
import { COLOR_PALETTE, normalizeHex, readableTextColor } from './colors';
import { cx } from './cx';

/**
 * A color picker: the button shows the color and its code; it opens the palette (18 families ×
 * 10 shades) and "Personalizado" (the browser's color picker) for any other color. With
 * `clearable`, "Quitar" leaves it without a color (null).
 */
export function ColorInput({
  id,
  value,
  onChange,
  clearable = false,
  className,
}: {
  id?: string;
  /** "#rrggbb", or null for none. */
  value: string | null;
  onChange: (color: string | null) => void;
  clearable?: boolean;
  className?: string;
}) {
  const { t } = useUiI18n();
  const hex = normalizeHex(value);
  return (
    <Popover
      align="start"
      width={Math.min(420, window.innerWidth - 24)}
      trigger={({ toggle, ref }) => (
        <button
          ref={ref}
          id={id}
          type="button"
          onClick={toggle}
          title={hex ?? t('color.none')}
          className={cx('input flex items-center gap-2 text-left', !hex && 'text-muted', className)}
        >
          <span
            aria-hidden
            className={cx(
              'h-5 w-5 shrink-0 rounded-md border border-line-strong',
              !hex &&
                'bg-[repeating-linear-gradient(45deg,var(--color-surface-3)_0_4px,transparent_4px_8px)]',
            )}
            style={hex ? { backgroundColor: hex } : undefined}
          />
          <span className="min-w-0 flex-1 truncate font-mono text-sm">
            {hex ?? t('color.none')}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
        </button>
      )}
    >
      {(close) => (
        <div className="space-y-2 p-1">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-subtle uppercase">
            {t('color.title')}
          </p>
          {/* One column per family, light shades on top: short enough for any screen. */}
          <div className="grid grid-flow-col grid-cols-[repeat(18,minmax(0,1fr))] grid-rows-10 gap-0.5">
            {COLOR_PALETTE.map((family) =>
              family.map((color) => (
                <button
                  key={color}
                  type="button"
                  title={color}
                  aria-label={color}
                  aria-pressed={hex === color}
                  onClick={() => {
                    onChange(color);
                    close();
                  }}
                  className={cx(
                    'flex aspect-square w-full items-center justify-center rounded-[4px] border border-black/10 transition hover:z-10 hover:scale-125',
                    hex === color && 'ring-2 ring-ink ring-offset-1 ring-offset-surface',
                  )}
                  style={{ backgroundColor: color }}
                >
                  {hex === color && (
                    <Check className="h-3 w-3" style={{ color: readableTextColor(color) }} />
                  )}
                </button>
              )),
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-line pt-2">
            <label className="relative inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs font-medium hover:bg-surface-2">
              <Pipette className="h-3.5 w-3.5" />
              {t('color.custom')}
              <input
                type="color"
                value={hex ?? '#0d9488'}
                onChange={(event) => onChange(normalizeHex(event.target.value))}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
            {clearable && hex && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  close();
                }}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-danger/30 px-2.5 text-xs font-medium text-danger-ink hover:bg-danger-soft"
              >
                <X className="h-3.5 w-3.5" />
                {t('color.clear')}
              </button>
            )}
          </div>
        </div>
      )}
    </Popover>
  );
}
