import { PackagePlus } from 'lucide-react';
import { useState } from 'react';
import { Button, Checkbox, Field, Modal, useErrorText, useErrorToast } from '@/ui';
import { MoneyInput } from '../domain/MoneyInput';
import { useSaveProduct } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import type { ProductOption, ProductUnit } from '../../lib/types';
import { money } from './saleMath';

const UNITS: ProductUnit[] = ['unit', 'kg', 'liter', 'box', 'pack', 'dozen', 'meter'];

/**
 * A product that is not in the catalog yet, created in a small dialog right where it is needed:
 * while selling (name, price, unit, or a service that is not counted) or while buying (also what
 * it cost). It is saved to the products and handed back to be added to the ticket, so everything
 * sold or bought is always a product of the catalog. `name` null: closed.
 */
export function NewProductModal({
  mode,
  name,
  onCreated,
  onClose,
}: {
  mode: 'sale' | 'purchase';
  /** What was searched, as the starting name; null keeps the dialog closed. */
  name: string | null;
  onCreated: (product: ProductOption) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <Modal
      open={name !== null}
      title={t('pos.newProduct.title')}
      description={t(mode === 'sale' ? 'pos.newProduct.introSale' : 'pos.newProduct.introPurchase')}
      onClose={onClose}
      closeLabel={t('common.close')}
    >
      {name !== null && (
        <NewProductForm mode={mode} initialName={name} onCreated={onCreated} onCancel={onClose} />
      )}
    </Modal>
  );
}

function NewProductForm({
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

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready) return;
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
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        {mode === 'purchase' && (
          <Field label={t('pos.newProduct.cost')} hint={t('pos.newProduct.costHint')}>
            {(id, describedBy) => (
              <MoneyInput
                id={id}
                describedBy={describedBy}
                required
                value={cost}
                onChange={setCost}
              />
            )}
          </Field>
        )}
        <Field
          label={t('pos.newProduct.price')}
          hint={t('pos.newProduct.priceHint')}
          error={errors.field(save.error, 'price')}
        >
          {(id, describedBy) => (
            <MoneyInput
              id={id}
              describedBy={describedBy}
              required
              value={price}
              onChange={setPrice}
            />
          )}
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
          card
          checked={service}
          onChange={setService}
          label={t('pos.newProduct.service')}
          hint={t('pos.newProduct.serviceHint')}
        />
      )}
      <p className="text-xs text-muted">{t('pos.newProduct.later')}</p>
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          icon={<PackagePlus className="h-4 w-4" />}
          loading={save.isPending}
          disabled={!ready}
        >
          {t('pos.newProduct.create')}
        </Button>
      </div>
    </form>
  );
}
