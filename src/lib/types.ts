export type UserRole = 'admin' | 'collector';
export type ReceivableStatus = 'pending' | 'partial' | 'paid' | 'overdue';
export type PaymentMethod = 'yape' | 'plin' | 'cash' | 'bank_transfer';
export type RiskLevel = 'low' | 'medium' | 'high';
export type TemplateType = 'pre_due_reminder' | 'due_reminder' | 'overdue_reminder' | 'statement';
export type NotificationStatus = 'sent' | 'failed';

export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string;
  /** Signed in with a temporary password: must set a new one before using the app. */
  mustChangePassword?: boolean;
}

/** Public sign-in options of this deployment (`GET /auth/config`). */
export interface AuthConfig {
  googleClientId: string | null;
  signupEnabled: boolean;
}

/** A member of the business team (Settings → Users). */
export interface TenantUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  mustChangePassword: boolean;
  hasGoogle: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AuthResponse {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
  tenant?: Tenant;
}

/** Optional modules enabled from the backoffice (the product catalog comes with any of them). */
export type TenantModule = 'collections' | 'sales' | 'inventory';

export interface Tenant {
  id: string;
  name: string;
  industry: string | null;
  plan: string;
  modules: TenantModule[];
}

export type ProductUnit = 'unit' | 'kg' | 'liter' | 'box' | 'pack' | 'dozen' | 'meter';

/** A product (can be counted in stock) or a service (never counted). */
export type ProductKind = 'product' | 'service';

