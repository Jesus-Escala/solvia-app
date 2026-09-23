/**
 * UI kit of this app: components, brand (logo + Soli), theme, i18n
 * core, charts and the API client. Import from '@/ui' only (never deep paths).
 */

// UI kit
export { ActivityBar } from './components/ActivityBar';
export { Button, IconButton, type ButtonProps, type ButtonVariant } from './components/Button';
export { cx } from './components/cx';
export {
  DataTable,
  type DataTableColumn,
  type DataTablePagination,
  type DataTableProps,
  type DataTableSort,
} from './components/DataTable';
export { Avatar, Badge, Card, ProgressBar, Stat, type BadgeTone } from './components/Display';
export { Alert, EmptyState, LoadingState, Skeleton, Spinner } from './components/Feedback';
export {
  Field,
  PasswordInput,
  SearchInput,
  SegmentedControl,
  Tabs,
  type SegmentOption,
  type TabItem,
} from './components/Form';
export { IndustrySelect } from './components/IndustrySelect';
export { KpiCard, KpiRow, type KpiCardProps } from './components/KpiCard';
export { Modal, type ModalProps } from './components/Modal';
export {
  FeedbackProvider,
  MenuItems,
  Popover,
  useFeedback,
  type MenuItem,
} from './components/Overlays';
export { Page, PageHeader } from './components/Page';
export { PasswordChecklist } from './components/PasswordChecklist';
export { meetsPasswordPolicy, PASSWORD_RULES } from './components/passwordRules';
export { PhoneInput } from './components/PhoneInput';
export { formatPhone, isValidPhone } from './components/phoneCountries';
export { PreferencesControls } from './components/PreferencesControls';
export { Reveal } from './components/Reveal';
export {
  TeamUsers,
  type TeamRole,
  type TeamUser,
  type TeamUserChanges,
  type TeamUserInput,
} from './components/TeamUsers';
export { TemporaryPasswordDialog } from './components/TemporaryPasswordDialog';

// Brand
export { Logo, LogoMark } from './brand/Logo';
export { Mascot, type MascotMood } from './brand/Mascot';
export { OwlFace } from './brand/OwlFace';
export { OWL, OWL_COLORS } from './brand/owlGeometry';

// Charts
export { AXIS_TICK, CHART_HEIGHT, useChartColors, type ChartColors } from './charts/chartTheme';
export { ChartTooltipCard } from './charts/ChartTooltip';
export { DonutChart, type DonutSlice } from './charts/DonutChart';
export { RankingBars, type RankingItem } from './charts/RankingBars';

// Theme
export {
  ThemeProvider,
  useTheme,
  type ResolvedTheme,
  type ThemePreference,
} from './theme/ThemeProvider';

// i18n
export {
  createUseI18n,
  useUiI18n,
  type I18nValue,
  type Leaves,
  type TranslationVars,
} from './i18n/context';
export { I18nProvider, type Dictionaries, type Formatters } from './i18n/I18nProvider';
export { LOCALES, type Locale } from './i18n/locales';
export { uiEn, uiEs, type UiMessages } from './i18n/messages';
export { useErrorText } from './i18n/useErrorText';

// API
export {
  ApiError,
  buildUrl,
  createApiClient,
  createTokenStore,
  errorMessage,
  type ApiClient,
  type Query,
  type TokenStore,
} from './lib/http';

// Hooks
export { useMinimumLoading } from './hooks/useMinimumLoading';
export { useUrlState } from './hooks/useUrlState';

// Install as an app (PWA)
export { InstallAppChip, PwaInstallGuide, PwaUpdatePrompt } from './pwa/InstallApp';
export { pwaInstall, useCanOfferInstall, usePwaInstall, type PwaPlatform } from './pwa/pwaInstall';
