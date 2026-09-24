import {
  BellRing,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  History,
  Languages,
  MessageSquareText,
  Monitor,
  Moon,
  Play,
  Repeat,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Users,
  XCircle,
} from 'lucide-react';
import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  Alert,
  Badge,
  Button,
  Card,
  cx,
  DataTable,
  Page,
  PageHeader,
  Skeleton,
  Tabs,
  useFeedback,
  type DataTableColumn,
  LOCALES,
  useTheme,
  type ThemePreference,
} from '@/ui';
import {
  useNotifications,
  useReminderRules,
  useRunReminders,
  useSaveReminderRules,
  useSaveTemplate,
  useTemplates,
} from '../hooks/queries';
import { useUrlState } from '@/ui';
import { useI18n, type TranslationKey } from '../i18n/I18nProvider';
import { UsersTab } from './UsersTab';
import type { MessageTemplate, NotificationLogItem, ReminderRules } from '../lib/types';

type TabKey = 'reminders' | 'templates' | 'log' | 'users' | 'preferences';

const PREVIEW_VALUES: Record<string, string> = {
  name: 'María Quispe',
  business: 'Bodega San Martín',
  amount: 'S/ 350.00',
  date: '30 sept 2026',
  description: 'Factura F001-000123',
  daysOverdue: '6',
  paymentLink: 'https://pay.solvia.pe/abc123',
  statementUrl: 'https://solvia.pe/files/estado.pdf',
};

function renderPreview(text: string) {
  return text.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (match, key: string) => PREVIEW_VALUES[key] ?? match,
  );
}

// --- Reminders ------------------------------------------------------------------------

function TimelineStep({
  icon,
  title,
  active,
}: {
  icon: ReactNode;
  title: string;
  active: boolean;
}) {
  return (
    <li className="relative flex flex-1 flex-col items-center gap-2 text-center">
      <span
        className={cx(
          'z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 [&>svg]:h-4 [&>svg]:w-4',
          active
            ? 'border-primary bg-primary-soft text-primary-ink'
            : 'border-line bg-surface-3 text-subtle',
        )}
      >
        {icon}
      </span>
      <span className={cx('text-xs font-medium', active ? 'text-ink' : 'text-subtle line-through')}>
        {title}
      </span>
    </li>
  );
}

