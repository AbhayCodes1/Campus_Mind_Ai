import { type ReactNode, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart2,
  BookOpen,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Download,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Library,
  LockKeyhole,
  Menu,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  UsersRound,
  X,
  Zap,
} from 'lucide-react';
import {
  getGetStudentReportQueryKey,
  getListStudentsQueryKey,
  useGetDashboardSummary,
  useGetStudentReport,
  useHealthCheck,
  useListStudents,
  useQueryAssistant,
} from '@workspace/api-client-react';
import type {
  AssignmentReport,
  AttendanceReport,
  DashboardSummary,
  FeeReport,
  ResultReport,
  StudentReport,
  StudentSummary,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Link, Router as WouterRouter, useLocation, useParams } from 'wouter';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

/* ─────────────────────────────────────────────
   SHARED HELPERS
─────────────────────────────────────────────── */
function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

/* ─────────────────────────────────────────────
   LOGO
─────────────────────────────────────────────── */
function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 group" data-testid="link-logo">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <span className="font-mono-ui text-[11px] font-bold tracking-tight">CM</span>
      </span>
      {!compact && (
        <span className="text-[15px] font-semibold tracking-tight text-sidebar-foreground">
          Campus<span className="text-primary">Mind</span>
        </span>
      )}
    </Link>
  );
}

/* ─────────────────────────────────────────────
   NAVIGATION
─────────────────────────────────────────────── */
const primaryNav = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/students', label: 'Students', icon: UsersRound },
  { href: '/assistant', label: 'AI Assistant', icon: Sparkles },
];

const secondaryNav = [
  { href: '/dashboard#attendance', label: 'Attendance', icon: BarChart2 },
  { href: '/dashboard#fees', label: 'Fees', icon: CircleDollarSign },
  { href: '/dashboard#results', label: 'Results', icon: GraduationCap },
  { href: '/dashboard#assignments', label: 'Assignments', icon: ClipboardList },
  { href: '/dashboard#exams', label: 'Exams', icon: CalendarDays },
  { href: '/dashboard#documents', label: 'Documents', icon: FileText },
  { href: '/dashboard#settings', label: 'Settings', icon: Settings2 },
];

function NavItem({ href, label, icon: Icon, active, onClick }: {
  href: string; label: string; icon: typeof LayoutDashboard; active?: boolean; onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-medium transition-all',
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent'
      )}
      data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}
    >
      <Icon size={15} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" />
      <span>{label}</span>
      {href === '/assistant' && (
        <span className="ml-auto flex size-1.5 rounded-full bg-accent shadow-[0_0_6px_hsl(var(--accent)/.6)]" />
      )}
    </Link>
  );
}

