import { TeamUsers } from '@/ui';
import { useAuth } from '../auth/AuthContext';
import {
  useCreateUser,
  useResetUserPassword,
  useTenantUsers,
  useUpdateUser,
} from '../hooks/queries';
import { APP_LOGIN_URL } from '../lib/config';

/** Settings → Users: the business admin manages the team (create, edit, disable, reset). */
export function UsersTab() {
  const { user } = useAuth();
  const users = useTenantUsers();
  const create = useCreateUser();
  const update = useUpdateUser();
  const reset = useResetUserPassword();

  return (
    <TeamUsers
      users={users.data}
      loading={users.isLoading}
      error={users.error}
      currentUserId={user?.id}
      loginUrl={APP_LOGIN_URL}
      onCreate={(input) => create.mutateAsync(input)}
      onUpdate={(id, changes) => update.mutateAsync({ id, ...changes })}
      onResetPassword={(id) => reset.mutateAsync(id)}
    />
  );
}