function RemindersTab() {
  const { t } = useI18n();
  const { isAdmin } = useAuth();
  const { toast } = useFeedback();
  const { data, isLoading } = useReminderRules();
  const save = useSaveReminderRules();
  const run = useRunReminders();
  const [draft, setDraft] = useState<ReminderRules | null>(null);
  const rules = draft ?? data;

  const update = <K extends keyof ReminderRules>(key: K, value: ReminderRules[K]) => {
    if (rules) setDraft({ ...rules, [key]: value });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!rules) return;
    try {
      await save.mutateAsync(rules);
      setDraft(null);
      toast.success(t('settings.reminders.saved'));
    } catch (error) {
      toast.apiError(error);
    }
  };

  const runNow = () =>
    run.mutate(undefined, {
      onSuccess: (result) =>
        toast.success(
          t('settings.reminders.runResult', {
            sent: result.sent,
            failed: result.failed,
            evaluated: result.evaluated,
          }),
        ),
      onError: (error) => toast.apiError(error),
    });

  if (isLoading || !rules) return <Skeleton className="h-80 w-full" />;

  return (
    <div className="grid gap-4 xl:grid-cols-5">
      <Card
        data-tour="reminder-rules"
        className="xl:col-span-3"
        title={t('settings.reminders.title')}
        subtitle={t('settings.reminders.description')}
      >
        {!isAdmin && (
          <Alert tone="info" className="mb-4">
            {t('settings.adminOnly')}
          </Alert>
        )}
        <form onSubmit={(event) => void submit(event)} className="space-y-5">
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-surface-2 px-4 py-3">
            <span className="flex items-center gap-3 text-sm font-medium">
              <BellRing className="h-4 w-4 text-primary" />
              {t('settings.reminders.enabled')}
            </span>
            <input
              type="checkbox"
              role="switch"
              className="peer sr-only"
              checked={rules.enabled}
              disabled={!isAdmin}
              onChange={(e) => update('enabled', e.target.checked)}
            />
            <span
              aria-hidden="true"
              className="relative h-6 w-11 shrink-0 rounded-full bg-line-strong transition peer-checked:bg-primary peer-focus-visible:ring-3 peer-focus-visible:ring-primary/30 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5"
            />
          </label>

          <fieldset
            disabled={!isAdmin || !rules.enabled}
            className="grid gap-4 disabled:opacity-60 sm:grid-cols-2"
          >
            <label className="text-sm">
              <span className="label">{t('settings.reminders.daysBefore')}</span>
              <input
                type="number"
                min={0}
                max={30}
                className="input tabular-nums"
                value={rules.daysBeforeDue}
                onChange={(e) => update('daysBeforeDue', Number(e.target.value))}
              />
              <span className="mt-1.5 block text-xs text-subtle">
                {t('settings.reminders.daysBeforeHint')}
              </span>
            </label>
            <label className="text-sm">
              <span className="label">{t('settings.reminders.overdueEvery')}</span>
              <input
                type="number"
                min={0}
                max={30}
                className="input tabular-nums"
                value={rules.overdueEveryDays}
                onChange={(e) => update('overdueEveryDays', Number(e.target.value))}
              />
              <span className="mt-1.5 block text-xs text-subtle">
                {t('settings.reminders.overdueEveryHint')}
              </span>
            </label>
            <label className="flex items-center gap-3 text-sm sm:col-span-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--primary)]"
                checked={rules.onDueDate}
                onChange={(e) => update('onDueDate', e.target.checked)}
              />
              {t('settings.reminders.onDueDate')}
            </label>
          </fieldset>

          {isAdmin && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
              <Button
                variant="secondary"
                icon={<Play className="h-4 w-4" />}
                loading={run.isPending}
                onClick={runNow}
              >
                {t('settings.reminders.runNow')}
              </Button>
              <Button type="submit" loading={save.isPending} disabled={!draft}>
                {t('settings.reminders.save')}
              </Button>
            </div>
          )}
        </form>
      </Card>

      <Card className="xl:col-span-2" title={t('settings.reminders.timeline')}>
        <ol className="relative flex items-start gap-2 pt-2 before:absolute before:top-7 before:right-[16%] before:left-[16%] before:h-0.5 before:bg-line">
          <TimelineStep
            icon={<CalendarClock />}
            active={rules.enabled && rules.daysBeforeDue > 0}
            title={
              rules.daysBeforeDue > 0
                ? t('settings.reminders.timelineBefore', { days: rules.daysBeforeDue })
                : t('settings.reminders.timelineOff')
            }
          />
          <TimelineStep
            icon={<CalendarCheck2 />}
            active={rules.enabled && rules.onDueDate}
            title={
              rules.onDueDate
                ? t('settings.reminders.timelineDue')
                : t('settings.reminders.timelineOff')
            }
          />
          <TimelineStep
            icon={<Repeat />}
            active={rules.enabled && rules.overdueEveryDays > 0}
            title={
              rules.overdueEveryDays > 0
                ? t('settings.reminders.timelineOverdue', { days: rules.overdueEveryDays })
                : t('settings.reminders.timelineOff')
            }
          />
        </ol>
      </Card>
    </div>
  );
}

// --- Templates ------------------------------------------------------------------------

