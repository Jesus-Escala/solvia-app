import { Camera, Package, QrCode, Trash2, Wrench } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  Button,
  Checkbox,
  cx,
  Field,
  Modal,
  SegmentedControl,
  TextButton,
  useErrorText,
  useErrorToast,
  useFeedback,
} from '@/ui';
import { MoneyInput } from './MoneyInput';
import { ProductThumb } from './ProductThumb';
import { useProductImage, useSaveProduct } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import type { Product, ProductKind, ProductUnit } from '../../lib/types';

const PRODUCT_UNITS: ProductUnit[] = ['unit', 'kg', 'liter', 'box', 'pack', 'dozen', 'meter'];
/** The backend accepts these pictures (and up to MAX_UPLOAD_SIZE_MB, 5 MB by default). */
const IMAGE_TYPES = 'image/jpeg,image/png,image/webp';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function ProductFormModal({
  open,
  onClose,
  product,
  onShowQr,
}: {
  open: boolean;
  onClose: () => void;
  product?: Product;
  /** Opens the QR code of the product being edited. */
  onShowQr?: (product: Product) => void;
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
      {open && (
        <ProductForm
          product={product}
          onClose={onClose}
          {...(onShowQr && product && { onShowQr: () => onShowQr(product) })}
        />
      )}
    </Modal>
  );
}

/**
 * A product or a service. Name and price first (what a shop owner knows by heart); a picture,
 * the cost and the stock alert are optional and explained in plain words. The code is optional
 * too: without one Solvia gives it a unique code, printed as its QR. A service has no unit,
 * stock or sack.
 */
