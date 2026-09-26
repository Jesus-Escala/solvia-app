import { Check, Pencil, Plus, Tag, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button, IconButton, Modal, Skeleton, useFeedback } from '@/ui';
import { useCategories, useDeleteCategory, useSaveCategory } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import type { ProductCategory } from '../../lib/types';

/**
 * The categories of the business in one place: add one at the top, rename it in its row, or
 * delete it (its products stay, without a category).
 */
export function CategoriesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      title={t('categories.title')}
      description={t('categories.description')}
      onClose={onClose}
      closeLabel={t('common.close')}
    >
      {open && <CategoriesManager />}
    </Modal>
  );
}

function CategoriesManager() {
  const { t } = useI18n();
  const { toast } = useFeedback();
  const categories = useCategories();
  const save = useSaveCategory();
  const [name, setName] = useState('');

  const add = async (event: FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) return;
    try {
      await save.mutateAsync({ name: name.trim() });
      setName('');
      toast.success(t('categories.created'));
    } catch (error) {
      toast.apiError(error);
    }
  };

  const rows = categories.data ?? [];
  return (
    <div className="space-y-4">
      <form onSubmit={(event) => void add(event)} className="flex gap-2">
        <input
          className="input min-w-0 flex-1"
          aria-label={t('categories.newTitle')}
          autoFocus
          minLength={2}
          maxLength={60}
          placeholder={t('categories.namePlaceholder')}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Button
          type="submit"
          icon={<Plus className="h-4 w-4" />}
          loading={save.isPending}
          disabled={name.trim().length < 2}
        >
          {t('categories.add')}
        </Button>
      </form>

      {categories.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">
          {t('categories.empty')}
        </p>
      ) : (
        <ul className="max-h-[50dvh] divide-y divide-line overflow-y-auto rounded-xl border border-line">
          {rows.map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryRow({ category }: { category: ProductCategory }) {
  const { t } = useI18n();
  const { toast, confirm } = useFeedback();
  const save = useSaveCategory();
  const remove = useDeleteCategory();
  const [draft, setDraft] = useState<string | null>(null);

  const rename = async () => {
    const name = (draft ?? '').trim();
    if (name.length < 2) return;
    if (name === category.name) {
      setDraft(null);
      return;
    }
    try {
      await save.mutateAsync({ id: category.id, name });
      setDraft(null);
      toast.success(t('categories.renamed'));
    } catch (error) {
      toast.apiError(error);
    }
  };

  const deleteCategory = async () => {
    const confirmed = await confirm({
      title: t('categories.confirmDeleteTitle'),
      message: t('categories.confirmDeleteMessage', { name: category.name }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
    });
    if (!confirmed) return;
    try {
      await remove.mutateAsync(category.id);
      toast.success(t('categories.deleted'));
    } catch (error) {
      toast.apiError(error);
    }
  };

  if (draft !== null) {
    return (
      <li className="flex items-center gap-2 px-3 py-2">
        <input
          className="input h-9 min-w-0 flex-1"
          aria-label={t('categories.rename')}
          autoFocus
          minLength={2}
          maxLength={60}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void rename();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              setDraft(null);
            }
          }}
        />
        <IconButton
          size="sm"
          variant="secondary"
          label={t('categories.save')}
          disabled={draft.trim().length < 2 || save.isPending}
          onClick={() => void rename()}
        >
          <Check className="h-4 w-4" />
        </IconButton>
        <IconButton size="sm" label={t('common.cancel')} onClick={() => setDraft(null)}>
          <X className="h-4 w-4" />
        </IconButton>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <Tag className="h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{category.name}</p>
        <p className="text-xs text-muted">
          {t('categories.products', { count: category.products })}
        </p>
      </div>
      <IconButton size="sm" label={t('categories.rename')} onClick={() => setDraft(category.name)}>
        <Pencil className="h-4 w-4" />
      </IconButton>
      <IconButton
        size="sm"
        label={t('common.delete')}
        className="hover:bg-danger-soft hover:text-danger-ink"
        disabled={remove.isPending}
        onClick={() => void deleteCategory()}
      >
        <Trash2 className="h-4 w-4" />
      </IconButton>
    </li>
  );
}
