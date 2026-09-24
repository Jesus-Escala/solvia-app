import {
  KeyRound,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  UserCheck,
  UserPlus,
  UserX,
} from 'lucide-react';
import { useState } from 'react';
import { useUiI18n } from '../i18n/context';
import { useErrorText } from '../i18n/useErrorText';
import { useErrorToast } from './Overlays';
import { IconButton, Button } from './Button';
import { DataTable, type DataTableColumn } from './DataTable';
import { Avatar, Badge } from './Display';
import { Alert } from './Feedback';
import { Field, SegmentedControl } from './Form';
import { Modal } from './Modal';
import { MenuItems, Popover, useFeedback } from './Overlays';
import { TemporaryPasswordDialog } from './TemporaryPasswordDialog';

export type TeamRole = 'admin' | 'collector';

/** A user of a business, as returned by `GET /users` and the backoffice tenant detail. */
export interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  active: boolean;
  mustChangePassword: boolean;
  hasGoogle: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface TeamUserInput {
  name: string;
  email: string;
  role: TeamRole;
}

export interface TeamUserChanges {
  name?: string;
  role?: TeamRole;
  active?: boolean;
}

function UserForm({
  user,
  onClose,
  onSubmit,
}: {
  user?: TeamUser;
  onClose: () => void;
  onSubmit: (input: TeamUserInput) => Promise<void>;
}) {
  const { t } = useUiI18n();
  const errors = useErrorText();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState<TeamRole>(user?.role ?? 'collector');
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), email: email.trim(), role });
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  useErrorToast(error);

  return (
    <form
      className="space-y-3.5"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <Field label={t('team.name')} error={errors.field(error, 'name')}>
        {(id) => (
          <input
            id={id}
            className="input"
            required
            minLength={2}
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        )}
      </Field>
      <Field label={t('team.email')} error={errors.field(error, 'email')}>
        {(id) => (
          <input
            id={id}
            className="input"
            type="email"
            required
            disabled={Boolean(user)}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        )}
      </Field>
      <div>
        <p className="label">{t('team.role')}</p>
        <SegmentedControl
          label={t('team.role')}
          value={role}
          onChange={setRole}
          options={[
            { value: 'collector', label: t('team.roles.collector') },
            { value: 'admin', label: t('team.roles.admin') },
          ]}
        />
        <p className="mt-1.5 text-xs text-subtle">
          {role === 'admin' ? t('team.roleHintAdmin') : t('team.roleHintCollector')}
        </p>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          {t('team.cancel')}
        </Button>
        <Button type="submit" loading={saving}>
          {user ? t('team.save') : t('team.create')}
        </Button>
      </div>
    </form>
  );
}

/**
 * Team management table (create, edit, disable, reset password). The parent supplies the API
 * calls, so the same component serves any endpoint that returns `TeamUser`s.
 */
