import { BellRing, FileText, ShieldCheck, TrendingUp, Wallet } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth, type GoogleSignInResult } from '../auth/AuthContext';
import { useAuthConfig } from '../hooks/queries';
import { REQUEST_ACCESS_URL } from '../lib/config';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import {
  useFeedback,
  IndustrySelect,
  InstallAppChip,
  PasswordChecklist,
  meetsPasswordPolicy,
  PreferencesControls,
  Mascot,
  type MascotMood,
  Logo,
  Button,
  cx,
  Field,
  PasswordInput,
  useErrorText,
  useErrorToast,
} from '@/ui';
import { useI18n } from '../i18n/I18nProvider';

/** What Solvia does, shown beside the form on large screens. */
/**
 * What Solvia does, shown beside the form on large screens as glass bubbles that drift slowly.
 * Each bubble gets its own duration/delay so they never move in sync.
 */
function FeatureCard({
  icon,
  title,
  body,
  drift,
  className,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  drift: { duration: number; delay: number };
  className?: string;
}) {
  return (
    <li
      className={cx('auth-bubble', className)}
      style={{ animationDuration: `${drift.duration}s`, animationDelay: `${drift.delay}s` }}
    >
      <div className="relative flex gap-3.5 overflow-hidden rounded-[1.75rem] border border-white/60 bg-surface/55 p-4 shadow-[0_18px_40px_-18px_rgba(13,148,136,0.45)] backdrop-blur-md dark:border-white/10 dark:bg-surface/45 dark:shadow-[0_18px_40px_-18px_rgba(0,0,0,0.7)]">
        {/* Bubble shine */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-8 -left-6 h-20 w-32 rounded-full bg-white/50 blur-2xl dark:bg-white/10"
        />
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary-ink [&>svg]:h-5 [&>svg]:w-5">
          {icon}
        </span>
        <div className="relative min-w-0">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <p className="mt-0.5 text-[13px] leading-snug text-muted">{body}</p>
        </div>
      </div>
    </li>
  );
}

function AuthLayout({
  mode,
  title,
  subtitle,
  mood = 'default',
  children,
}: {
  /** `password`: change-password screen (no sign-in/sign-up tabs). */
  mode: 'login' | 'register' | 'password';
  title: string;
  subtitle: string;
  mood?: MascotMood;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const config = useAuthConfig();
  const showTabs = mode !== 'password' && config.data?.signupEnabled === true;
  // The register form is taller, so its page uses tighter spacing to never scroll on desktop.
  const compact = mode === 'register';
  const highlights = {
    left: [
      {
        icon: <BellRing />,
        title: t('auth.features.remindersTitle'),
        body: t('auth.features.remindersBody'),
      },
      {
        icon: <Wallet />,
        title: t('auth.features.paymentsTitle'),
        body: t('auth.features.paymentsBody'),
      },
    ],
    right: [
      {
        icon: <ShieldCheck />,
        title: t('auth.features.riskTitle'),
        body: t('auth.features.riskBody'),
      },
      {
        icon: <TrendingUp />,
        title: t('auth.features.cashTitle'),
        body: t('auth.features.cashBody'),
      },
    ],
  };
  const side = (items: typeof highlights.left, label: string, offset: number) => (
    <ul
      aria-label={label}
      className="hidden w-full max-w-xs flex-col gap-8 justify-self-center xl:flex"
    >
      {items.map((item, index) => (
        <FeatureCard
          key={item.title}
          {...item}
          drift={{ duration: 9 + offset + index, delay: -3 * (offset + index) }}
          // Staggered horizontally so the bubbles don't line up like a list.
          className={cx('relative', index % 2 === (offset ? 0 : 1) ? 'left-8' : '-left-4')}
        />
      ))}
    </ul>
  );
  const features = [
    { icon: <BellRing />, text: t('auth.heroPoint1') },
    { icon: <FileText />, text: t('auth.heroPoint2') },
    { icon: <ShieldCheck />, text: t('auth.heroPoint3') },
  ];

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-canvas">
      {/* Aurora background: drifting blurred blobs + a dot grid that fades out from the center. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="auth-blob absolute -top-40 -left-32 h-[34rem] w-[34rem] rounded-full bg-[#2dd4bf]/30 blur-3xl dark:bg-[#2dd4bf]/15" />
        <div className="auth-blob absolute top-1/3 -right-40 h-[30rem] w-[30rem] rounded-full bg-[#2a78d6]/20 blur-3xl [animation-delay:-6s] dark:bg-[#2a78d6]/15" />
        <div className="auth-blob absolute -bottom-48 left-1/4 h-[28rem] w-[28rem] rounded-full bg-[#a7f3d0]/40 blur-3xl [animation-delay:-12s] dark:bg-[#0f766e]/25" />
        <div
          className="absolute inset-0 opacity-[0.35] dark:opacity-[0.18]"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--line-strong) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
          }}
        />
      </div>

      <header
        className={cx(
          'relative z-10 flex items-center justify-between px-4 sm:px-8',
          compact ? 'py-2' : 'py-3',
        )}
      >
        <Logo />
        <PreferencesControls tourTarget={false} />
      </header>

      <main
        className={cx(
          'relative z-10 flex flex-1 flex-col items-center justify-center px-4',
          compact ? 'pt-12 pb-4' : 'pt-16 pb-5',
        )}
      >
        <div className="flex w-full justify-center xl:grid xl:max-w-7xl xl:grid-cols-[1fr_28rem_1fr] xl:items-center xl:gap-10">
          {side(highlights.left, t('auth.features.label'), 0)}
          <div className="relative w-full max-w-md">
            <div
              className={cx(
                'relative rounded-3xl border border-white/50 bg-surface/80 px-6 shadow-pop backdrop-blur-xl sm:px-8 dark:border-white/10 dark:bg-surface/75',
                compact ? 'pt-10 pb-5' : 'pt-12 pb-6',
              )}
            >
              <div
                className={cx('flex flex-col items-center text-center', compact ? 'mb-4' : 'mb-5')}
              >
                {/* Soli perches on the top edge of the card */}
                <Mascot
                  size={compact ? 76 : 92}
                  mood={mood}
                  title="Soli"
                  className={cx(
                    'absolute left-1/2 -translate-x-1/2 drop-shadow-md',
                    compact ? '-top-[61px]' : '-top-[74px]',
                  )}
                />
                <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
                <p
                  className={cx(
                    'mt-1 text-sm text-muted',
                    compact && '[@media(max-height:980px)]:hidden',
                  )}
                >
                  {subtitle}
                </p>
              </div>

              {showTabs && (
                <div
                  role="tablist"
                  aria-label="Solvia"
                  className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-surface-3 p-1"
                >
                  {(['login', 'register'] as const).map((tab) => (
                    <Link
                      key={tab}
                      role="tab"
                      aria-selected={mode === tab}
                      to={tab === 'login' ? '/login' : '/register'}
                      className={cx(
                        'rounded-lg py-2 text-center text-sm font-semibold transition',
                        mode === tab
                          ? 'bg-surface text-ink shadow-sm'
                          : 'text-muted hover:text-ink',
                      )}
                    >
                      {tab === 'login' ? t('auth.tabSignIn') : t('auth.tabRegister')}
                    </Link>
                  ))}
                </div>
              )}

              {children}
            </div>
          </div>
          {side(highlights.right, t('auth.features.label'), 2)}
        </div>

        <ul
          className={cx(
            'mt-4 flex max-w-2xl flex-wrap justify-center gap-2 xl:hidden',
            // The register form is taller: drop the chips earlier so the page never scrolls.
            mode === 'register'
              ? '[@media(max-height:980px)]:hidden'
              : '[@media(max-height:780px)]:hidden',
          )}
        >
          {features.map((feature) => (
            <li
              key={feature.text}
              className="flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3.5 py-1.5 text-xs font-medium text-muted backdrop-blur-sm [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-primary"
            >
              {feature.icon}
              {feature.text}
            </li>
          ))}
        </ul>
      </main>

      <InstallAppChip />
      <footer
        className={cx(
          'relative z-10 pb-3 text-center text-xs text-subtle',
          compact ? '[@media(max-height:980px)]:hidden' : '[@media(max-height:780px)]:hidden',
        )}
      >
        {t('nav.footer', { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
}

/** Mascot reaction to the password field: covers its eyes while typing, peeks when shown. */
function usePasswordMood() {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const mood: MascotMood = visible ? 'peek' : focused ? 'cover' : 'default';
  return { mood, setFocused, setVisible };
}

type PendingGoogle = {
  credential: string;
  profile: Extract<GoogleSignInResult, { status: 'needs_registration' }>['profile'];
};

/** Shared "Continue with Google" flow, including the one-time business name step. */
function useGoogleFlow() {
  const { googleSignIn } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState<PendingGoogle | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const run = async (
    credential: string,
    business?: { businessName: string; industry?: string },
  ) => {
    setError(null);
    setLoading(true);
    try {
      const result = await googleSignIn({ credential, ...business });
      if (result.status === 'needs_registration')
        setPending({ credential, profile: result.profile });
      else navigate('/', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return { pending, error, loading, run, cancel: () => setPending(null) };
}

type GoogleFlow = ReturnType<typeof useGoogleFlow>;

function GoogleCompletion({ flow }: { flow: GoogleFlow }) {
  const { t } = useI18n();
  const errors = useErrorText();
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  useErrorToast(flow.error);
  if (!flow.pending) return null;
  const { credential, profile } = flow.pending;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void flow.run(credential, { businessName, industry: industry || undefined });
      }}
      className="space-y-4"
    >
      <div className="text-center">
        <p className="font-semibold">{t('auth.googleCompleteTitle')}</p>
        <p className="mt-1 text-sm text-muted">
          {t('auth.googleCompleteSubtitle', { email: profile.email })}
        </p>
      </div>
      <Field label={t('auth.businessName')} error={errors.field(flow.error, 'businessName')}>
        {(id) => (
          <input
            id={id}
            className="input h-11"
            required
            minLength={2}
            autoFocus
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        )}
      </Field>
      <Field label={t('auth.industry')} optionalLabel={t('common.optional')}>
        {(id) => <IndustrySelect id={id} onChange={setIndustry} />}
      </Field>
      <Button type="submit" className="h-11 w-full" loading={flow.loading}>
        {t('auth.googleCreate')}
      </Button>
      <button
        type="button"
        onClick={flow.cancel}
        className="w-full text-center text-xs text-muted hover:text-ink"
      >
        {t('auth.googleCancel')}
      </button>
    </form>
  );
}

function GoogleSection({ flow }: { flow: GoogleFlow }) {
  const { t } = useI18n();
  useErrorToast(flow.error);

  return (
    <div className="mb-4 space-y-3">
      <GoogleSignInButton onCredential={(credential) => void flow.run(credential)} />
      <div className="flex items-center gap-3 text-[11px] font-medium tracking-wide text-subtle uppercase">
        <span className="h-px flex-1 bg-line" />
        {t('auth.orContinueWith')}
        <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}

export function LoginPage() {
  const { t } = useI18n();
  const config = useAuthConfig();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const google = useGoogleFlow();
  const password = usePasswordMood();
  const [email, setEmail] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, secret);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== '/login' ? from : '/', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useErrorToast(error, t('toast.signInFailed'));

  return (
    <AuthLayout
      mode="login"
      title={t('auth.signInTitle')}
      subtitle={t('auth.signInSubtitle')}
      mood={google.pending ? 'happy' : password.mood}
    >
      {google.pending ? (
        <GoogleCompletion flow={google} />
      ) : (
        <>
          <GoogleSection flow={google} />
          <form onSubmit={(event) => void submit(event)} className="space-y-3.5">
            <Field label={t('auth.email')}>
              {(id) => (
                <input
                  id={id}
                  className="input h-11"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}
            </Field>
            <Field label={t('auth.password')}>
              {(id) => (
                <PasswordInput
                  id={id}
                  className="h-11"
                  autoComplete="current-password"
                  value={secret}
                  onChange={setSecret}
                  showLabel={t('auth.showPassword')}
                  hideLabel={t('auth.hidePassword')}
                  onFocusChange={password.setFocused}
                  onVisibilityChange={password.setVisible}
                />
              )}
            </Field>
            <Button type="submit" className="h-11 w-full" loading={loading}>
              {t('auth.signIn')}
            </Button>
          </form>
          <button
            type="button"
            onClick={() => {
              setEmail('admin@bodegasanmartin.pe');
              setSecret('Password123!');
            }}
            className="mt-4 w-full rounded-xl border border-dashed border-line-strong px-4 py-2.5 text-xs text-muted transition hover:border-primary hover:text-primary-ink"
          >
            <span className="font-semibold">{t('auth.demoAccount')}:</span>{' '}
            <span className="font-mono">admin@bodegasanmartin.pe</span> /{' '}
            <span className="font-mono">Password123!</span>
          </button>
          {config.data && !config.data.signupEnabled && (
            <p className="mt-4 text-center text-sm text-muted">
              {t('auth.noAccount')}{' '}
              <a
                href={REQUEST_ACCESS_URL}
                className="font-semibold text-primary-ink hover:underline"
              >
                {t('auth.requestAccess')}
              </a>
            </p>
          )}
        </>
      )}
    </AuthLayout>
  );
}

export function RegisterPage() {
  const config = useAuthConfig();
  // Managed onboarding: without self sign-up, /register just leads to the sign-in page.
  if (config.data && !config.data.signupEnabled) return <Navigate to="/login" replace />;
  return <RegisterForm />;
}

function RegisterForm() {
  const { t } = useI18n();
  const errors = useErrorText();
  const { register } = useAuth();
  const navigate = useNavigate();
  const google = useGoogleFlow();
  const password = usePasswordMood();
  const [form, setForm] = useState({
    businessName: '',
    industry: '',
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [passwordTried, setPasswordTried] = useState(false);
  const update = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!meetsPasswordPolicy(form.password)) {
      setPasswordTried(true);
      event.currentTarget
        .querySelector<HTMLInputElement>('input[autocomplete="new-password"]')
        ?.focus();
      return;
    }
    setLoading(true);
    try {
      await register({ ...form, industry: form.industry || undefined });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useErrorToast(error);

  return (
    <AuthLayout
      mode="register"
      title={t('auth.registerTitle')}
      subtitle={t('auth.registerSubtitle')}
      mood={google.pending ? 'happy' : password.mood}
    >
      {google.pending ? (
        <GoogleCompletion flow={google} />
      ) : (
        <>
          <GoogleSection flow={google} />
          <form onSubmit={(event) => void submit(event)} className="space-y-2.5">
            <div className="space-y-2.5">
              <Field label={t('auth.businessName')} error={errors.field(error, 'businessName')}>
                {(id) => (
                  <input
                    id={id}
                    className="input"
                    required
                    minLength={2}
                    value={form.businessName}
                    onChange={(e) => update('businessName')(e.target.value)}
                  />
                )}
              </Field>
              <Field label={t('auth.industry')} optionalLabel={t('common.optional')}>
                {(id) => <IndustrySelect id={id} onChange={update('industry')} />}
              </Field>
            </div>
            <div className="space-y-2.5">
              <Field label={t('auth.yourName')} error={errors.field(error, 'name')}>
                {(id) => (
                  <input
                    id={id}
                    className="input"
                    autoComplete="name"
                    required
                    minLength={2}
                    value={form.name}
                    onChange={(e) => update('name')(e.target.value)}
                  />
                )}
              </Field>
              <Field label={t('auth.email')} error={errors.field(error, 'email')}>
                {(id) => (
                  <input
                    id={id}
                    className="input"
                    type="email"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={(e) => update('email')(e.target.value)}
                  />
                )}
              </Field>
            </div>
            <Field label={t('auth.password')} error={errors.field(error, 'password')}>
              {(id, describedBy) => (
                <>
                  <PasswordInput
                    id={id}
                    describedBy={cx(describedBy, `${id}-rules`)}
                    autoComplete="new-password"
                    minLength={8}
                    value={form.password}
                    onChange={update('password')}
                    showLabel={t('auth.showPassword')}
                    hideLabel={t('auth.hidePassword')}
                    onFocusChange={password.setFocused}
                    onVisibilityChange={password.setVisible}
                  />
                  <PasswordChecklist
                    id={`${id}-rules`}
                    value={form.password}
                    showErrors={passwordTried}
                  />
                </>
              )}
            </Field>
            <Button type="submit" className="h-11 w-full" loading={loading}>
              {t('auth.createWorkspace')}
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}

/**
 * New password screen: mandatory after signing in with a temporary password, and also reachable
 * voluntarily from the user menu.
 */
export function ChangePasswordPage() {
  const { t } = useI18n();
  const errors = useErrorText();
  const { user, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useFeedback();
  const password = usePasswordMood();
  const forced = user?.mustChangePassword === true;
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const mismatch = (tried || repeat.length >= next.length) && repeat.length > 0 && repeat !== next;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setTried(true);
    if (!meetsPasswordPolicy(next) || next !== repeat) return;
    setLoading(true);
    try {
      await changePassword(current, next);
      toast.success(t('auth.changeDone'));
      navigate('/', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const passwordField = (
    id: string,
    value: string,
    onChange: (value: string) => void,
    autoComplete: 'current-password' | 'new-password',
    describedBy?: string,
  ) => (
    <PasswordInput
      id={id}
      describedBy={describedBy}
      autoComplete={autoComplete}
      value={value}
      onChange={onChange}
      showLabel={t('auth.showPassword')}
      hideLabel={t('auth.hidePassword')}
      onFocusChange={password.setFocused}
      onVisibilityChange={password.setVisible}
    />
  );

  useErrorToast(error);

  return (
    <AuthLayout
      mode="password"
      title={t('auth.changeTitle')}
      subtitle={forced ? t('auth.changeSubtitle') : t('auth.changeSubtitleVoluntary')}
      mood={password.mood}
    >
      <form onSubmit={(event) => void submit(event)} className="space-y-3">
        <Field
          label={forced ? t('auth.temporaryPassword') : t('auth.currentPassword')}
          error={errors.field(error, 'currentPassword')}
        >
          {(id) => passwordField(id, current, setCurrent, 'current-password')}
        </Field>
        <Field label={t('auth.newPassword')} error={errors.field(error, 'newPassword')}>
          {(id, describedBy) => (
            <>
              {passwordField(id, next, setNext, 'new-password', cx(describedBy, `${id}-rules`))}
              <PasswordChecklist id={`${id}-rules`} value={next} showErrors={tried} />
            </>
          )}
        </Field>
        <Field
          label={t('auth.confirmPassword')}
          error={mismatch ? t('auth.passwordMismatch') : undefined}
        >
          {(id) => passwordField(id, repeat, setRepeat, 'new-password')}
        </Field>
        <Button type="submit" className="h-11 w-full" loading={loading}>
          {t('auth.changeSubmit')}
        </Button>
      </form>
      <button
        type="button"
        onClick={() => (forced ? logout() : navigate(-1))}
        className="mt-3 w-full text-center text-sm font-medium text-muted hover:text-ink"
      >
        {forced ? t('auth.signOutInstead') : t('auth.back')}
      </button>
    </AuthLayout>
  );
}
