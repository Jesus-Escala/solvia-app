import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  CashFlow,
  DebtConcentration,
  Customer,
  CustomerDetail,
  CustomerListItem,
  CustomerOption,
  DashboardSummary,
  Me,
  MessageTemplate,
  MonthlyReport,
  Notification,
  NotificationLogItem,
  Paginated,
  Payment,
  Product,
  ProductOption,
  ProductUnit,
  PaymentLink,
  PaymentMethod,
  Receivable,
  ReceivableStatus,
  ReminderRules,
  ReportId,
  ReportPeriod,
  ReportTypes,
  Sale,
  SaleDocType,
  ReminderRunSummary,
  RiskLevel,
  SortDir,
  Supplier,
  SupplierOption,
  Purchase,
  AdjustmentReason,
  StockMovement,
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

// --- Product catalog (sales / inventory modules) ---------------------------

export interface ProductListParams {
  search?: string | null;
  status?: 'active' | 'archived' | 'all' | null;
  /** Only counted products at or below their alert level. */
  lowStock?: boolean | null;
  page: number;
  pageSize?: number | null;
  sortBy?: 'name' | 'code' | 'price' | 'cost' | 'createdAt' | null;
  sortDir?: SortDir | null;
}

export function useProducts(params: ProductListParams, enabled = true) {
  return useQuery({
    queryKey: ['products', params] as const,
    queryFn: () => api.get<Paginated<Product>>('/products', { ...params }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/**
 * Picker searches: a light endpoint, cached for a while (the same text typed again answers at
 * once), the previous request cancelled when the text changes, and the last results kept on
 * screen while the next ones load (`isPlaceholderData` tells them apart).
 */
const LOOKUP_STALE_MS = 30_000;

export const productLookupQuery = (search: string) => ({
  queryKey: ['products', 'lookup', search] as const,
  queryFn: ({ signal }: { signal: AbortSignal }) =>
    api.get<{ data: ProductOption[] }>('/products/lookup', { search }, { signal }),
  staleTime: LOOKUP_STALE_MS,
});

export function useProductLookup(search: string) {
  return useQuery({ ...productLookupQuery(search), placeholderData: keepPreviousData });
}

export function useCustomerLookup(search: string) {
  return useQuery({
    queryKey: ['customers', 'lookup', search] as const,
    queryFn: ({ signal }) =>
      api.get<{ data: CustomerOption[] }>('/customers/lookup', { search }, { signal }),
    staleTime: LOOKUP_STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export interface ProductInput {
  name: string;
  code?: string | null;
  unit?: ProductUnit;
  price?: number;
  cost?: number | null;
  trackStock?: boolean;
  minStock?: number | null;
  active?: boolean;
}

export function useSaveProduct(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProductInput) =>
      id ? api.patch<Product>(`/products/${id}`, input) : api.post<Product>('/products', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}

/** Kardex of a product: its stock movements, newest first. */
export function useProductMovements(id: string | null, page = 1) {
  return useQuery({
    queryKey: ['products', 'movements', id, page] as const,
    queryFn: () =>
      api.get<Paginated<StockMovement>>(`/products/${id}/movements`, { page, pageSize: 20 }),
    enabled: id !== null,
    placeholderData: keepPreviousData,
  });
}

/** Archives (`active: false`) or restores a product. */
export function useSetProductActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch<Product>(`/products/${id}`, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}

// --- Sales (sales module) ------------------------------------------------------

export interface SaleListParams {
  search?: string | null;
  paymentType?: 'cash' | 'credit' | null;
  status?: 'completed' | 'voided' | null;
  /** Only sales that sold counted products beyond their stock. */
  shortage?: boolean | null;
  from?: string | null;
  to?: string | null;
  page: number;
  pageSize?: number | null;
}

export function useSales(params: SaleListParams) {
  return useQuery({
    queryKey: ['sales', params] as const,
    queryFn: () => api.get<Paginated<Sale>>('/sales', { ...params }),
    placeholderData: keepPreviousData,
  });
}

export interface SaleInput {
  paymentType: 'cash' | 'credit';
  method?: PaymentMethod;
  customerId?: string;
  dueDate?: string;
  docType?: SaleDocType;
  docNumber?: string | null;
  items: Array<{ productId: string; quantity: number; unitPrice?: number }>;
}

/** A sale touches stock (products) and, on credit, receivables and the dashboard. */
function useInvalidateSales() {
  const queryClient = useQueryClient();
  const invalidateCollections = useInvalidateCollections();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['sales'] });
    void queryClient.invalidateQueries({ queryKey: ['products'] });
    return invalidateCollections();
  };
}

export function useCreateSale() {
  const invalidate = useInvalidateSales();
  return useMutation({
    mutationFn: (input: SaleInput) =>
      api.post<{ sale: Sale; lowStock: Array<{ productId: string; name: string; stock: number }> }>(
        '/sales',
        input,
      ),
    onSuccess: invalidate,
  });
}

export function useVoidSale() {
  const invalidate = useInvalidateSales();
  return useMutation({
    mutationFn: (id: string) => api.post<Sale>(`/sales/${id}/void`, {}),
    onSuccess: invalidate,
  });
}

// --- Inventory: suppliers, purchases, adjustments (inventory module) --------

export function useSuppliers(params: { search?: string | null; page: number; pageSize?: number }) {
  return useQuery({
    queryKey: ['suppliers', params] as const,
    queryFn: () => api.get<Paginated<Supplier>>('/suppliers', { ...params }),
    placeholderData: keepPreviousData,
  });
}

export function useSupplierLookup(search: string) {
  return useQuery({
    queryKey: ['suppliers', 'lookup', search] as const,
    queryFn: ({ signal }) =>
      api.get<{ data: SupplierOption[] }>('/suppliers/lookup', { search }, { signal }),
    staleTime: LOOKUP_STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export interface SupplierInput {
  name?: string;
  documentId?: string | null;
  phone?: string | null;
  notes?: string | null;
}

export function useSaveSupplier(id: string | null = null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SupplierInput) =>
      id === null
        ? api.post<Supplier>('/suppliers', input)
        : api.patch<Supplier>(`/suppliers/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/suppliers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

export function usePurchases(params: {
  search?: string | null;
  status?: 'completed' | 'voided' | null;
  page: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: ['purchases', params] as const,
    queryFn: () => api.get<Paginated<Purchase>>('/purchases', { ...params }),
    placeholderData: keepPreviousData,
  });
}

export interface PurchaseInput {
  supplierId?: string;
  docType?: SaleDocType;
  docNumber?: string | null;
  updateCosts?: boolean;
  items: Array<{ productId: string; quantity: number; unitCost: number }>;
}

/** Purchases and adjustments change stock (and costs): products and the kardex refresh. */
function useInvalidateStock() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['purchases'] }),
      queryClient.invalidateQueries({ queryKey: ['products'] }),
      queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
    ]);
}

export function useCreatePurchase() {
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: (input: PurchaseInput) => api.post<Purchase>('/purchases', input),
    onSuccess: invalidate,
  });
}

export function useVoidPurchase() {
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: (id: string) => api.post<Purchase>(`/purchases/${id}/void`, {}),
    onSuccess: invalidate,
  });
}

export function useAdjustStock() {
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: ({
      productId,
      ...input
    }: {
      productId: string;
      reason: AdjustmentReason;
      quantity: number;
      note: string | null;
    }) => api.post<Product>(`/products/${productId}/adjust`, input),
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

// --- Tabular reports -------------------------------------------------------------

/** One tabular report; the stock report ignores the period (it is a snapshot of today). */
export function useReport<R extends ReportId>(report: R, period: ReportPeriod | null) {
  return useQuery({
    queryKey: ['reports', report, period] as const,
    queryFn: ({ signal }) =>
      api.get<ReportTypes[R]>(`/reports/${report}`, { ...period }, { signal }),
    placeholderData: keepPreviousData,
  });
}