export function TeamUsers({
  users,
  loading,
  error,
  currentUserId,
  loginUrl,
  onCreate,
  onUpdate,
  onResetPassword,
  title,
}: {
  users: TeamUser[] | undefined;
  loading?: boolean;
  error?: unknown;
  /** The signed-in user (cannot disable themself or change their own role). */
  currentUserId?: string;
  /** Sign-in URL shared with new users. */
  loginUrl: string;
  onCreate: (input: TeamUserInput) => Promise<{ user: TeamUser; temporaryPassword: string }>;
  onUpdate: (id: string, changes: TeamUserChanges) => Promise<unknown>;
  onResetPassword: (id: string) => Promise<{ temporaryPassword: string }>;
  title?: string;
}) {
  const { t, fmt } = useUiI18n();
  const errors = useErrorText();
  const { toast, confirm } = useFeedback();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TeamUser | null>(null);
  const [credentials, setCredentials] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);

  const toggleActive = async (user: TeamUser) => {
    const disabling = user.active;
    const confirmed = await confirm({
      title: t(disabling ? 'team.disableTitle' : 'team.enableTitle', { name: user.name }),
      message: t(disabling ? 'team.disableMessage' : 'team.enableMessage'),
      confirmLabel: t(disabling ? 'team.disable' : 'team.enable'),
      cancelLabel: t('team.cancel'),
      tone: disabling ? 'danger' : 'primary',
    });
    if (!confirmed) return;
    try {
      await onUpdate(user.id, { active: !user.active });
      toast.success(t(disabling ? 'team.disabled' : 'team.enabled', { name: user.name }));
    } catch (err) {
      toast.apiError(err);
    }
  };

  const resetPassword = async (user: TeamUser) => {
    const confirmed = await confirm({
      title: t('team.resetTitle', { name: user.name }),
      message: t('team.resetMessage'),
      confirmLabel: t('team.reset'),
      cancelLabel: t('team.cancel'),
      tone: 'primary',
    });
    if (!confirmed) return;
    try {
      const { temporaryPassword } = await onResetPassword(user.id);
      setCredentials({ name: user.name, email: user.email, password: temporaryPassword });
    } catch (err) {
      toast.apiError(err);
    }
  };

  const columns: Array<DataTableColumn<TeamUser>> = [
    {
      id: 'name',
      sortValue: (row) => row.name,
      header: t('team.name'),
      hideable: false,
      minWidth: 220,
      mobile: 'title',
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={row.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium">
              {row.name}
              {row.id === currentUserId && (
                <span className="ml-1.5 text-xs font-normal text-subtle">{t('team.you')}</span>
              )}
            </p>
            <p className="truncate text-xs text-subtle">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'role',
      sortValue: (row) => t(`team.roles.${row.role}`),
      header: t('team.role'),
      mobile: 'aside',
      cell: (row) => (
        <Badge tone={row.role === 'admin' ? 'primary' : 'neutral'}>
          {t(`team.roles.${row.role}`)}
        </Badge>
      ),
    },
    {
      id: 'status',
      sortValue: (row) => (!row.active ? 2 : row.mustChangePassword ? 1 : 0),
      header: t('team.status'),
      mobile: 'subtitle',
      cell: (row) =>
        !row.active ? (
          <Badge tone="danger" dot>
            {t('team.statusDisabled')}
          </Badge>
        ) : row.mustChangePassword ? (
          <Badge tone="warning" dot title={t('team.statusPendingHint')}>
            {t('team.statusPending')}
          </Badge>
        ) : (
          <Badge tone="success" dot>
            {t('team.statusActive')}
          </Badge>
        ),
    },
    {
      id: 'signIn',
      sortValue: (row) => (row.hasGoogle ? t('team.google') : t('team.password')),
      header: t('team.signIn'),
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 text-muted">
          <KeyRound className="h-3.5 w-3.5" />
          {row.hasGoogle ? t('team.google') : t('team.password')}
        </span>
      ),
    },
    {
      id: 'lastLogin',
      sortValue: (row) => row.lastLoginAt,
      header: t('team.lastLogin'),
      cell: (row) =>
        row.lastLoginAt ? (
          fmt.dateTime(row.lastLoginAt)
        ) : (
          <span className="text-subtle">{t('team.never')}</span>
        ),
    },
  ];

  return (
    <>
      <DataTable
        fill={false}
        maxHeight={440}
        caption={title ?? t('team.title')}
        columns={columns}
        rows={users}
        rowKey={(row) => row.id}
        loading={loading}
        error={error ? <Alert tone="danger">{errors.message(error)}</Alert> : undefined}
        rowClassName={(row) => (row.active ? undefined : 'opacity-60')}
        empty={{ title: t('team.empty') }}
        toolbar={
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            {title ?? t('team.title')}
            {users && (
              <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs text-muted tabular-nums">
                {fmt.number(users.length)}
              </span>
            )}
          </h2>
        }
        toolbarEnd={
          <Button
            size="sm"
            icon={<UserPlus className="h-4 w-4" />}
            onClick={() => setCreating(true)}
          >
            {t('team.new')}
          </Button>
        }
        rowActions={(row) => {
          const self = row.id === currentUserId;
          return (
            <Popover
              trigger={({ toggle, ref }) => (
                <IconButton ref={ref} size="sm" label={t('team.actions')} onClick={toggle}>
                  <MoreHorizontal className="h-4 w-4" />
                </IconButton>
              )}
            >
              {(close) => (
                <MenuItems
                  close={close}
                  items={[
                    { label: t('team.edit'), icon: <Pencil />, onSelect: () => setEditing(row) },
                    {
                      label: t('team.reset'),
                      icon: <RotateCcw />,
                      onSelect: () => void resetPassword(row),
                      hidden: self || !row.active,
                    },
                    {
                      label: row.active ? t('team.disable') : t('team.enable'),
                      icon: row.active ? <UserX /> : <UserCheck />,
                      onSelect: () => void toggleActive(row),
                      danger: row.active,
                      hidden: self,
                    },
                  ]}
                />
              )}
            </Popover>
          );
        }}
      />

      <Modal
        open={creating}
        size="sm"
        title={t('team.newTitle')}
        description={t('team.newHint')}
        onClose={() => setCreating(false)}
      >
        <UserForm
          onClose={() => setCreating(false)}
          onSubmit={async (input) => {
            const { user, temporaryPassword } = await onCreate(input);
            setCreating(false);
            toast.success(t('team.created', { name: user.name }));
            setCredentials({ name: user.name, email: user.email, password: temporaryPassword });
          }}
        />
      </Modal>
      <Modal
        open={editing !== null}
        size="sm"
        title={t('team.editTitle')}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <UserForm
            user={editing}
            onClose={() => setEditing(null)}
            onSubmit={async (input) => {
              const changes: TeamUserChanges = { name: input.name };
              if (editing.id !== currentUserId) changes.role = input.role;
              await onUpdate(editing.id, changes);
              setEditing(null);
              toast.success(t('team.saved'));
            }}
          />
        )}
      </Modal>
      <TemporaryPasswordDialog
        credentials={credentials}
        appUrl={loginUrl}
        onClose={() => setCredentials(null)}
      />
    </>
  );
}
