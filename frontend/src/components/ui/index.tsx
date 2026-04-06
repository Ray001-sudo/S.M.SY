'use client';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ShieldCheck, Loader2, AlertCircle, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Back Button ───────────────────────────────────────────
export function BackButton({ href, label = 'Back' }: { href?: string; label?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => href ? router.push(href) : router.back()}
      className="back-btn"
      aria-label="Go back"
    >
      <ChevronLeft className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}

// ── Page Header ───────────────────────────────────────────
export function PageHeader({
  title, subtitle, back, backHref, action
}: {
  title: string;
  subtitle?: string;
  back?: string;
  backHref?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      {back && <BackButton href={backHref} label={back} />}
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-[--text-1] truncate">{title}</h1>
        {subtitle && <p className="text-xs text-[--text-2] truncate">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function CardSkeleton() {
  return (
    <div className="card-p space-y-3 animate-pulse">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────
export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin text-[--text-2]" />;
}

// ── Empty state ───────────────────────────────────────────
export function EmptyState({
  title, description, action, icon: Icon = FolderOpen
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="empty-state animate-fade-in">
      <div className="p-4 bg-[--surface] rounded-2xl">
        <Icon className="empty-icon" />
      </div>
      <div>
        <p className="font-medium text-[--text-1]">{title}</p>
        {description && <p className="text-sm text-[--text-2] mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// ── Error state ───────────────────────────────────────────
export function ErrorState({ message, retry }: { message?: string; retry?: () => void }) {
  return (
    <div className="empty-state">
      <div className="p-4 bg-red-50 rounded-2xl">
        <AlertCircle className="w-12 h-12 text-red-400" />
      </div>
      <div>
        <p className="font-medium text-[--text-1]">{message || 'Something went wrong'}</p>
        <p className="text-sm text-[--text-2] mt-1">Please try again</p>
      </div>
      {retry && (
        <button onClick={retry} className="btn-ghost btn-sm">Retry</button>
      )}
    </div>
  );
}

// ── Trust chip ────────────────────────────────────────────
export function TrustChip({ label = 'Encrypted · Zero-trust' }: { label?: string }) {
  return (
    <span className="trust-chip">
      <ShieldCheck className="w-3 h-3" />
      {label}
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────
export function StatCard({
  label, value, hint, accent, icon: Icon
}: {
  label: string; value: string | number; hint?: string;
  accent?: string; icon?: React.ElementType;
}) {
  return (
    <div className="stat-card" style={accent ? { borderLeftWidth: 3, borderLeftColor: accent, borderLeftStyle: 'solid', borderRadius: '0 1rem 1rem 0' } : {}}>
      {Icon && (
        <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-1"
          style={{ background: accent ? `${accent}18` : 'var(--surface)' }}>
          <Icon className="w-4 h-4" style={accent ? { color: accent } : { color: 'var(--text-2)' }} />
        </div>
      )}
      <div className="stat-lbl">{label}</div>
      <div className="stat-val">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

// ── Confirm modal ─────────────────────────────────────────
export function ConfirmDialog({
  open, title, description, onConfirm, onCancel, danger = false
}: {
  open: boolean; title: string; description?: string;
  onConfirm: () => void; onCancel: () => void; danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="card-p w-full max-w-sm space-y-4 animate-slide-up">
        <div>
          <p className="font-semibold text-[--text-1]">{title}</p>
          {description && <p className="text-sm text-[--text-2] mt-1">{description}</p>}
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
          <button
            onClick={onConfirm}
            className={danger ? 'btn-danger flex-1' : 'btn-primary flex-1'}
          >Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ── Form field wrapper ────────────────────────────────────
export function Field({
  label, error, children, required
}: {
  label: string; error?: string; children: React.ReactNode; required?: boolean;
}) {
  return (
    <div className="input-group">
      <label className="label">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
