import { useState, type FormEvent } from 'react';
import { Button, cx, Field, Modal, useErrorText, useErrorToast, useFeedback, Checkbox } from '@/ui';
import { useSaveProduct } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import type { Product, ProductUnit } from '../../lib/types';

const PRODUCT_UNITS: ProductUnit[] = ['unit', 'kg', 'liter', 'box', 'pack', 'dozen', 'meter'];

export function ProductFormModal({
  open,
  onClose,
  product,
}: {
  open: boolean;
  onClose: () => void;
  product?: Product;
}) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      title={product ? t('products.form.titleEdit') : t('products.form.titleNew')}
      {...(!product && { description: t('products.form.intro') })}
      onClose={onClose}
      closeLabel={t('common.close')}
    >
      {open && <ProductForm product={product} onClose={onClose} />}
    </Modal>
  );
}

/** Money input with the "S/" prefix. */
function MoneyInput({
  id,
  value,
  onChange,
  required = false,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  describedBy?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-muted">
        S/
      </span>
      <input
        id={id}
        aria-describedby={describedBy}
        className="input pl-9 tabular-nums"
        type="number"
        inputMode="decimal"
        min={required ? '0.01' : '0'}
        step="0.01"
        required={required}
        placeholder="0.00"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

/**
 * Name, price and unit first (what a shop owner knows by heart); code, cost and stock alert are
 * optional and explained in plain words.
 */
function ProductForm({ product, onClose }: { product?: Product; onClose: () => void }) {
  const { t, fmt } = useI18n();
  const errors = useErrorText();
  const { toast } = useFeedback();
  const save = useSaveProduct(product?.id);
  const [form, setForm] = useState({
    name: product?.name ?? '',
    price: product ? String(product.price) : '',
    unit: product?.unit ?? ('unit' as ProductUnit),
    code: product?.code ?? '',
    cost: (product?.cost ?? null) === null ? '' : String(product?.cost),
    trackStock: product?.trackStock ?? true,
    minStock: (product?.minStock ?? null) === null ? '' : String(product?.minStock),
    packSize: (product?.packSize ?? null) === null ? '' : String(product?.packSize),
  });
  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const price = Number(form.price) || 0;
  const cost = form.cost === '' ? null : Number(form.cost);
  const margin = cost !== null && price > 0 ? (price - cost) / price : null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await save.mutateAsync({
      name: form.name,
      price,
      unit: form.unit,
      code: form.code.trim() || null,
      cost,
      trackStock: form.trackStock,
      minStock: form.trackStock && form.minStock !== '' ? Number(form.minStock) : null,
      packSize: form.packSize !== '' && Number(form.packSize) > 0 ? Number(form.packSize) : null,
    });
    toast.success(product ? t('products.updated') : t('products.created'));
    onClose();
  };

  useErrorToast(save.error);

  return (
    <form onSubmit={(event) => void submit(event).catch(() => null)} className="space-y-4">
      <Field label={t('products.form.name')} error={errors.field(save.error, 'name')}>
        {(id) => (
          <input
            id={id}
            className="input"
            required
            minLength={2}
            maxLength={120}
            placeholder={t('products.form.namePlaceholder')}
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
          />
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('products.form.price')} error={errors.field(save.error, 'price')}>
          {(id) => (
            <MoneyInput id={id} required value={form.price} onChange={(v) => update('price', v)} />
          )}
        </Field>
        <Field label={t('products.form.unit')} error={errors.field(save.error, 'unit')}>
          {(id) => (
            <select
              id={id}
              className="input"
              value={form.unit}
              onChange={(event) => update('unit', event.target.value as ProductUnit)}
            >
              {PRODUCT_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {t(`products.units.${unit}`)}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <Field
        label={t('products.form.cost')}
        optionalLabel={t('common.optional')}
        hint={
          margin === null
            ? t('products.form.costHint')
            : t('products.form.marginHint', {
                amount: fmt.money(price - (cost ?? 0)),
                percent: fmt.percent(margin),
              })
        }
        error={errors.field(save.error, 'cost')}
      >
        {(id, describedBy) => (
          <MoneyInput
            id={id}
            describedBy={describedBy}
            value={form.cost}
            onChange={(v) => update('cost', v)}
          />
        )}
      </Field>

      <Field
        label={t('products.form.packSize')}
        optionalLabel={t('common.optional')}
        hint={t('products.form.packSizeHint', { unit: t(`products.unitsShort.${form.unit}`) })}
        error={errors.field(save.error, 'packSize')}
      >
        {(id, describedBy) => (
          <div className="relative sm:max-w-48">
            <input
              id={id}
              aria-describedby={describedBy}
              className="input pr-12 tabular-nums"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder={t('products.form.packSizePlaceholder')}
              value={form.packSize}
              onChange={(event) => update('packSize', event.target.value)}
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted">
              {t(`products.unitsShort.${form.unit}`)}
            </span>
          </div>
        )}
      </Field>

      <Field
        label={t('products.form.code')}
        optionalLabel={t('common.optional')}
        hint={t('products.form.codeHint')}
        error={errors.field(save.error, 'code')}
      >
        {(id, describedBy) => (
          <input
            id={id}
            aria-describedby={describedBy}
            className="input tabular-nums"
            maxLength={40}
            inputMode="numeric"
            value={form.code}
            onChange={(event) => update('code', event.target.value)}
          />
        )}
      </Field>

      <div className="rounded-xl border border-line bg-surface-2 p-3">
        <Checkbox
          checked={form.trackStock}
          onChange={(checked) => update('trackStock', checked)}
          label={t('products.form.trackStock')}
          hint={t('products.form.trackStockHint')}
        />
        <div className={cx('mt-3 pl-7', !form.trackStock && 'hidden')}>
          <Field
            label={t('products.form.minStock')}
            optionalLabel={t('common.optional')}
            hint={t('products.form.minStockHint')}
            error={errors.field(save.error, 'minStock')}
          >
            {(id, describedBy) => (
              <input
                id={id}
                aria-describedby={describedBy}
                className="input tabular-nums sm:max-w-40"
                type="number"
                inputMode="decimal"
                min="0"
                step={form.unit === 'unit' || form.unit === 'box' ? '1' : '0.001'}
                value={form.minStock}
                onChange={(event) => update('minStock', event.target.value)}
              />
            )}
          </Field>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={save.isPending}>
          {product ? t('products.form.save') : t('products.form.create')}
        </Button>
      </div>
    </form>
  );
}
