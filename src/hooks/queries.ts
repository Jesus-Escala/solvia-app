import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  CashFlow,
  DebtConcentration,
  Customer,
  CustomerDetail,
  CustomerListItem,
  DashboardSummary,
  Me,
  MessageTemplate,
  MonthlyReport,
  Notification,
  NotificationLogItem,
  Paginated,
  Payment,
  PaymentLink,
  PaymentMethod,
  Receivable,
  ReceivableStatus,
  ReminderRules,
  ReminderRunSummary,
  RiskLevel,
  SortDir,
  TemplateType,
  AuthConfig,
  AnalyticsGranularity,
  DashboardAnalytics,
  TenantUser,
  UserRole,
} from '../lib/types';

export const queryKeys = {
  me: ['me'] as const,
  dashboard: ['dashboard'] as const,
  cashFlow: (groupBy: string, periods: number) =>
    ['dashboard', 'cash-flow', groupBy, periods] as const,
  reports: ['reports'] as const,
  customers: ['customers'] as const,
  customerList: (params: object) => ['customers', 'list', params] as const,
  customer: (id: string) => ['customers', 'detail', id] as const,
  receivables: ['receivables'] as const,
  receivableList: (params: object) => ['receivables', 'list', params] as const,
  templates: ['settings', 'templates'] as const,
  reminderRules: ['settings', 'reminders'] as const,
  notifications: (params: object) => ['notifications', params] as const,
  authConfig: ['auth-config'] as const,
  users: ['users'] as const,
};

/** Data that depends on receivables and payments. */
function useInvalidateCollections() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.customers }),
      queryClient.invalidateQueries({ queryKey: queryKeys.receivables }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    ]);
}

// --- Session ---------------------------------------------------------------

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api.get<Me>('/auth/me'),
    staleTime: 5 * 60_000,
  });
}

/** Sign-in options (Google client id, whether self sign-up is open). Public endpoint. */
export function useAuthConfig() {
  return useQuery({
    queryKey: queryKeys.authConfig,
    queryFn: () => api.public.get<AuthConfig>('/auth/config'),
    staleTime: Infinity,
  });
}

// --- Team users (admins only) ------------------------------------------------

export function useTenantUsers() {
  return useQuery({ queryKey: queryKeys.users, queryFn: () => api.get<TenantUser[]>('/users') });
}

export interface UserInput {
  name: string;
  email: string;
  role: UserRole;
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UserInput) =>
      api.post<{ user: TenantUser; temporaryPassword: string }>('/users', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...changes
    }: {
      id: string;
      name?: string;
      role?: UserRole;
      active?: boolean;
    }) => api.patch<TenantUser>(`/users/${id}`, changes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users }),
  });
}

export function useResetUserPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ temporaryPassword: string }>(`/users/${id}/reset-password`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users }),
  });
}

// --- Dashboard -------------------------------------------------------------

export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => api.get<DashboardSummary>('/dashboard/summary'),
  });
}

/** Period analytics (keeps the previous period's data on screen while the next one loads). */
export function useDashboardAnalytics(params: {
  from: string;
  to: string;
  granularity?: AnalyticsGranularity;
  /** Cross-filters (omitted when undefined). */
  method?: PaymentMethod;
  customerId?: string;
  weekday?: number;
}) {
  return useQuery({
    queryKey: [...queryKeys.dashboard, 'analytics', params],
    queryFn: () => api.get<DashboardAnalytics>('/dashboard/analytics', { ...params }),
    placeholderData: keepPreviousData,
  });
}

export function useCashFlow(groupBy: 'week' | 'month', periods: number) {
  return useQuery({
    queryKey: queryKeys.cashFlow(groupBy, periods),
    queryFn: () => api.get<CashFlow>('/dashboard/cash-flow', { groupBy, periods }),
    placeholderData: keepPreviousData,
  });
}

/** Every debtor the export can ask for (the API maximum). */
export const ALL_DEBTORS = 5000;

export const concentrationQuery = (limit: number) => ({
  queryKey: [...queryKeys.dashboard, 'concentration', limit] as const,
  queryFn: () => api.get<DebtConcentration>('/dashboard/concentration', { limit }),
});

/** Pareto / ABC of the debtors with the `limit` largest ones. */
export function useDebtConcentration(limit = 20) {
  return useQuery(concentrationQuery(limit));
}

export function useGenerateMonthlyReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<MonthlyReport>('/reports/monthly/generate', {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
  });
}

// --- Customers -------------------------------------------------------------

export interface CustomerListParams {
  search?: string;
  risk?: RiskLevel;
  page: number;
  pageSize?: number;
  sortBy?: 'name' | 'phone' | 'createdAt' | 'outstanding' | 'risk' | 'open' | 'overdue';
  sortDir?: SortDir;
}

export function useCustomers(params: CustomerListParams) {
  return useQuery({
    queryKey: queryKeys.customerList(params),
    queryFn: () => api.get<Paginated<CustomerListItem>>('/customers', { ...params }),
    placeholderData: keepPreviousData,
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: queryKeys.customer(id),
    queryFn: () => api.get<CustomerDetail>(`/customers/${id}`),
  });
}

export interface CustomerInput {
  name: string;
  phone: string;
  documentId?: string | null;
  notes?: string | null;
}