function TemplateEditor({
  template,
  placeholders,
}: {
  template: MessageTemplate;
  placeholders: string[];
}) {
  const { t } = useI18n();
  const { isAdmin } = useAuth();
  const { toast } = useFeedback();
  const save = useSaveTemplate();
  const [text, setText] = useState(template.text);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const dirty = text !== template.text;

  const insert = (key: string) => {
    const element = textarea.current;
    const token = `{{${key}}}`;
    if (!element) return setText((current) => current + token);
    const { selectionStart, selectionEnd } = element;
    setText((current) => current.slice(0, selectionStart) + token + current.slice(selectionEnd));
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(selectionStart + token.length, selectionStart + token.length);
    });
  };

  const persist = async (reset: boolean) => {
    try {
      const result = await save.mutateAsync({ type: template.type, text, reset });
      setText(result.text);
      toast.success(reset ? t('settings.templates.restored') : t('settings.templates.saved'));
    } catch (error) {
      toast.apiError(error);
    }
  };

  return (
    <Card
      title={t(`templateTypes.${template.type}.title`)}
      subtitle={t(`templateTypes.${template.type}.description`)}
      actions={
        template.isDefault && !dirty ? (
          <Badge>{t('settings.templates.defaultText')}</Badge>
        ) : undefined
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <textarea
            ref={textarea}
            className="input min-h-32 font-mono text-xs leading-relaxed"
            value={text}
            readOnly={!isAdmin}
            aria-label={t(`templateTypes.${template.type}.title`)}
            onChange={(event) => setText(event.target.value)}
          />
          {isAdmin && (
            <>
              <p className="mt-3 mb-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">
                {t('settings.templates.variables')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {placeholders
                  .filter((key) => template.type === 'statement' || key !== 'statementUrl')
                  .map((key) => (
                    <button
                      key={key}
                      type="button"
                      title={t(`placeholders.${key}` as TranslationKey)}
                      onClick={() => insert(key)}
                      className="rounded-md border border-line bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-muted transition hover:border-primary hover:bg-primary-soft hover:text-primary-ink"
                    >
                      {`{{${key}}}`}
                    </button>
                  ))}
              </div>
            </>
          )}
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">
            {t('settings.templates.preview')}
          </p>
          {/* WhatsApp-like bubble */}
          <div className="rounded-xl bg-[#e7ded3] p-3 dark:bg-[#0b141a]">
            <div className="relative ml-auto max-w-[92%] rounded-lg rounded-tr-none bg-[#d9fdd3] px-3 py-2 text-sm text-[#111b21] shadow-sm dark:bg-[#005c4b] dark:text-[#e9edef]">
              <p className="break-words whitespace-pre-wrap">{renderPreview(text)}</p>
              <p className="mt-1 text-right text-[10px] opacity-60">10:24</p>
            </div>
          </div>
        </div>
      </div>
      {isAdmin && (
        <div className="mt-4 flex justify-end gap-2 border-t border-line pt-4">
          <Button
            variant="ghost"
            size="sm"
            icon={<RotateCcw className="h-3.5 w-3.5" />}
            disabled={save.isPending}
            onClick={() => void persist(true)}
          >
            {t('settings.templates.restore')}
          </Button>
          <Button
            size="sm"
            loading={save.isPending}
            disabled={!dirty}
            onClick={() => void persist(false)}
          >
            {t('settings.templates.save')}
          </Button>
        </div>
      )}
    </Card>
  );
}

function TemplatesTab() {
  const { t } = useI18n();
  const { data, isLoading } = useTemplates();
  if (isLoading || !data) return <Skeleton className="h-96 w-full" />;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t('settings.templates.description')}</p>
      {data.templates.map((template) => (
        <TemplateEditor
          key={`${template.type}-${template.text}`}
          template={template}
          placeholders={Object.keys(data.placeholders)}
        />
      ))}
    </div>
  );
}

// --- Send log -------------------------------------------------------------------------

function LogTab() {
  const { t, fmt } = useI18n();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const query = useNotifications({ page, pageSize });

  const columns: Array<DataTableColumn<NotificationLogItem>> = [
    {
      id: 'date',
      sortValue: (row) => row.sentAt,
      header: t('settings.log.date'),
      minWidth: 160,
      mobile: 'subtitle',
      cell: (row) => fmt.dateTime(row.sentAt),
    },
    {
      id: 'customer',
      sortValue: (row) => row.receivable.customer.name,
      header: t('settings.log.customer'),
      mobile: 'title',
      cell: (row) => <span className="font-medium">{row.receivable.customer.name}</span>,
    },
    {
      id: 'type',
      sortValue: (row) => (row.templateType ? t(`templateTypes.${row.templateType}.title`) : null),
      header: t('settings.log.type'),
      cell: (row) => (row.templateType ? t(`templateTypes.${row.templateType}.title`) : '—'),
    },
    {
      id: 'status',
      sortValue: (row) => row.status,
      header: t('settings.log.status'),
      mobile: 'aside',
      cell: (row) =>
        row.status === 'sent' ? (
          <Badge tone="success" icon={<CheckCircle2 />}>
            {t('settings.log.sent')}
          </Badge>
        ) : (
          <Badge tone="danger" icon={<XCircle />}>
            {t('settings.log.failed')}
          </Badge>
        ),
    },
    {
      id: 'content',
      sortValue: (row) => row.sentContent,
      header: t('settings.log.content'),
      minWidth: 320,
      cell: (row) => <p className="line-clamp-2 max-w-2xl text-muted">{row.sentContent}</p>,
    },
  ];

  return (
    <DataTable
      columnsStorageKey="send-log"
      caption={t('settings.log.title')}
      columns={columns}
      rows={query.data?.data}
      rowKey={(row) => row.id}
      loading={query.isLoading}
      fetching={query.isFetching && !query.isLoading}
      empty={{ title: t('settings.log.empty') }}
      pagination={
        query.data && {
          ...query.data.meta,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setPage(1);
          },
        }
      }
    />
  );
}

