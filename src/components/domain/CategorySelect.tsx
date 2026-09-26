import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { Button, IconButton, useFeedback } from '@/ui';
import { useCategories, useSaveCategory } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';

const NEW = '__new';

/**
 * The category of a product: a plain list with "Sin categoría" first and, at the end, "Nueva
 * categoría…", which turns the list into a box to type it and creates it right there (no need to
 * leave the form). Lives inside other forms, so Enter creates the category instead of submitting.
 */
export function CategorySelect({
  id,
  describedBy,
  value,
  onChange,
}: {
  id?: string;
  describedBy?: string;
  value: string | null;
  onChange: (categoryId: string | null) => void;
}) {
  const { t } = useI18n();
  const { toast } = useFeedback();
  const categories = useCategories();
  const save = useSaveCategory();
  const [draft, setDraft] = useState<string | null>(null);

  const create = async () => {
    const name = (draft ?? '').trim();
    if (name.length < 2) return;
    try {
      const category = await save.mutateAsync({ name });
      onChange(category.id);
      setDraft(null);
      toast.success(t('categories.created'));
    } catch (error) {
      toast.apiError(error);
    }
  };

  if (draft !== null) {
    return (
      <div className="flex gap-2">
        <input
          id={id}
          aria-describedby={describedBy}
          aria-label={t('categories.newTitle')}
          className="input min-w-0 flex-1"
          autoFocus
          minLength={2}
          maxLength={60}
          placeholder={t('categories.namePlaceholder')}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void create();
            } else if (event.key === 'Escape') {
              // Back to the list, not closing the dialog.
              event.preventDefault();
              event.stopPropagation();
              setDraft(null);
            }
          }}
        />
        <Button
          icon={<Check className="h-4 w-4" />}
          loading={save.isPending}
          disabled={draft.trim().length < 2}
          onClick={() => void create()}
        >
          {t('categories.create')}
        </Button>
        <IconButton label={t('common.cancel')} onClick={() => setDraft(null)}>
          <X className="h-4 w-4" />
        </IconButton>
      </div>
    );
  }

  return (
    <select
      id={id}
      aria-describedby={describedBy}
      className="input"
      value={value ?? ''}
      onChange={(event) => {
        if (event.target.value === NEW) setDraft('');
        else onChange(event.target.value || null);
      }}
    >
      <option value="">{t('categories.none')}</option>
      {(categories.data ?? []).map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
      <option value={NEW}>{t('categories.new')}</option>
    </select>
  );
}
