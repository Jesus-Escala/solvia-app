import { PackagePlus } from 'lucide-react';
import { useState } from 'react';
import { Button, Checkbox, Field, useErrorText, useErrorToast } from '@/ui';
import { MoneyInput } from '../domain/MoneyInput';
import { useSaveProduct } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import type { ProductOption, ProductUnit } from '../../lib/types';
import { money, onEnter } from './saleMath';

const UNITS: ProductUnit[] = ['unit', 'kg', 'liter', 'box', 'pack', 'dozen', 'meter'];

/**
 * A product that is not in the catalog yet, created right where it is needed: while selling
 * (name, price, unit, or a service that is not counted) or while buying (also what it cost). It
 * is saved to the products and handed back to be added to the ticket, so everything sold or
 * bought is always a product of the catalog.
 */
export function NewProductForm({
  mode,
  initialName,
  onCreated,
  onCancel,
}: {
  mode: 'sale' | 'purchase';
  initialName: string;
  onCreated: (product: ProductOption) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const errors = useErrorText();
  const save = useSaveProduct();
  const [name, setName] = useState(initialName);
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [unit, setUnit] = useState<ProductUnit>('unit');
  const [service, setService] = useState(false);
  const ready = name.trim().length >= 2 && money(price) > 0 && (mode === 'sale' || money(cost) > 0);

  const create = async () => {
    if (!ready || save.isPending) return;
    const product = await save.mutateAsync({
      name: name.trim(),
      price: money(price),
      unit,
      trackStock: !service,
      ...(money(cost) > 0 && { cost: money(cost) }),
    });
    onCreated(product);
  };

  useErrorToast(save.error);

  return (
    <div
      className="animate-page-in space-y-3 border-b border-line bg-primary-soft/40 px-4 py-3"
      onKeyDown={onEnter(() => void create().catch(() => null))}
    >
      <p className="flex items-center gap-2 text-sm font-semibold">
        <PackagePlus className="h-4 w-4 text-primary" />
        {t('pos.newProduct.title')}
      </p>
      <Field label={t('products.form.name')} error={errors.field(save.error, 'name')}>
        {(id) => (
          <input
            id={id}
            className="input"
            maxLength={120}
            autoFocus
            placeholder={t('products.form.namePlaceholder')}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        )}
      </Field>
      <div className="grid grid-cols-2 gap-2">
        {mode === 'purchase' && (
          <Field label={t('pos.newProduct.cost')}>
            {(id) => <MoneyInput id={id} value={cost} onChange={setCost} />}
          </Field>
        )}
        <Field label={t('pos.newProduct.price')} error={errors.field(save.error, 'price')}>
          {(id) => <MoneyInput id={id} value={price} onChange={setPrice} />}
        </Field>
        <Field label={t('products.form.unit')}>
          {(id) => (
            <select
              id={id}
              className="input"
              value={unit}
              onChange={(event) => setUnit(event.target.value as ProductUnit)}
            >
              {UNITS.map((option) => (
                <option key={option} value={option}>
                  {t(`products.units.${option}`)}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      {mode === 'sale' && (
        <Checkbox
          checked={service}
          onChange={setService}
          label={t('pos.newProduct.service')}
          hint={t('pos.newProduct.serviceHint')}
        />
      )}
      <div className="flex gap-2">
        <Button
          onClick={() => void create().catch(() => null)}
          loading={save.isPending}
          disabled={!ready}
        >
          {t('pos.newProduct.create')}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  );
}