// --- Preferences ----------------------------------------------------------------------

function ChoiceCard({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cx(
        'flex flex-1 flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 text-sm font-medium transition [&>svg]:h-5 [&>svg]:w-5',
        active
          ? 'border-primary bg-primary-soft text-primary-ink'
          : 'border-line text-muted hover:border-line-strong hover:text-ink',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function PreferencesTab() {
  const { t, locale, setLocale } = useI18n();
  const { preference, setPreference } = useTheme();
  const themes: Array<{ value: ThemePreference; label: TranslationKey; icon: ReactNode }> = [
    { value: 'light', label: 'prefs.themeLight', icon: <Sun /> },
    { value: 'dark', label: 'prefs.themeDark', icon: <Moon /> },
    { value: 'system', label: 'prefs.themeSystem', icon: <Monitor /> },
  ];

  return (
    <Card
      title={t('settings.preferences.title')}
      subtitle={t('settings.preferences.description')}
      className="max-w-2xl"
    >
      <div className="space-y-6">
        <div>
          <p className="label">{t('settings.preferences.language')}</p>
          <div
            role="radiogroup"
            aria-label={t('settings.preferences.language')}
            className="flex gap-3"
          >
            {LOCALES.map((option) => (
              <ChoiceCard
                key={option.value}
                active={locale === option.value}
                onClick={() => setLocale(option.value)}
                icon={<Languages />}
                label={option.label}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="label">{t('settings.preferences.theme')}</p>
          <div
            role="radiogroup"
            aria-label={t('settings.preferences.theme')}
            className="flex gap-3"
          >
            {themes.map((option) => (
              <ChoiceCard
                key={option.value}
                active={preference === option.value}
                onClick={() => setPreference(option.value)}
                icon={option.icon}
                label={t(option.label)}
              />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

// --- Page -----------------------------------------------------------------------------

export function SettingsPage() {
  const { t } = useI18n();
  const { isAdmin } = useAuth();
  const [state, update] = useUrlState({ tab: 'reminders' });
  // Only admins manage the team; anyone else asking for ?tab=users lands on the first tab.
  const tab = (state.tab === 'users' && !isAdmin ? 'reminders' : state.tab) as TabKey;

  return (
    <Page fill={tab === 'log'}>
      <PageHeader title={t('settings.title')} description={t('settings.subtitle')} />
      <Tabs
        label={t('settings.title')}
        value={tab}
        onChange={(value) => update({ tab: value })}
        items={[
          { value: 'reminders', label: t('settings.tabs.reminders'), icon: <SlidersHorizontal /> },
          { value: 'templates', label: t('settings.tabs.templates'), icon: <MessageSquareText /> },
          { value: 'log', label: t('settings.tabs.log'), icon: <History /> },
          ...(isAdmin
            ? [{ value: 'users' as const, label: t('settings.tabs.users'), icon: <Users /> }]
            : []),
          { value: 'preferences', label: t('settings.tabs.preferences'), icon: <Languages /> },
        ]}
      />
      {tab === 'reminders' && <RemindersTab />}
      {tab === 'templates' && <TemplatesTab />}
      {tab === 'log' && <LogTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'preferences' && <PreferencesTab />}
    </Page>
  );
}