function ProductForm({
  product,
  onClose,
  onShowQr,
}: {
  product?: Product;
  onClose: () => void;
  onShowQr?: () => void;
}) {
  const { t, fmt } = useI18n();
  const errors = useErrorText();
  const { toast } = useFeedback();
  const save = useSaveProduct(product?.id);
  const image = useProductImage();
  const [form, setForm] = useState({
    kind: product?.kind ?? ('product' as ProductKind),
    name: product?.name ?? '',
    price: product ? String(product.price) : '',
    unit: product?.unit ?? ('unit' as ProductUnit),
    code: product?.code ?? '',
    cost: (product?.cost ?? null) === null ? '' : String(product?.cost),
    trackStock: product?.trackStock ?? true,
    minStock: (product?.minStock ?? null) === null ? '' : String(product?.minStock),
    packSize: (product?.packSize ?? null) === null ? '' : String(product?.packSize),
  });
  // The picture: kept as it is, a new file chosen, or removed.
  const [picture, setPicture] = useState<File | null | 'keep'>('keep');
  const preview = usePreview(picture === 'keep' ? null : picture);
  const imageUrl = picture === 'keep' ? (product?.imageUrl ?? null) : preview;
  const fileInput = useRef<HTMLInputElement>(null);
  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const service = form.kind === 'service';
  const price = Number(form.price) || 0;
  const cost = form.cost === '' ? null : Number(form.cost);
  const margin = cost !== null && price > 0 ? (price - cost) / price : null;

  const choose = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      toast.warning(t('products.form.imageTooLarge'));
      return;
    }
    setPicture(file);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const saved = await save.mutateAsync({
      kind: form.kind,
      name: form.name,
      price,
      unit: service ? 'unit' : form.unit,
      // Empty: Solvia gives it a unique code.
      code: form.code.trim() || null,
      cost,
      trackStock: !service && form.trackStock,
      minStock: !service && form.trackStock && form.minStock !== '' ? Number(form.minStock) : null,
      packSize:
        !service && form.packSize !== '' && Number(form.packSize) > 0
          ? Number(form.packSize)
          : null,
    });
    if (picture !== 'keep') {
      try {
        await image.mutateAsync({ id: saved.id, file: picture });
      } catch (error) {
        // The product is saved; only the picture failed.
        toast.apiError(error);
      }
    }
    toast.success(
      product ? t('products.updated') : t('products.created'),
      product ? undefined : t('products.createdCode', { code: saved.code ?? '' }),
    );
    onClose();
  };

  useErrorToast(save.error);

  return (
    <form onSubmit={(event) => void submit(event).catch(() => null)} className="space-y-4">
      <SegmentedControl
        size="md"
        label={t('products.form.kind')}
        value={form.kind}
        onChange={(kind) => update('kind', kind)}
        options={[
          { value: 'product', label: t('products.kinds.product'), icon: <Package /> },
          { value: 'service', label: t('products.kinds.service'), icon: <Wrench /> },
        ]}
      />

      <div className="flex items-start gap-4">
        {/* Picture: tap to choose; shown in the point of sale and the list. */}
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            aria-label={t('products.form.image')}
            className="group relative rounded-2xl focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
          >
            {imageUrl ? (
              <ProductThumb name={form.name || '?'} imageUrl={imageUrl} size={88} />
            ) : (
              <span className="flex h-[88px] w-[88px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-line-strong text-[11px] font-medium text-muted transition group-hover:border-primary/50 group-hover:text-primary-ink">
                <Camera className="h-5 w-5" />
                {t('products.form.addImage')}
              </span>
            )}
          </button>
          {imageUrl && (
            <TextButton size="sm" onClick={() => setPicture(null)}>
              <Trash2 className="h-3.5 w-3.5" />
              {t('products.form.removeImage')}
            </TextButton>
          )}
          <input
            ref={fileInput}
            type="file"
            accept={IMAGE_TYPES}
            className="hidden"
            onChange={(event) => {
              choose(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <Field label={t('products.form.name')} error={errors.field(save.error, 'name')}>
            {(id) => (
              <input
                id={id}
                className="input"
                required
                minLength={2}
                maxLength={120}
                placeholder={t(
                  service ? 'products.form.servicePlaceholder' : 'products.form.namePlaceholder',
                )}
                value={form.name}
                onChange={(event) => update('name', event.target.value)}
              />
            )}
          </Field>
          <div className={cx('grid gap-4', !service && 'sm:grid-cols-2')}>
            <Field label={t('products.form.price')} error={errors.field(save.error, 'price')}>
              {(id) => (
                <MoneyInput
                  id={id}
                  required
                  value={form.price}
                  onChange={(v) => update('price', v)}
                />
              )}
            </Field>
            {!service && (
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
            )}
          </div>
        </div>
      </div>

      <Field
        label={t('products.form.cost')}
        optionalLabel={t('common.optional')}
        hint={
          margin === null
            ? t(service ? 'products.form.serviceCostHint' : 'products.form.costHint')
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
        label={t('products.form.code')}
        optionalLabel={t('common.optional')}
        hint={t('products.form.codeAutoHint')}
        error={errors.field(save.error, 'code')}
      >
        {(id, describedBy) => (
          <div className="flex gap-2">
            <input
              id={id}
              aria-describedby={describedBy}
              className="input tabular-nums"
              maxLength={40}
              inputMode="numeric"
              placeholder={t('products.form.codeAutoPlaceholder')}
              value={form.code}
              onChange={(event) => update('code', event.target.value)}
            />
            {onShowQr && product?.code && (
              <Button variant="secondary" icon={<QrCode className="h-4 w-4" />} onClick={onShowQr}>
                {t('products.qr.short')}
              </Button>
            )}
          </div>
        )}
      </Field>

      {!service && (
        <>
          <Field
            label={t('products.form.packSize')}
            optionalLabel={t('common.optional')}
            hint={t('products.form.packSizeHint', {
              unit: t(`products.unitsShort.${form.unit}`),
            })}
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
        </>
      )}
      {service && (
        <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-muted">
          {t('products.form.serviceNote')}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={save.isPending || image.isPending}>
          {product ? t('products.form.save') : t('products.form.create')}
        </Button>
      </div>
    </form>
  );
}

/** A temporary URL to show a chosen file before it is uploaded (released when it changes). */
function usePreview(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return url;
}
