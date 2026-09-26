import { Pencil, Trash2, Truck } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import {
  Alert,
  Button,
  DataTable,
  Field,
  formatPhone,
  IconButton,
  MenuItems,
  Modal,
  Page,
  PageHeader,
  PhoneInput,
  Popover,
  SearchInput,
  useErrorText,
  useErrorToast,
  useFeedback,
  urlSort,
  useUrlState,
  type DataTableColumn,
  WhatsAppIcon,
} from '@/ui';
import { MoreHorizontal } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useDeleteSupplier, useSaveSupplier, useSuppliers } from '../hooks/queries';
import { useModules } from '../hooks/useModules';
import { useI18n } from '../i18n/I18nProvider';
import { Kbd } from '../components/pos/PosLayout';
import { ADD_KEY_LABEL } from '../components/pos/keys';
import { useAddShortcut } from '../hooks/useAddShortcut';
import type { Supplier } from '../lib/types';
import { ModuleOff } from '../components/modules/ModuleOff';

const DEFAULTS = { search: '', page: '1', pageSize: '20', sortBy: '', sortDir: '' };

function SupplierForm({ supplier, onClose }: { supplier: Supplier | null; onClose: () => void }) {
  const { t } = useI18n();
  const errors = useErrorText();
  const { toast } = useFeedback();
  const save = useSaveSupplier(supplier?.id ?? null);
  const phoneId = useId();
  const [form, setForm] = useState({
    name: supplier?.name ?? '',
    documentId: supplier?.documentId ?? '',
    phone: supplier?.phone ?? '',
    notes: supplier?.notes ?? '',
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await save.mutateAsync({
      name: form.name,
      documentId: form.documentId.trim() || null,
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
    });
    toast.success(t(supplier === null ? 'suppliers.created' : 'suppliers.updated'));
    onClose();
  };
  useErrorToast(save.error);

  return (
    <form onSubmit={(event) => void submit(event).catch(() => null)} className="space-y-4">
      <Field label={t('suppliers.form.name')} error={errors.field(save.error, 'name')}>
        {(id) => (
          <input
            id={id}
            className="input"
            required
            minLength={2}
            maxLength={120}
            placeholder={t('suppliers.form.namePlaceholder')}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        )}
      </Field>
      <Field
        label={t('suppliers.form.phone')}
        optionalLabel={t('common.optional')}
        hint={t('suppliers.form.phoneHint')}
        error={errors.field(save.error, 'phone')}
      >
        {() => (
          <PhoneInput
            id={phoneId}
            value={form.phone}
            onChange={(phone) => setForm({ ...form, phone })}
          />
        )}
      </Field>
      <Field
        label={t('suppliers.form.documentId')}
        optionalLabel={t('common.optional')}
        error={errors.field(save.error, 'documentId')}
      >
        {(id) => (
          <input
            id={id}
            className="input tabular-nums"
            maxLength={20}
            inputMode="numeric"
            value={form.documentId}
            onChange={(event) => setForm({ ...form, documentId: event.target.value })}
          />
        )}
      </Field>
      <Field label={t('suppliers.form.notes')} optionalLabel={t('common.optional')}>
        {(id) => (
          <textarea
            id={id}
            className="input"
            rows={2}
            placeholder={t('suppliers.form.notesPlaceholder')}
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />
        )}
      </Field>
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={save.isPending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}

export function SuppliersPage() {
  const modules = useModules();
  if (!modules.loading && !modules.inventory) return <ModuleOff />;
  return <SuppliersList />;
}

function SuppliersList() {
  const { t } = useI18n();
  const errors = useErrorText();
  const { isAdmin } = useAuth();
  const { toast, confirm } = useFeedback();
  const [state, update] = useUrlState(DEFAULTS);
  // null = closed, 'new' = creating, a supplier = editing it.
  const [editing, setEditing] = useState<Supplier | 'new' | null>(null);
  useAddShortcut(() => setEditing('new'));
  const remove = useDeleteSupplier();
  const query = useSuppliers({
    search: state.search || null,
    page: Number(state.page) || 1,
    pageSize: Number(state.pageSize) || 20,
    sortBy: (state.sortBy || null) as 'name' | 'phone' | 'purchases' | null,
    sortDir: state.sortDir === 'desc' ? 'desc' : 'asc',
  });

  const deleteSupplier = async (supplier: Supplier) => {
    const confirmed = await confirm({
      title: t('suppliers.confirmDeleteTitle'),
      message: t('suppliers.confirmDeleteMessage', { name: supplier.name }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
    });
    if (!confirmed) return;
    try {
      await remove.mutateAsync(supplier.id);
      toast.success(t('suppliers.deleted'));
    } catch (error) {
      toast.apiError(error);
    }
  };

  const columns: Array<DataTableColumn<Supplier>> = [
    {
      id: 'name',
      sortable: true,
      header: t('suppliers.columns.name'),
      hideable: false,
      mobile: 'title',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.name}</p>
          {row.documentId !== null && (
            <p className="text-xs text-subtle tabular-nums">RUC {row.documentId}</p>
          )}
        </div>
      ),
    },
    {
      id: 'phone',
      sortable: true,
      header: t('suppliers.columns.phone'),
      mobile: 'subtitle',
      cell: (row) =>
        row.phone === null ? (
          <span className="text-subtle">—</span>
        ) : (
          <a
            href={`https://wa.me/${row.phone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 hover:underline"
          >
            <WhatsAppIcon className="h-3.5 w-3.5" />
            <span className="tabular-nums">{formatPhone(row.phone)}</span>
          </a>
        ),
    },
    {
      id: 'purchases',
      sortable: true,
      header: t('suppliers.columns.purchases'),
      align: 'right',
      mobile: 'aside',
      cell: (row) => row.purchases ?? 0,
    },
  ];

  return (
    <Page fill>
      <PageHeader
        title={t('suppliers.title')}
        description={t('suppliers.subtitle')}
        actions={
          <Button icon={<Truck className="h-4 w-4" />} onClick={() => setEditing('new')}>
            {t('suppliers.new')}
            <Kbd>{ADD_KEY_LABEL}</Kbd>
          </Button>
        }
      />
      <DataTable
        columnsStorageKey="suppliers"
        caption={t('suppliers.title')}
        search={
          <SearchInput
            value={state.search}
            onChange={(search) => update({ search, page: '1' })}
            placeholder={t('suppliers.searchPlaceholder')}
          />
        }
        columns={columns}
        rows={query.data?.data}
        rowKey={(row) => row.id}
        loading={query.isLoading}
        fetching={query.isFetching && !query.isLoading}
        {...(query.error && {
          error: <Alert tone="danger">{errors.message(query.error)}</Alert>,
        })}
        onRowClick={(row) => setEditing(row)}
        onRowEdit={(row) => setEditing(row)}
        {...(isAdmin && { onRowDelete: (row: Supplier) => void deleteSupplier(row) })}
        rowActions={(row) => (
          <Popover
            trigger={({ toggle, ref }) => (
              <IconButton ref={ref} size="sm" label={t('common.moreActions')} onClick={toggle}>
                <MoreHorizontal className="h-4 w-4" />
              </IconButton>
            )}
          >
            {(close) => (
              <MenuItems
                close={close}
                items={[
                  { label: t('common.edit'), icon: <Pencil />, onSelect: () => setEditing(row) },
                  {
                    label: t('common.delete'),
                    icon: <Trash2 />,
                    danger: true,
                    hidden: !isAdmin,
                    onSelect: () => void deleteSupplier(row),
                  },
                ]}
              />
            )}
          </Popover>
        )}
        {...urlSort(state, update)}
        pagination={
          query.data && {
            ...query.data.meta,
            onPageChange: (page) => update({ page: String(page) }),
            onPageSizeChange: (pageSize) => update({ pageSize: String(pageSize) }),
          }
        }
        empty={{
          title: state.search ? t('suppliers.emptyFiltered') : t('suppliers.empty'),
          ...(!state.search && {
            description: t('suppliers.emptyDescription'),
            action: (
              <Button icon={<Truck className="h-4 w-4" />} onClick={() => setEditing('new')}>
                {t('suppliers.new')}
              </Button>
            ),
          }),
        }}
      />
      <Modal
        open={editing !== null}
        title={editing === 'new' ? t('suppliers.new') : t('suppliers.edit')}
        onClose={() => setEditing(null)}
        closeLabel={t('common.close')}
      >
        {editing !== null && (
          <SupplierForm
            supplier={editing === 'new' ? null : editing}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>
    </Page>
  );
}