export function useSaveCustomer(id?: string) {
  const invalidate = useInvalidateCollections();
  return useMutation({
    mutationFn: (input: CustomerInput) =>
      id ? api.patch<Customer>(`/customers/${id}`, input) : api.post<Customer>('/customers', input),
    onSuccess: invalidate,
  });
}

export function useDeleteCustomer() {
  const invalidate = useInvalidateCollections();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}`),
    onSuccess: invalidate,
  });
}

export function useSendStatement() {
  const invalidate = useInvalidateCollections();
  return useMutation({
    mutationFn: (customerId: string) =>
      api.post<{ statementUrl: string; notification: Notification; whatsappUrl?: string }>(
        `/customers/${customerId}/statement/send`,
      ),
    onSuccess: invalidate,
  });
}

// --- Receivables & payments -----------------------------------------------

export interface ReceivableListParams {
  /** One status or a comma-separated list (`pending,overdue`). */
  status?: ReceivableStatus | '' | (string & {});
  search?: string;
  customerId?: string;
  /** Due date range (YYYY-MM-DD, both inclusive). */
  dueFrom?: string;
  dueTo?: string;
  page: number;
  pageSize?: number;
  sortBy?:
    | 'dueDate'
    | 'issueDate'
    | 'totalAmount'
    | 'outstanding'
    | 'paymentMethod'
    | 'description'
    | 'status'
    | 'customer'
    | 'createdAt';
  sortDir?: SortDir;
}

export function useReceivables(params: ReceivableListParams) {
  return useQuery({
    queryKey: queryKeys.receivableList(params),
    queryFn: () => api.get<Paginated<Receivable>>('/receivables', { ...params }),
    placeholderData: keepPreviousData,
  });
}

export interface ReceivableInput {
  customerId: string;
  description: string;
  totalAmount: number;
  issueDate: string;
  dueDate: string;
}

export function useSaveReceivable(id?: string) {
  const invalidate = useInvalidateCollections();
  return useMutation({
    mutationFn: (input: ReceivableInput) => {
      if (!id) return api.post<Receivable>('/receivables', input);
      const { customerId: _customerId, ...changes } = input;
      return api.patch<Receivable>(`/receivables/${id}`, changes);
    },
    onSuccess: invalidate,
  });
}

export function useDeleteReceivable() {
  const invalidate = useInvalidateCollections();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/receivables/${id}`),
    onSuccess: invalidate,
  });
}

export interface PaymentInput {
  receivableId: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  proof?: File | null;
}

export function useRegisterPayment() {
  const invalidate = useInvalidateCollections();
  return useMutation({
    mutationFn: ({ receivableId, proof, ...input }: PaymentInput) => {
      const form = new FormData();
      form.set('amount', String(input.amount));
      form.set('method', input.method);
      form.set('date', input.date);
      if (proof) form.set('proof', proof);
      return api.post<{ payment: Payment; receivable: Receivable }>(
        `/receivables/${receivableId}/payments`,
        form,
      );
    },
    // The statement is sent in the background; refresh again shortly to show its log entry.
    onSuccess: async () => {
      await invalidate();
      setTimeout(() => void invalidate(), 1500);
    },
  });
}

export function usePaymentLink() {
  return useMutation({
    mutationFn: (receivableId: string) =>
      api.post<PaymentLink>(`/receivables/${receivableId}/payment-link`),
  });
}

export function useSendReminder() {
  const invalidate = useInvalidateCollections();
  return useMutation({
    mutationFn: (receivableId: string) =>
      // `whatsappUrl`: click-to-chat link, only when no real WhatsApp provider is configured.
      api.post<Notification & { whatsappUrl?: string }>(`/receivables/${receivableId}/remind`),
    onSuccess: invalidate,
  });
}

// --- Settings & notifications ---------------------------------------------

export function useTemplates() {
  return useQuery({
    queryKey: queryKeys.templates,
    queryFn: () =>
      api.get<{ templates: MessageTemplate[]; placeholders: Record<string, string> }>(
        '/settings/templates',
      ),
  });
}

export function useSaveTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, text, reset }: { type: TemplateType; text?: string; reset?: boolean }) =>
      reset
        ? api.post<MessageTemplate>(`/settings/templates/${type}/reset`)
        : api.put<MessageTemplate>(`/settings/templates/${type}`, { text }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.templates }),
  });
}

export function useReminderRules() {
  return useQuery({
    queryKey: queryKeys.reminderRules,
    queryFn: () => api.get<ReminderRules>('/settings/reminders'),
  });
}

export function useSaveReminderRules() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rules: ReminderRules) => api.put<ReminderRules>('/settings/reminders', rules),
    onSuccess: (rules) => queryClient.setQueryData(queryKeys.reminderRules, rules),
  });
}

export function useRunReminders() {
  const invalidate = useInvalidateCollections();
  return useMutation({
    mutationFn: () => api.post<ReminderRunSummary>('/reminders/run'),
    onSuccess: invalidate,
  });
}

export function useNotifications(params: {
  page: number;
  pageSize?: number;
  receivableId?: string;
  customerId?: string;
}) {
  return useQuery({
    queryKey: queryKeys.notifications(params),
    queryFn: () => api.get<Paginated<NotificationLogItem>>('/notifications', { ...params }),
    placeholderData: keepPreviousData,
  });
}