/* ─────────────────────────────────────────────
   APP SHELL
─────────────────────────────────────────────── */
function AppShell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isActive = (href: string) =>
    href === '/dashboard' ? location === '/dashboard' : location.startsWith(href);

  const pageTitle = location.startsWith('/students/') && location.length > '/students/'.length
    ? 'Student Report'
    : location.startsWith('/students')
    ? 'Students'
    : location.startsWith('/assistant')
    ? 'AI Assistant'
    : 'Overview';

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* ── Sidebar ─────────────────────────────── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-56 flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-300 md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Sidebar header */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-sidebar-border/70">
          <Logo />
          <button
            className="grid size-7 place-items-center rounded-md text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X size={15} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-2 scrollbar-thin">
          {/* Primary nav */}
          <div className="mb-1 px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/35">
            Main
          </div>
          <nav className="space-y-0.5" aria-label="Main navigation">
            {primaryNav.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                active={isActive(item.href)}
                onClick={() => setMobileOpen(false)}
              />
            ))}
          </nav>

          {/* Secondary nav */}
          <div className="mt-5 mb-1 px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/35">
            Reports
          </div>
          <nav className="space-y-0.5" aria-label="Reports navigation">
            {secondaryNav.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                active={false}
                onClick={() => setMobileOpen(false)}
              />
            ))}
          </nav>
        </div>

        {/* Sidebar footer */}
        <div className="border-t border-sidebar-border/70 p-3 space-y-3">
          {/* Dataset badge */}
          <div className="rounded-lg bg-sidebar-accent px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-sidebar-foreground/70">
              <ShieldCheck size={12} className="text-accent shrink-0" />
              <span>Local DB connected</span>
            </div>
            <p className="mt-1 text-[11px] leading-4 text-sidebar-foreground/45">
              SQLite demo source · campusmind-demo.sqlite
            </p>
          </div>
          {/* User */}
          <div className="flex items-center gap-2.5 px-1">
            <span className="grid size-7 place-items-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
              DO
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-sidebar-foreground">Demo operator</div>
              <div className="truncate text-[11px] text-sidebar-foreground/45">Academic services</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}

      {/* ── Main content area ─────────────────── */}
      <div className="md:pl-56">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-14 items-center border-b border-border/60 bg-background/95 px-4 backdrop-blur-md md:px-6">
          <button
            className="mr-3 grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>

          {/* Breadcrumb */}
          <div className="hidden md:block">
            <div className="text-[13px] font-semibold text-foreground">{pageTitle}</div>
            <div className="font-mono-ui text-[10px] text-muted-foreground/70 uppercase tracking-wider">
              Academic services · 2025–26
            </div>
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-2">
            {/* Search */}
            <label className="relative hidden lg:flex items-center">
              <Search className="absolute left-2.5 text-muted-foreground" size={13} />
              <input
                className="h-8 w-48 rounded-md border border-border bg-muted/50 pl-8 pr-3 text-[13px] outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/10"
                placeholder="Search…"
                aria-label="Global search"
                data-testid="input-global-search"
              />
            </label>

            {/* Status indicator */}
            <div className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground sm:flex">
              <span className="status-dot bg-accent" />
              Operational
            </div>

            {/* Notifications */}
            <button
              className="grid size-8 place-items-center rounded-md border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary"
              aria-label="Notifications"
              data-testid="button-notifications"
            >
              <Bell size={14} />
            </button>

            {/* Account */}
            <button
              className="grid size-8 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary hover:bg-primary hover:text-primary-foreground"
              onClick={() => setLocation('/')}
              aria-label="Account menu"
              data-testid="button-account-menu"
            >
              DO
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-[calc(100dvh-3.5rem)] px-4 py-7 md:px-8 surface-dots">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-border bg-card/95 p-1 shadow-lg backdrop-blur-md md:hidden">
        {primaryNav.map(({ href, label, icon: Icon }) => (
          <Link
            href={href}
            key={label}
            className={cn(
              'grid size-10 place-items-center rounded-lg',
              isActive(href) ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            )}
            aria-label={label}
            data-testid={`mobile-nav-${label.toLowerCase().replaceAll(' ', '-')}`}
          >
            <Icon size={16} />
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   REUSABLE ATOMS
─────────────────────────────────────────────── */
function PageHeading({
  eyebrow, title, description, action,
}: {
  eyebrow: string; title: string; description?: string; action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 animate-rise">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1.5 font-mono-ui text-[10.5px] uppercase tracking-[0.1em] text-primary font-medium">
            {eyebrow}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 max-w-xl text-[13.5px] leading-6 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  );
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`skeleton-shimmer ${className}`} />;
}

function ErrorState({ onRetry, message = 'The data service did not respond.' }: { onRetry: () => void; message?: string }) {
  return (
    <div className="flex min-h-60 flex-col items-center justify-center rounded-xl border border-destructive/20 bg-card px-6 text-center shadow-sm">
      <div className="mb-3 grid size-10 place-items-center rounded-xl bg-destructive/10 text-destructive">
        <AlertTriangle size={18} />
      </div>
      <h2 className="text-[14px] font-semibold text-foreground">Could not load this view</h2>
      <p className="mt-1 max-w-xs text-[13px] text-muted-foreground">{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 rounded-lg bg-primary px-4 py-1.5 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90"
        data-testid="button-retry"
      >
        Try again
      </button>
    </div>
  );
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/60 px-6 text-center">
      <div className="mb-3 grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
        <Library size={18} />
      </div>
      <h2 className="text-[14px] font-semibold text-foreground">{title}</h2>
      <p className="mt-1 max-w-xs text-[13px] text-muted-foreground">{copy}</p>
    </div>
  );
}

type ToneType = 'indigo' | 'amber' | 'emerald' | 'rose' | 'slate';

function StatCard({
  label, value, note, icon: Icon, tone = 'indigo',
}: {
  label: string; value: string | number; note: string; icon: typeof UsersRound; tone?: ToneType;
}) {
  const tones: Record<ToneType, { icon: string; value: string }> = {
    indigo: { icon: 'bg-primary/10 text-primary', value: 'text-foreground' },
    amber: { icon: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400', value: 'text-amber-700 dark:text-amber-400' },
    emerald: { icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400', value: 'text-emerald-700 dark:text-emerald-400' },
    rose: { icon: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400', value: 'text-rose-700 dark:text-rose-400' },
    slate: { icon: 'bg-muted text-muted-foreground', value: 'text-foreground' },
  };
  return (
    <div
      className="group rounded-xl border border-card-border bg-card p-5 card-glow animate-rise"
      data-testid={`stat-${label.toLowerCase().replaceAll(' ', '-')}`}
    >
      <div className="flex items-center justify-between">
        <div className={cn('grid size-9 place-items-center rounded-lg', tones[tone].icon)}>
          <Icon size={16} />
        </div>
        <span className="font-mono-ui text-[9px] uppercase tracking-widest text-muted-foreground/60">Live</span>
      </div>
      <div className={cn('mt-4 text-2xl font-semibold tracking-tight', tones[tone].value)}>{value}</div>
      <div className="mt-0.5 text-[13px] font-medium text-foreground">{label}</div>
      <div className="mt-2 text-[12px] text-muted-foreground">{note}</div>
    </div>
  );
}

function SectionHeader({ label, icon: Icon }: { label: string; icon: typeof BarChart2 }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="grid size-7 place-items-center rounded-md bg-primary/8 text-primary">
        <Icon size={13} />
      </div>
      <h2 className="text-[14px] font-semibold text-foreground">{label}</h2>
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  const lower = value.toLowerCase();
  const positive = lower.includes('paid') || lower.includes('good') || lower.includes('complete') || lower === 'a' || lower === 'a+' || lower === 'available';
  const warning = lower.includes('pending') || lower.includes('risk') || lower.includes('short') || lower.includes('due');
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 font-mono-ui text-[10px] font-medium uppercase tracking-wide',
        positive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          : warning ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
          : 'bg-muted text-muted-foreground'
      )}
    >
      {value}
    </span>
  );
}

function Meter({ value }: { value: number }) {
  const color = value < 75 ? 'bg-rose-500' : value < 85 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn('h-full rounded-full transition-all duration-700', color)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   DASHBOARD PAGE
─────────────────────────────────────────────── */
function Dashboard() {
  const query = useGetDashboardSummary();
  const summary = query.data as DashboardSummary | undefined;

  if (query.isLoading) {
    return (
      <>
        <PageHeading eyebrow="Overview" title="Good morning, operator." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonBlock key={i} className="h-36" />)}
        </div>
      </>
    );
  }

  if (query.isError || !summary) {
    return (
      <>
        <PageHeading eyebrow="Overview" title="Good morning, operator." />
        <ErrorState
          onRetry={() => query.refetch()}
          message={query.error instanceof Error ? query.error.message : 'The dashboard could not connect to the CampusMind API.'}
        />
      </>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeading
        eyebrow="Overview · Live campus pulse"
        title="Good morning, operator."
        description="Your campus snapshot is ready. Start with the signal, then open the record behind it."
        action={
          <>
            <Link
              href="/students"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-[13px] font-semibold text-foreground hover:border-primary/40 hover:bg-card shadow-sm"
              data-testid="link-select-student"
            >
              <UsersRound size={14} />
              Students
            </Link>
            <Link
              href="/assistant"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm"
              data-testid="link-ask-campusmind"
            >
              <Sparkles size={14} />
              Ask AI
              <ArrowRight size={13} />
            </Link>
          </>
        }
      />

      {/* Stats grid */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Active students"
          value={summary.totalStudents.toLocaleString()}
          note="Synthetic directory records"
          icon={UsersRound}
          tone="indigo"
        />
        <StatCard
          label="Courses in flight"
          value={summary.totalCourses}
          note={`${summary.activeSemesters} active semesters`}
          icon={BookOpen}
          tone="emerald"
        />
        <StatCard
          label="Attendance at risk"
          value={summary.attendanceAtRisk}
          note="Students needing attention"
          icon={BarChart2}
          tone="rose"
        />
        <StatCard
          label="Fees pending"
          value={`$${summary.pendingFees.toLocaleString()}`}
          note="Across active semesters"
          icon={CircleDollarSign}
          tone="amber"
        />
        <StatCard
          label="Assignments due"
          value={summary.assignmentsDue}
          note="Next 14 days"
          icon={ClipboardList}
          tone="emerald"
        />
        {/* Safe-to-explore card */}
        <div className="relative overflow-hidden rounded-xl bg-primary p-5 text-primary-foreground shadow-sm animate-rise">
          <div className="absolute -right-6 -top-6 size-28 rounded-full border-[14px] border-primary-foreground/8" />
          <div className="relative flex items-start justify-between">
            <div className="grid size-9 place-items-center rounded-lg bg-primary-foreground/15 text-primary-foreground">
              <ShieldCheck size={16} />
            </div>
            <span className="font-mono-ui text-[9px] uppercase tracking-widest text-primary-foreground/50">Dataset</span>
          </div>
          <div className="relative mt-4 text-xl font-semibold">Safe to explore.</div>
          <div className="relative mt-1 text-[12px] leading-5 text-primary-foreground/60">{summary.syntheticLabel}</div>
        </div>
      </div>

      {/* Lower panels */}
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        {/* AI Quickstart */}
        <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="font-mono-ui text-[10px] uppercase tracking-widest text-primary/70 mb-1">
                Recommended first step
              </div>
              <h2 className="text-[15px] font-semibold text-foreground">Ask about a student</h2>
            </div>
            <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <Sparkles size={15} />
            </div>
          </div>
          <div className="rounded-lg border border-border bg-background p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                AI
              </div>
              <p className="text-[13px] text-muted-foreground">
                Try{' '}
                <span className="font-medium text-foreground">
                  "Show Abhay Singh's complete report"
                </span>
              </p>
            </div>
            <Link
              href="/assistant"
              className="mt-3.5 flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90"
              data-testid="link-open-assistant"
            >
              Open assistant <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Needs attention */}
        <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-mono-ui text-[10px] uppercase tracking-widest text-primary/70 mb-1">At a glance</div>
              <h2 className="text-[15px] font-semibold text-foreground">Needs attention</h2>
            </div>
            <Link href="/students" className="text-[12px] font-medium text-primary hover:underline" data-testid="link-view-students">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Attendance', detail: `${summary.attendanceAtRisk} at risk`, color: 'bg-rose-500' },
              { label: 'Fees', detail: `$${summary.pendingFees.toLocaleString()} pending`, color: 'bg-amber-500' },
              { label: 'Assignments', detail: `${summary.assignmentsDue} due soon`, color: 'bg-primary' },
            ].map(({ label, detail, color }) => (
              <div key={label} className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
                <span className={cn('size-2 rounded-full shrink-0', color)} />
                <div className="flex-1 text-[13px] font-medium text-foreground">{label}</div>
                <div className="text-[12px] text-muted-foreground">{detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   STUDENTS LIST PAGE
─────────────────────────────────────────────── */
function Students() {
  const [search, setSearch] = useState('');
  const params = useMemo(() => ({ search: search || undefined, limit: 100 }), [search]);
  const query = useListStudents(params, { query: { queryKey: getListStudentsQueryKey(params) } });
  const students = (query.data as StudentSummary[] | undefined) ?? [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeading
        eyebrow="Directory · 500+ synthetic records"
        title="Students"
        description="Search by name or campus ID. Open a record to see the full academic and financial picture."
      />

      {/* Search bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or student ID…"
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-9 text-[13.5px] shadow-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/10"
            data-testid="input-student-search"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 grid size-5 place-items-center rounded text-muted-foreground hover:text-foreground"
              aria-label="Clear"
              data-testid="button-clear-student-search"
            >
              <X size={13} />
            </button>
          )}
        </label>
        <div className="font-mono-ui text-[11px] text-muted-foreground">
          {query.isLoading ? 'Searching…' : `${students.length} match${students.length === 1 ? '' : 'es'}`}
        </div>
      </div>

      {/* Student table */}
      {query.isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <SkeletonBlock key={i} className="h-16" />)}
        </div>
      ) : query.isError ? (
        <ErrorState
          onRetry={() => query.refetch()}
          message={query.error instanceof Error ? query.error.message : 'The student directory could not connect to the API.'}
        />
      ) : students.length === 0 ? (
        <EmptyState
          title="No students found"
          copy="Try a different name or campus ID. The directory only contains synthetic demo records."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-card-border bg-card shadow-sm">
          {/* Table header */}
          <div className="hidden border-b border-border bg-muted/30 px-5 py-2.5 md:grid md:grid-cols-[minmax(0,2fr)_1fr_1fr_60px_24px]">
            {['Student', 'Department', 'Contact', 'Year', ''].map((h) => (
              <span key={h} className="font-mono-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                {h}
              </span>
            ))}
          </div>
          {/* Rows */}
          {students.map((student) => (
            <Link
              href={`/students/${student.studentId}`}
              key={student.studentId}
              className="group flex items-center gap-3 border-b border-border/60 px-4 py-3.5 last:border-0 hover:bg-muted/30 md:grid md:grid-cols-[minmax(0,2fr)_1fr_1fr_60px_24px] md:gap-0 md:px-5 transition-colors"
              data-testid={`row-student-${student.studentId}`}
            >
              {/* Name + ID */}
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                  {student.avatarSeed || getInitials(student.name)}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-semibold text-foreground">{student.name}</div>
                  <div className="font-mono-ui truncate text-[11px] text-muted-foreground">{student.studentId}</div>
                </div>
              </div>
              <div className="hidden truncate text-[13px] text-muted-foreground md:block">{student.department}</div>
              <div className="hidden truncate text-[13px] text-muted-foreground md:block">{student.email}</div>
              <div className="hidden font-mono-ui text-[12px] text-muted-foreground md:block">Yr {student.year}</div>
              <ChevronRight
                className="text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                size={15}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   STUDENT REPORT PAGE
─────────────────────────────────────────────── */
function StudentReportPage() {
  const { studentId = '' } = useParams<{ studentId: string }>();
  const query = useGetStudentReport(studentId, {
    query: { enabled: !!studentId, queryKey: getGetStudentReportQueryKey(studentId) },
  });
  const report = query.data as StudentReport | undefined;
  const [tab, setTab] = useState<'overview' | 'attendance' | 'fees' | 'results' | 'assignments' | 'exams'>('overview');

  const exportCsv = () => {
    if (!report) return;
    const rows = [
      ['Student', 'Student ID', 'Department', 'Attendance %', 'Fee pending', 'Assignments', 'Upcoming exams'],
      [
        report.profile.name,
        report.profile.studentId,
        report.profile.department,
        String(report.totals.attendancePercentage),
        String(report.totals.feePending),
        String(report.assignments.length),
        String(report.upcomingExams.length),
      ],
    ];
    const csv = rows.map((r) => r.map((v) => `"${v.replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.profile.studentId}-campusmind-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => window.print();

  if (query.isLoading) {
    return (
      <>
        <BackLink />
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonBlock className="h-52" />
          <SkeletonBlock className="h-52" />
        </div>
      </>
    );
  }

  if (query.isError || !report) {
    return (
      <>
        <BackLink />
        <ErrorState
          onRetry={() => query.refetch()}
          message={query.error instanceof Error ? query.error.message : 'The student record could not be loaded from the API.'}
        />
      </>
    );
  }

  const p = report.profile;
  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'fees', label: 'Fees' },
    { id: 'results', label: 'Results' },
    { id: 'assignments', label: 'Assignments' },
    { id: 'exams', label: 'Exams' },
  ] as const;

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <BackLink />
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[13px] font-semibold text-foreground hover:border-primary/40 shadow-sm"
            data-testid="button-export-csv"
          >
            <Download size={13} /> Export CSV
          </button>
          <button
            onClick={exportPdf}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm"
            data-testid="button-download-pdf"
          >
            <Download size={13} /> Download PDF
          </button>
        </div>
      </div>

      {/* Profile card */}
      <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm animate-rise">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid size-14 place-items-center rounded-xl bg-primary/10 text-xl font-bold text-primary">
              {getInitials(p.name)}
            </div>
            <div>
              <div className="font-mono-ui text-[10px] uppercase tracking-widest text-primary/70 mb-0.5">
                Student report · {p.syntheticLabel}
              </div>
              <h1 className="text-xl font-semibold text-foreground">{p.name}</h1>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {p.department} · Year {p.year} ·{' '}
                <span className="font-mono-ui">{p.studentId}</span>
              </p>
            </div>
          </div>
          <StatusPill value="Record available" />
        </div>

        {/* Contact info */}
        <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
          {[
            { label: 'Email', value: p.email },
            { label: 'Phone', value: p.phone },
            { label: 'Enrolled', value: new Date(p.enrollmentDate).toLocaleDateString() },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-[11px] text-muted-foreground">{label}</div>
              <div className="mt-0.5 text-[13px] text-foreground truncate">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid gap-3 sm:grid-cols-3 animate-rise delay-75">
        <StatCard
          label="Attendance"
          value={`${report.totals.attendancePercentage}%`}
          note={`${report.totals.attendanceShortage} shortage hours`}
          icon={BarChart2}
          tone={report.totals.attendancePercentage < 75 ? 'rose' : 'emerald'}
        />
        <StatCard
          label="Fees pending"
          value={`$${report.totals.feePending.toLocaleString()}`}
          note={`$${report.totals.feePaid.toLocaleString()} paid of $${report.totals.feeTotal.toLocaleString()}`}
          icon={CircleDollarSign}
          tone={report.totals.feePending > 0 ? 'amber' : 'emerald'}
        />
        <StatCard
          label="Semesters tracked"
          value={report.semesters.length}
          note={`${report.results.length} course results`}
          icon={GraduationCap}
          tone="indigo"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-border animate-rise delay-150">
        <div className="flex gap-0 overflow-x-auto scrollbar-thin no-print">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'shrink-0 border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors',
                tab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
              data-testid={`tab-${id}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab panels */}
      <div className="animate-fade">
        {tab === 'overview' && <AcademicPanels report={report} />}
        {tab === 'attendance' && <AttendancePanel report={report} />}
        {tab === 'fees' && <FeesPanel report={report} />}
        {tab === 'results' && <ResultsPanel report={report} />}
        {tab === 'assignments' && <AssignmentsPanel report={report} />}
        {tab === 'exams' && <ExamsPanel report={report} />}
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/students"
      className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
      data-testid="link-back-students"
    >
      <ArrowLeft size={14} /> Students
    </Link>
  );
}

/* ─────────────────────────────────────────────
   STUDENT REPORT PANELS
─────────────────────────────────────────────── */
function AcademicPanels({ report }: { report: StudentReport }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
      {/* Left column */}
      <div className="space-y-4">
        {/* Attendance */}
        <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm">
          <SectionHeader label="Attendance" icon={BarChart2} />
          <div className="space-y-4">
            {report.attendance.map((item: AttendanceReport) => (
              <div key={item.courseCode} data-testid={`attendance-${item.courseCode}`}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono-ui mr-1.5 text-[10px] text-primary/70">{item.courseCode}</span>
                    <span className="text-[13px] font-medium text-foreground">{item.courseName}</span>
                  </div>
                  <span className="font-mono-ui text-[12px] font-bold text-foreground shrink-0">{item.percentage}%</span>
                </div>
                <Meter value={item.percentage} />
                <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                  <span>{item.attended} of {item.held} sessions</span>
                  <StatusPill value={item.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Results table */}
        <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm">
          <SectionHeader label="Course results" icon={GraduationCap} />
          <div className="overflow-x-auto -mx-1">
            <table className="w-full min-w-[480px] text-left">
              <thead>
                <tr>
                  {['Course', 'Internal', 'Exam', 'Total', 'Grade'].map((h) => (
                    <th key={h} className="pb-2.5 font-mono-ui text-[10px] uppercase tracking-[0.07em] text-muted-foreground font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.results.map((item: ResultReport) => (
                  <tr key={item.courseCode} className="border-t border-border/60" data-testid={`result-${item.courseCode}`}>
                    <td className="py-2.5">
                      <div className="text-[13px] font-medium text-foreground">{item.courseName}</div>
                      <div className="font-mono-ui text-[10px] text-muted-foreground">{item.courseCode}</div>
                    </td>
                    <td className="py-2.5 text-[13px] text-muted-foreground">{item.internalMarks}</td>
                    <td className="py-2.5 text-[13px] text-muted-foreground">{item.examMarks}</td>
                    <td className="py-2.5 text-[13px] font-semibold text-foreground">{item.totalMarks}</td>
                    <td className="py-2.5">
                      <span className="font-mono-ui text-[12px] font-bold text-primary">{item.grade}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right column */}
      <div className="space-y-4">
        {/* Semester trail */}
        <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm">
          <SectionHeader label="Semester trail" icon={BookOpen} />
          <div className="space-y-2">
            {report.semesters.map((item) => (
              <div key={item.semester} className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2.5">
                <div className="grid size-8 place-items-center rounded-md bg-card border border-border text-[12px] font-bold text-foreground shadow-sm">
                  {item.gpa.toFixed(1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-foreground truncate">{item.semester}</div>
                  <div className="text-[11px] text-muted-foreground">{item.academicYear} · {item.credits} cr</div>
                </div>
                <StatusPill value={item.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming exams */}
        <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm">
          <SectionHeader label="Upcoming exams" icon={CalendarDays} />
          <div className="space-y-3">
            {report.upcomingExams.length ? (
              report.upcomingExams.map((item) => (
                <div
                  key={`${item.courseCode}-${item.examDate}`}
                  className="flex gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                >
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/8 text-primary">
                    <CalendarDays size={14} />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-foreground">{item.title}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {item.courseCode} · {new Date(item.examDate).toLocaleDateString()} · Room {item.room}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[13px] text-muted-foreground">No upcoming exams in this window.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AttendancePanel({ report }: { report: StudentReport }) {
  return (
    <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm">
      <SectionHeader label="Attendance by course" icon={BarChart2} />
      <div className="grid gap-3 md:grid-cols-2">
        {report.attendance.map((item) => (
          <div
            key={item.courseCode}
            className="rounded-lg border border-border bg-background p-4"
            data-testid={`attendance-detail-${item.courseCode}`}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <div className="font-mono-ui text-[10px] text-primary/70">{item.courseCode}</div>
                <div className="mt-0.5 text-[13px] font-semibold text-foreground">{item.courseName}</div>
              </div>
              <span className="font-mono-ui text-[13px] font-bold text-foreground shrink-0">{item.percentage}%</span>
            </div>
            <Meter value={item.percentage} />
            <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
              <span>{item.attended} of {item.held} sessions</span>
              <StatusPill value={item.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeesPanel({ report }: { report: StudentReport }) {
  return (
    <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm">
      <SectionHeader label="Fees by semester" icon={CircleDollarSign} />
      <div className="grid gap-3 md:grid-cols-2">
        {report.fees.map((item: FeeReport) => (
          <div
            key={item.semester}
            className="rounded-lg border border-border bg-background p-4"
            data-testid={`fee-detail-${item.semester}`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13.5px] font-semibold text-foreground">{item.semester}</span>
              <StatusPill value={item.status} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total', value: `$${item.total.toLocaleString()}`, className: 'text-foreground' },
                { label: 'Paid', value: `$${item.paid.toLocaleString()}`, className: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Pending', value: `$${item.pending.toLocaleString()}`, className: 'text-amber-600 dark:text-amber-400' },
              ].map(({ label, value, className }) => (
                <div key={label}>
                  <div className="text-[11px] text-muted-foreground">{label}</div>
                  <div className={cn('mt-0.5 font-mono-ui text-[13px] font-medium', className)}>{value}</div>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <Meter value={item.total ? (item.paid / item.total) * 100 : 0} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultsPanel({ report }: { report: StudentReport }) {
  return (
    <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm">
      <SectionHeader label="Results and grades" icon={GraduationCap} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left">
          <thead>
            <tr>
              {['Course', 'Internal', 'Exam', 'Total', 'Grade', 'Points'].map((h) => (
                <th key={h} className="pb-2.5 font-mono-ui text-[10px] uppercase tracking-[0.07em] text-muted-foreground font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.results.map((item) => (
              <tr
                key={item.courseCode}
                className="border-t border-border/60"
                data-testid={`results-detail-${item.courseCode}`}
              >
                <td className="py-2.5 pr-4">
                  <div className="text-[13px] font-medium text-foreground">{item.courseName}</div>
                  <div className="font-mono-ui text-[10px] text-muted-foreground">{item.courseCode}</div>
                </td>
                <td className="py-2.5 text-[13px] text-muted-foreground">{item.internalMarks}</td>
                <td className="py-2.5 text-[13px] text-muted-foreground">{item.examMarks}</td>
                <td className="py-2.5 text-[13px] font-semibold text-foreground">{item.totalMarks}</td>
                <td className="py-2.5">
                  <span className="font-mono-ui text-[12px] font-bold text-primary">{item.grade}</span>
                </td>
                <td className="py-2.5 font-mono-ui text-[12px] text-muted-foreground">{item.gradePoint}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AssignmentsPanel({ report }: { report: StudentReport }) {
  return (
    <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm">
      <SectionHeader label="Assignments" icon={ClipboardList} />
      <div className="grid gap-3 md:grid-cols-2">
        {report.assignments.map((item: AssignmentReport) => (
          <div
            key={`${item.courseCode}-${item.title}`}
            className="rounded-lg border border-border bg-background p-4"
            data-testid={`assignment-detail-${item.courseCode}`}
          >
            <div className="flex items-start gap-3">
              <div className="grid size-8 place-items-center rounded-md bg-primary/8 text-primary shrink-0 mt-0.5">
                <ClipboardList size={13} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[13px] font-semibold text-foreground">{item.title}</div>
                  <StatusPill value={item.status} />
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {item.courseCode} · Due {new Date(item.dueDate).toLocaleDateString()}
                </div>
              </div>
            </div>
            {item.score !== null && (
              <div className="mt-3 flex justify-between border-t border-border pt-2.5 text-[12px] text-muted-foreground">
                <span>Score</span>
                <span className="font-mono-ui font-bold text-foreground">{item.score} / {item.maxMarks}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ExamsPanel({ report }: { report: StudentReport }) {
  return (
    <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm">
      <SectionHeader label="Upcoming exams" icon={CalendarDays} />
      {report.upcomingExams.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {report.upcomingExams.map((item) => (
            <div
              key={`${item.courseCode}-${item.examDate}`}
              className="flex gap-3 rounded-lg border border-border bg-background p-4"
              data-testid={`exam-detail-${item.courseCode}`}
            >
              <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/8 text-primary">
                <CalendarDays size={15} />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-foreground">{item.title}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {item.courseCode} · {new Date(item.examDate).toLocaleDateString()}
                </div>
                <div className="mt-1 font-mono-ui text-[10px] uppercase tracking-wide text-muted-foreground/60">
                  Room {item.room}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No upcoming exams"
          copy="This synthetic record has no scheduled examinations in the current window."
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   AI ASSISTANT PAGE
─────────────────────────────────────────────── */
function Assistant() {
  const [message, setMessage] = useState('');
  const query = useQueryAssistant();
  const response = query.data;

  const ask = (text = message) => {
    if (text.trim()) query.mutate({ data: { message: text.trim(), studentId: null } });
  };

  const PROMPTS = [
    'How many students are enrolled?',
    'Show attendance below 75 percent.',
    'Who has pending fees?',
    'Show exam schedule for DBMS.',
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeading
        eyebrow="CampusMind AI · Natural language"
        title="Ask one clear question."
        description="Connect student directory, attendance, fees, assignments, exams, and results into one answer."
      />

      {/* Input card */}
      <div className="overflow-hidden rounded-xl border border-card-border bg-card shadow-sm animate-rise">
        {/* Top banner */}
        <div className="bg-primary px-5 py-4 text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-foreground/15">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="font-mono-ui text-[9px] uppercase tracking-widest text-primary-foreground/55 mb-0.5">
                Synthetic intelligence layer
              </div>
              <h2 className="text-[15px] font-semibold leading-tight">What do you need to understand?</h2>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-b border-border">
          <div className="flex gap-2 rounded-lg border border-border bg-background p-1.5">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') ask(); }}
              placeholder="Ask about a student, attendance, fees, exams, or results"
              className="h-9 flex-1 bg-transparent px-2.5 text-[13.5px] outline-none placeholder:text-muted-foreground/60 text-foreground"
              data-testid="input-assistant-message"
            />
            <button
              onClick={() => ask()}
              disabled={!message.trim() || query.isPending}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90"
              data-testid="button-submit-assistant"
            >
              {query.isPending ? 'Thinking…' : 'Ask'}
              {!query.isPending && <ArrowRight size={13} />}
            </button>
          </div>
        </div>

        {/* Prompt chips */}
        <div className="px-4 py-3">
          <div className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Try a prompt
          </div>
          <div className="flex flex-wrap gap-2">
            {PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => { setMessage(prompt); ask(prompt); }}
                className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-left text-[12px] text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5"
                data-testid={`button-prompt-${prompt.slice(0, 8).replaceAll(' ', '-')}`}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {query.isError && (
        <div
          className="rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-[13px] text-destructive"
          data-testid="status-assistant-error"
        >
          CampusMind could not resolve that request. Try a student name or ID.
        </div>
      )}

      {/* Loading skeleton */}
      {query.isPending && (
        <div className="space-y-2.5 rounded-xl border border-card-border bg-card p-5">
          <SkeletonBlock className="h-3.5 w-1/3" />
          <SkeletonBlock className="h-3.5 w-4/5" />
          <SkeletonBlock className="h-16 w-full mt-2" />
        </div>
      )}

      {/* Response */}
      {response && !query.isPending && (
        <div className="space-y-4 animate-fade" data-testid="assistant-response">
          {/* Answer */}
          <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-1.5 font-mono-ui text-[10px] uppercase tracking-widest text-accent mb-3">
              <Check size={12} />
              Resolved · {response.intent}
            </div>
            <p className="text-[15px] leading-7 text-foreground">{response.answer}</p>
            <div className="mt-3">
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                {response.syntheticLabel}
              </span>
            </div>
          </div>

          {/* Clarification matches */}
          {response.needsClarification && response.matches.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
              <div className="flex items-start gap-2.5 mb-3">
                <Search size={15} className="mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <h3 className="text-[14px] font-semibold text-foreground">Which student did you mean?</h3>
                  <p className="mt-0.5 text-[12.5px] text-muted-foreground">I found a few close matches.</p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {response.matches.map((match: StudentSummary) => (
                  <Link
                    href={`/students/${match.studentId}`}
                    key={match.studentId}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary/40 hover:bg-card"
                    data-testid={`assistant-match-${match.studentId}`}
                  >
                    <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                      {match.avatarSeed || getInitials(match.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-foreground">{match.name}</span>
                      <span className="font-mono-ui text-[10px] text-muted-foreground">{match.studentId}</span>
                    </span>
                    <ChevronRight size={13} className="text-muted-foreground shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Full report preview */}
          {response.report && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[14px] font-semibold text-foreground">Report preview</h3>
                <Link
                  href={`/students/${response.report.profile.studentId}`}
                  className="inline-flex items-center gap-1 text-[12.5px] font-medium text-primary hover:underline"
                  data-testid="link-open-assistant-report"
                >
                  Open full report <ArrowRight size={12} />
                </Link>
              </div>
              <AcademicPanels report={response.report} />
            </div>
          )}
        </div>
      )}

      {/* Empty state — feature cards */}
      {!response && !query.isPending && (
        <div className="grid gap-3 md:grid-cols-3 animate-rise delay-150">
          {([
            { title: 'One question', copy: 'Start with a name, ID, or signal you care about.', icon: UserRound },
            { title: 'Full context', copy: 'See attendance, fees, deadlines, and results together.', icon: Library },
            { title: 'Safe by design', copy: 'Every answer is grounded in synthetic campus data.', icon: LockKeyhole },
          ] as const).map(({ title, copy, icon: Icon }) => (
            <div key={title} className="rounded-xl border border-card-border bg-card p-4 shadow-sm">
              <div className="mb-3 grid size-8 place-items-center rounded-lg bg-primary/8 text-primary">
                <Icon size={14} />
              </div>
              <h3 className="text-[13.5px] font-semibold text-foreground">{title}</h3>
              <p className="mt-1 text-[12.5px] leading-5 text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   LANDING PAGE
─────────────────────────────────────────────── */
function Landing() {
  const health = useHealthCheck();
  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/60 bg-background/95 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 md:px-8">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <span className="font-mono-ui text-[11px] font-bold">CM</span>
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-foreground">
              Campus<span className="text-primary">Mind</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="rounded-md px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
              data-testid="link-sign-in"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-primary px-3.5 py-1.5 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm"
              data-testid="link-sign-up"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-14 md:px-8 md:pb-24 md:pt-20 lg:grid-cols-2">
          <div className="animate-rise">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 font-mono-ui text-[10px] uppercase tracking-[0.12em] text-primary">
              <Zap size={10} />
              Academic operations, clarified
            </div>
            <h1 className="max-w-xl text-4xl font-semibold leading-[1.1] tracking-tight text-foreground md:text-5xl lg:text-[52px]">
              The student picture,{' '}
              <span className="text-primary">in one clear view.</span>
            </h1>
            <p className="mt-5 max-w-lg text-[15px] leading-7 text-muted-foreground">
              CampusMind helps academic teams move from a question to the right context: attendance, fees, deadlines, exams, and results — connected around every student.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-[13.5px] font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 hover:-translate-y-px"
                data-testid="link-enter-demo"
              >
                Enter demo workspace <ArrowRight size={15} />
              </Link>
              <Link
                href="/assistant"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-[13.5px] font-semibold text-foreground hover:border-primary/40 shadow-sm"
                data-testid="link-try-assistant"
              >
                Try the assistant <Sparkles size={14} />
              </Link>
            </div>
            <div className="mt-6 flex items-center gap-2.5 text-[12px] text-muted-foreground">
              <span
                className={cn(
                  'size-2 rounded-full shrink-0',
                  health.isError ? 'bg-destructive' : 'bg-accent status-dot'
                )}
              />
              {health.isLoading ? 'Checking systems…' : health.isError ? (health.error instanceof Error ? health.error.message : 'Service offline') : 'Local SQLite service live'}
              <span className="text-border">|</span>
              <span className="font-mono-ui">500+ synthetic records</span>
            </div>
          </div>

          {/* Demo preview card */}
          <div className="relative animate-rise delay-150">
            <div className="absolute -inset-4 rounded-3xl bg-primary/5 blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-primary p-5 shadow-2xl md:p-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-primary-foreground/12 pb-4">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-md bg-primary-foreground/15 text-[10px] font-bold text-primary-foreground">
                    CM
                  </span>
                  <span className="text-[13px] font-semibold text-primary-foreground">CampusMind / Overview</span>
                </div>
                <span className="rounded-full bg-accent/25 px-2 py-0.5 font-mono-ui text-[9px] uppercase tracking-wider text-primary-foreground/80">
                  Live demo
                </span>
              </div>
              {/* Student info */}
              <div className="mt-4">
                <div className="font-mono-ui text-[9px] uppercase tracking-widest text-primary-foreground/40 mb-1">
                  Student signal
                </div>
                <div className="text-[18px] font-semibold text-primary-foreground">Abhay Singh</div>
                <div className="text-[12px] text-primary-foreground/55">Computer Science · Year 3</div>
              </div>
              {/* Stats */}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-primary-foreground/10 p-3.5">
                  <div className="text-[11px] text-primary-foreground/50">Attendance</div>
                  <div className="mt-1.5 text-[20px] font-semibold text-primary-foreground">82.4%</div>
                  <div className="mt-2 h-1 rounded-full bg-primary-foreground/15">
                    <div className="h-full w-[82%] rounded-full bg-accent" />
                  </div>
                </div>
                <div className="rounded-lg bg-primary-foreground/10 p-3.5">
                  <div className="text-[11px] text-primary-foreground/50">Fees pending</div>
                  <div className="mt-1.5 text-[20px] font-semibold text-primary-foreground">$1,240</div>
                  <div className="mt-1.5 text-[11px] text-primary-foreground/45">1 semester</div>
                </div>
              </div>
              {/* AI note */}
              <div className="mt-3 rounded-lg bg-primary-foreground/12 p-3.5">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-primary-foreground/80 mb-1.5">
                  <Sparkles size={11} /> CampusMind found the signal
                </div>
                <p className="text-[12px] leading-5 text-primary-foreground/65">
                  "Attendance healthy. Two assignments due this week. Fee balance pending."
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-y border-border bg-muted/30">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-3 md:px-8">
            {[
              { step: '01', label: 'Ask', title: 'Start with the question in your head.', copy: 'No hunting through modules. Ask for a student report, attendance signal, or pending fees.' },
              { step: '02', label: 'Understand', title: 'See context that changes the answer.', copy: 'The full report connects academic progress with financial and operational details.' },
              { step: '03', label: 'Act', title: 'Move with confidence.', copy: 'Open the source record, share a clean export, keep the next conversation focused.' },
            ].map(({ step, label, title, copy }) => (
              <div key={step}>
                <div className="font-mono-ui text-[10px] uppercase tracking-widest text-primary/60 mb-2">{step} / {label}</div>
                <h2 className="text-[15px] font-semibold text-foreground mb-1.5">{title}</h2>
                <p className="text-[13px] leading-6 text-muted-foreground">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Safe to share */}
        <section className="mx-auto max-w-6xl px-5 py-14 md:px-8">
          <div className="grid gap-8 rounded-2xl border border-border bg-card p-7 shadow-sm md:grid-cols-[1fr_1fr] md:p-10">
            <div>
              <div className="mb-2 font-mono-ui text-[10px] uppercase tracking-widest text-primary/60">Built for safe demos</div>
              <h2 className="text-2xl font-semibold text-foreground">Useful enough to explore. Safe enough to share.</h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {[
                { icon: LockKeyhole, title: 'Synthetic by default', copy: '500+ student records are generated. No real student information is used.' },
                { icon: ShieldCheck, title: 'Grounded answers', copy: 'AI responses come from the same report data you can inspect directly.' },
                { icon: TrendingUp, title: 'Full picture', copy: 'Attendance, fees, results, and assignments all in one connected view.' },
                { icon: Download, title: 'Export ready', copy: 'Download CSV or PDF reports for any student in the directory.' },
              ].map(({ icon: Icon, title, copy }) => (
                <div key={title} className="flex gap-3">
                  <Icon className="shrink-0 text-primary mt-0.5" size={16} />
                  <div>
                    <h3 className="text-[13.5px] font-semibold text-foreground">{title}</h3>
                    <p className="mt-0.5 text-[12.5px] leading-5 text-muted-foreground">{copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-5 py-5 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 text-[12px] text-muted-foreground sm:flex-row">
          <span>CampusMind AI · Academic operations command center</span>
          <span className="font-mono-ui">SYNTHETIC DATA ONLY</span>
        </div>
      </footer>
    </div>
  );
}

/* ─────────────────────────────────────────────
   AUTH PAGE
─────────────────────────────────────────────── */
function AuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const submit = (e: React.FormEvent) => { e.preventDefault(); setLocation('/dashboard'); };

  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[1fr_1fr]">
      {/* Left panel */}
      <div className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -bottom-24 -right-16 size-80 rounded-full border-[36px] border-primary-foreground/6" />
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-primary-foreground/20 text-primary-foreground">
            <span className="font-mono-ui text-[11px] font-bold">CM</span>
          </span>
          <span className="text-[15px] font-semibold">CampusMind</span>
        </div>
        <div className="relative max-w-sm pb-8">
          <div className="mb-3 font-mono-ui text-[9px] uppercase tracking-widest text-primary-foreground/40">CampusMind access</div>
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight">A calmer way to read the campus.</h1>
          <p className="mt-5 text-[13.5px] leading-6 text-primary-foreground/60">
            Secure workspace access for academic services teams working with synthetic student operations data.
          </p>
          <div className="mt-7 flex items-center gap-2 text-[12px] text-primary-foreground/55">
            <ShieldCheck size={14} className="text-primary-foreground/70" />
            Protected workspace · synthetic records
          </div>
        </div>
        <div className="font-mono-ui text-[9px] uppercase tracking-widest text-primary-foreground/30">
          Academic services / 2025–26
        </div>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground lg:hidden"
            data-testid="link-auth-back"
          >
            <ArrowLeft size={13} /> CampusMind
          </Link>

          <div className="mb-7">
            <div className="mb-1.5 font-mono-ui text-[10px] uppercase tracking-widest text-primary/70">
              {mode === 'sign-in' ? 'Welcome back' : 'New workspace access'}
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {mode === 'sign-in' ? 'Sign in to CampusMind' : 'Create your account'}
            </h2>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              {mode === 'sign-in' ? 'Continue to your academic command center.' : 'Set up access for the synthetic demo workspace.'}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-foreground">Work email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@campus.edu"
                className="h-10 w-full rounded-lg border border-border bg-card px-3.5 text-[13.5px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 shadow-sm"
                data-testid="input-auth-email"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-foreground">Password</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="h-10 w-full rounded-lg border border-border bg-card px-3.5 text-[13.5px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 shadow-sm"
                data-testid="input-auth-password"
              />
            </label>
            <button
              type="submit"
              className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[13.5px] font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm"
              data-testid={`button-${mode}`}
            >
              {mode === 'sign-in' ? 'Sign in' : 'Create account'}
              <ArrowRight size={14} />
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-[12px] text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            onClick={() => setLocation('/dashboard')}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card text-[13.5px] font-semibold text-foreground hover:border-primary/40 shadow-sm"
            data-testid="button-demo-access"
          >
            <GraduationCap size={15} />
            Continue with demo access
          </button>

          <p className="mt-6 text-center text-[12.5px] text-muted-foreground">
            {mode === 'sign-in' ? 'New to CampusMind?' : 'Already have access?'}{' '}
            <Link
              href={mode === 'sign-in' ? '/sign-up' : '/sign-in'}
              className="font-semibold text-primary hover:underline"
              data-testid="link-switch-auth"
            >
              {mode === 'sign-in' ? 'Create an account' : 'Sign in instead'}
            </Link>
          </p>
          <p className="mt-6 text-center text-[11.5px] leading-5 text-muted-foreground/70">
            By continuing, you acknowledge this workspace uses synthetic student records for demonstration only.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   404 PAGE
─────────────────────────────────────────────── */
function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background p-6">
      <div className="text-center">
        <div className="font-mono-ui text-[12px] text-primary/60 mb-2">404 / not found</div>
        <h1 className="text-3xl font-semibold text-foreground">This page is off the map.</h1>
        <p className="mt-2 text-[13.5px] text-muted-foreground">Return to the CampusMind command center.</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90"
          data-testid="link-not-found-home"
        >
          Back to home <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ROUTER
─────────────────────────────────────────────── */
function AppRouter() {
  const [location] = useLocation();
  const isPublic = location === '/' || location.startsWith('/sign-in') || location.startsWith('/sign-up');

  return (
    <ErrorBoundary resetKey={location}>
      {isPublic ? (
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/sign-in/*?" component={() => <AuthPage mode="sign-in" />} />
          <Route path="/sign-up/*?" component={() => <AuthPage mode="sign-up" />} />
          <Route component={NotFound} />
        </Switch>
      ) : (
        <AppShell>
          <Switch>
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/students" component={Students} />
            <Route path="/students/:studentId" component={StudentReportPage} />
            <Route path="/assistant" component={Assistant} />
            <Route component={NotFound} />
          </Switch>
        </AppShell>
      )}
    </ErrorBoundary>
  );
}

/* ─────────────────────────────────────────────
   APP ROOT
─────────────────────────────────────────────── */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <AppRouter />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;