export interface Product {
  id: string;
  kind: ProductKind;
  name: string;
  /** Its own barcode, or the internal code Solvia gave it (printed as its QR). */
  code: string | null;
  /** Picture (`/files/products/...`). */
  imageUrl: string | null;
  unit: ProductUnit;
  price: number;
  cost: number | null;
  trackStock: boolean;
  /** Current stock (sales take it out; can be negative). */
  stock: number;
  minStock: number | null;
  /** Sack/box it is bought in, in its unit (e.g. 10 kg); null when bought loose. */
  packSize: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Me extends SessionUser {
  createdAt: string;
  tenant: Tenant;
}

export interface RiskScore {
  level: RiskLevel;
  points: number;
  metrics: {
    evaluatedReceivables: number;
    onTimeRate: number | null;
    averageDaysOverdue: number;
    currentOverdueCount: number;
  };
}

export interface CustomerSummary {
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
  openReceivables: number;
  overdueReceivables: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  documentId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CustomerListItem extends Customer {
  risk: RiskScore;
  summary: CustomerSummary;
}

export interface Payment {
  id: string;
  receivableId: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  proofUrl: string | null;
}

export interface Receivable {
  id: string;
  customerId: string;
  customer?: { id: string; name: string; phone: string };
  description: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  issueDate: string;
  dueDate: string;
  status: ReceivableStatus;
  createdAt: string;
  /** List endpoint only: distinct payment methods used, most recent first. */
  paymentMethods?: PaymentMethod[];
}

export interface CustomerDetail extends CustomerListItem {
  receivables: Receivable[];
  payments: Array<Payment & { receivableDescription: string }>;
}

export interface Notification {
  id: string;
  receivableId: string;
  channel: 'whatsapp';
  templateType: TemplateType | null;
  status: NotificationStatus;
  sentAt: string;
  sentContent: string;
}

export interface NotificationLogItem extends Notification {
  receivable: { id: string; description: string; customer: { id: string; name: string } };
}

export interface MonthlyReport {
  id: string;
  period: string;
  totalCollected: number;
  totalPending: number;
  topOverdueCustomers: Array<{
    customerId: string;
    name: string;
    phone: string;
    overdueAmount: number;
    overdueCount: number;
  }>;
  generatedAt: string;
}

export type AgingBucketKey = 'current' | 'days1to30' | 'days31to60' | 'days61to90' | 'days90plus';

export interface DashboardSummary {
  currency: string;
  totals: {
    outstanding: number;
    overdue: number;
    collectedThisMonth: number;
    collectedLastMonthToDate: number;
    collectedAllTime: number;
    overdueRate: number;
    dueNext7Days: { amount: number; count: number };
    customers: number;
  };
  byStatus: Record<
    ReceivableStatus,
    { count: number; totalAmount: number; outstandingAmount: number }
  >;
  aging: Array<{ key: AgingBucketKey; amount: number; count: number }>;
  collectionTrend: Array<{ period: string; amount: number; count: number }>;
  topDebtors: Array<{
    customerId: string;
    name: string;
    outstanding: number;
    overdue: number;
    receivables: number;
  }>;
  riskDistribution: Record<RiskLevel, number>;
  overdueAlerts: Array<Receivable & { daysOverdue: number }>;
  latestMonthlyReport: MonthlyReport | null;
  generatedAt: string;
}

export type SortDir = 'asc' | 'desc';

export interface CashFlowBucket {
  key: string;
  label: string;
  start: string;
  end: string;
  amount: number;
  count: number;
}

export interface CashFlow {
  currency: string;
  groupBy: 'week' | 'month';
  overdue: { amount: number; count: number };
  buckets: CashFlowBucket[];
  later: { amount: number; count: number };
  totalOutstanding: number;
}

export type ConcentrationClass = 'A' | 'B' | 'C';

/** `GET /dashboard/concentration`: Pareto / ABC of the debtors. Shares are 0–1. */
export interface DebtConcentration {
  currency: string;
  thresholds: { A: number; B: number };
  totals: { outstanding: number; debtors: number; customers: number };
  classes: Array<{
    key: ConcentrationClass;
    debtors: number;
    outstanding: number;
    share: number;
    debtorShare: number;
  }>;
  curve: Array<{ debtorShare: number; debtShare: number }>;
  debtors: Array<{
    rank: number;
    customerId: string;
    name: string;
    outstanding: number;
    overdue: number;
    receivables: number;
    share: number;
    cumulativeShare: number;
    class: ConcentrationClass;
  }>;
  generatedAt: string;
}

export type AdjustmentReason = 'count' | 'loss' | 'damage' | 'correction';

export interface StockMovement {
  id: string;
  type: 'sale' | 'sale_void' | 'purchase' | 'purchase_void' | 'adjustment';
  /** Signed: negative left, positive entered. */
  quantity: number;
  /** Stock the product was left with (null for movements recorded before it existed). */
  balanceAfter: number | null;
  /** Part that left without stock to cover it. */
  shortage: number;
  sale: { id: string; number: number } | null;
  purchase: { id: string; number: number } | null;
  reason: AdjustmentReason | null;
  note: string | null;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  documentId: string | null;
  phone: string | null;
  notes: string | null;
  /** How many purchases it has (null when not counted). */
  purchases: number | null;
  createdAt: string;
}

export interface SupplierOption {
  id: string;
  name: string;
  phone: string | null;
}

export interface PurchaseItem {
  id: string;
  productId: string;
  description: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
}

export interface Purchase {
  id: string;
  number: number;
  date: string;
  supplier: { id: string; name: string; phone: string | null } | null;
  docType: SaleDocType;
  docNumber: string | null;
  total: number;
  status: 'completed' | 'voided';
  createdAt: string;
  voidedAt: string | null;
  items: PurchaseItem[];
  summary: string;
}

/** What a product picker needs (from `GET /products/lookup`). */
export type ProductOption = Pick<
  Product,
  | 'id'
  | 'kind'
  | 'name'
  | 'code'
  | 'imageUrl'
  | 'unit'
  | 'price'
  | 'cost'
  | 'trackStock'
  | 'stock'
  | 'minStock'
  | 'packSize'
> & {
  /** Sale lines of the last 90 days (the point-of-sale catalog only; null elsewhere). */
  sold?: number | null;
};

/** What a customer picker needs (from `GET /customers/lookup`). */
export interface CustomerOption {
  id: string;
  name: string;
  phone: string;
  outstanding: number;
}

export type SalePaymentType = 'cash' | 'credit';
export type SaleDocType = 'none' | 'sale_note' | 'receipt' | 'invoice';

export interface SaleItem {
  id: string;
  /** Null for a free line (a service or something not in the catalog). */
  productId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  /** Quantity sold beyond the stock available at that moment. */
  shortage: number;
}

export interface Sale {
  id: string;
  number: number;
  date: string;
  customer: { id: string; name: string; phone: string } | null;
  paymentType: SalePaymentType;
  method: PaymentMethod | null;
  docType: SaleDocType;
  docNumber: string | null;
  /** Sum of the lines, before the discount. */
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
  status: 'completed' | 'voided';
  createdAt: string;
  voidedAt: string | null;
  items: SaleItem[];
  summary: string;
  /** Some counted product was sold beyond its stock. */
  hasShortage: boolean;
  receivable: {
    id: string;
    status: ReceivableStatus;
    /** Paid so far (the down payment right after selling). */
    paid: number;
    outstanding: number;
  } | null;
}

export interface MessageTemplate {
  type: TemplateType;
  text: string;
  isDefault: boolean;
}

export interface ReminderRules {
  enabled: boolean;
  daysBeforeDue: number;
  onDueDate: boolean;
  overdueEveryDays: number;
}

export interface PaymentLink {
  url: string;
  externalId: string;
  provider: string;
  amount: number;
  currency: string;
}

export interface ReminderRunSummary {
  markedOverdue: number;
  evaluated: number;
  sent: number;
  failed: number;
}

/** Current value and the value of the previous equal-length period (null when not computable). */
export interface PeriodMetric {
  value: number | null;
  previous: number | null;
}

export type AnalyticsGranularity = 'day' | 'week' | 'month';

/** `GET /dashboard/analytics`: performance of a date range compared with the previous one. */
export interface DashboardAnalytics {
  period: {
    from: string;
    to: string;
    granularity: AnalyticsGranularity;
    previous: { from: string; to: string };
  };
  kpis: {
    collected: PeriodMetric;
    payments: PeriodMetric;
    averagePayment: PeriodMetric;
    issued: PeriodMetric;
    receivablesIssued: PeriodMetric;
    dueInPeriod: PeriodMetric;
    collectionRate: PeriodMetric;
    averageDaysToPay: PeriodMetric;
    newCustomers: PeriodMetric;
  };
  snapshot: {
    outstanding: number;
    overdue: number;
    overdueRate: number;
    openReceivables: number;
    customers: number;
    dueToday?: AmountCount;
    dueNext30Days?: AmountCount;
    overdueOver30Days?: AmountCount;
  };
  series: Array<{
    bucket: string;
    collected: number;
    issued: number;
    due: number;
    payments: number;
  }>;
  byMethod: Array<{ method: PaymentMethod; amount: number; count: number }>;
  byWeekday: Array<{ weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7; amount: number; count: number }>;
  topPayers: Array<{ customerId: string; name: string; amount: number; payments: number }>;
  reminders?: {
    sent: PeriodMetric;
    failed: PeriodMetric;
    byType: Array<{ type: TemplateType; sent: number; failed: number }>;
    /** Share (0..1) of reminded receivables that got a payment within 7 days. */
    paidAfterReminder: PeriodMetric;
  };
  /** Cross-filters applied (echoed by the API; null when not filtering). */
  filters: {
    method: PaymentMethod | null;
    customer: { id: string; name: string | null } | null;
    weekday: number | null;
  };
  generatedAt: string;
}

export interface AmountCount {
  amount: number;
  count: number;
}

// --- Tabular reports (/reports/*) -------------------------------------------

export interface ReportPeriod {
  from: string;
  to: string;
}

export interface SalesByCustomerRow {
  /** null: sales without a customer (walk-in). */
  customerId: string | null;
  name: string | null;
  sales: number;
  total: number;
  cash: number;
  credit: number;
  lastSale: string;
}

export interface CollectionsByCustomerRow {
  customerId: string;
  name: string;
  payments: number;
  amount: number;
  yape: number;
  plin: number;
  cash: number;
  bankTransfer: number;
  lastPayment: string;
}

export interface SalesByProductRow {
  productId: string;
  name: string;
  unit: ProductUnit;
  quantity: number;
  sales: number;
  revenue: number;
  /** Estimated with the product's current cost; null when it has none. */
  cost: number | null;
  profit: number | null;
}

export type StockStatus = 'out' | 'low' | 'ok';

export interface StockReportRow {
  productId: string;
  name: string;
  code: string | null;
  unit: ProductUnit;
  stock: number;
  minStock: number | null;
  cost: number | null;
  price: number;
  value: number | null;
  retail: number;
  status: StockStatus;
}

export interface ShortageReportRow {
  movementId: string;
  /** When the line left stock (ISO timestamp). */
  at: string;
  sale: { id: string; number: number; date: string; status: Sale['status'] };
  customer: string | null;
  productId: string;
  product: string;
  quantity: number;
  shortage: number;
  balanceAfter: number | null;
}

export interface Report<Row, Totals> {
  period?: ReportPeriod;
  rows: Row[];
  totals: Totals;
}

export interface ReportTypes {
  'sales-by-customer': Report<
    SalesByCustomerRow,
    { sales: number; total: number; cash: number; credit: number }
  >;
  'collections-by-customer': Report<
    CollectionsByCustomerRow,
    {
      payments: number;
      amount: number;
      yape: number;
      plin: number;
      cash: number;
      bankTransfer: number;
    }
  >;
  'sales-by-product': Report<SalesByProductRow, { revenue: number; cost: number; profit: number }>;
  stock: Report<
    StockReportRow,
    { products: number; value: number; retail: number; out: number; low: number }
  >;
  shortages: Report<ShortageReportRow, { lines: number; units: number }>;
}

export type ReportId = keyof ReportTypes;

// --- Plan usage (/settings/plan) ---------------------------------------------

/** What the plan includes and what the business used this month (null limit = unlimited). */
export interface PlanUsage {
  plan: 'free' | 'starter' | 'pro';
  modules: TenantModule[];
  /** YYYY-MM */
  month: string;
  automaticMessages: { used: number; included: number; extra: number; limit: number; left: number };
  users: { used: number; limit: number | null };
  customers: { used: number; limit: number | null };
  /** Messages in one extra pack. */
  packSize: number;
  /** What the business pays per month (null on the free plan). */
  price: { billing: 'monthly' | 'annual'; list: number; discount: number; perMonth: number } | null;
}
