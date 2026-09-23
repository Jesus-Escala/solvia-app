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

export interface Tenant {
  id: string;
  name: string;
  industry: string | null;
  plan: string;
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
  generatedAt: string;
}

export interface AmountCount {
  amount: number;
  count: number;
}
