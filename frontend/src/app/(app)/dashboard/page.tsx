'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { StatCard, CardSkeleton } from '@/components/ui';
import { Users, AlertTriangle, DollarSign, TrendingUp, Brain, ChevronRight, Zap, BookOpen, ShieldCheck } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';

const RISK_COLORS: Record<string, string> = {
  critical: '#EF4444', high: '#F97316', medium: '#F59E0B', low: '#10B981'
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isAdmin = ['admin','principal','deputy_principal'].includes(user?.role || '');
  const isBursar = ['admin','principal','bursar'].includes(user?.role || '');

  const { data: studentStats } = useQuery({
    queryKey: ['student-stats'],
    queryFn: () => api.get('/students/stats').then(r => r.data),
  });

  const { data: riskData } = useQuery({
    queryKey: ['risk-dashboard-sm'],
    queryFn: () => api.get('/ai/risk/dashboard?limit=6').then(r => r.data),
    enabled: isAdmin || user?.role === 'counsellor',
  });

  const { data: feeData } = useQuery({
    queryKey: ['fee-dashboard-sm', new Date().getFullYear()],
    queryFn: () => api.get(`/fees/dashboard?term=1&academic_year=${new Date().getFullYear()}`).then(r => r.data),
    enabled: isBursar,
  });

  const now = new Date();
  const totalStudents = studentStats?.by_status?.find((s: any) => s.status === 'active')?.count || 0;
  const atRisk = riskData ? (riskData.summary.critical + riskData.summary.high) : null;
  const collected = feeData?.totals?.total_collected;
  const expected = feeData?.totals?.total_expected;
  const collectionPct = collected && expected ? Math.round((collected / expected) * 100) : null;

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="flex-1">
          <p className="text-xs text-[--text-3]">{now.toLocaleDateString('en-KE', { weekday:'long', day:'numeric', month:'long' })}</p>
          <h1 className="text-base font-semibold text-[--text-1]">
            Good {now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'}, {user?.full_name?.split(' ')[0]} 👋
          </h1>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
          <ShieldCheck className="w-3 h-3" /> Secure session
        </div>
      </div>

      <div className="page-content">
        {/* Curriculum cards */}
        <div className="grid grid-cols-2 gap-3 stagger">
          <Link href="/students?curriculum_mode=eight_four_four"
            className="card-p flex flex-col gap-1 transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ borderLeft: '3px solid #7C3AED', borderRadius: '0 1rem 1rem 0' }}>
            <span className="badge-844 self-start">8-4-4</span>
            <span className="stat-val">{studentStats?.by_curriculum_mode?.find((m: any) => m.curriculum_mode === 'eight_four_four')?.count || '—'}</span>
            <span className="stat-hint">Forms 1–4 · KCSE</span>
          </Link>
          <Link href="/students?curriculum_mode=cbe"
            className="card-p flex flex-col gap-1 transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ borderLeft: '3px solid #0891B2', borderRadius: '0 1rem 1rem 0' }}>
            <span className="badge-cbe self-start">CBC/CBE</span>
            <span className="stat-val">{studentStats?.by_curriculum_mode?.find((m: any) => m.curriculum_mode === 'cbe')?.count || '—'}</span>
            <span className="stat-hint">Grades 7–12 · Pathways</span>
          </Link>
        </div>

        {/* Main stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger">
          <StatCard label="Active students" value={totalStudents} icon={Users} accent="#0B1D35" />
          {atRisk !== null && (
            <Link href="/ai">
              <StatCard label="At-risk" value={atRisk} hint="high + critical" icon={AlertTriangle} accent="#EF4444" />
            </Link>
          )}
          {collected !== undefined && (
            <StatCard label="Fees collected" value={formatCurrency(collected)} accent="#10B981" icon={DollarSign} />
          )}
          {collectionPct !== null && (
            <StatCard label="Collection rate" value={`${collectionPct}%`} hint="of total expected" icon={TrendingUp}
              accent={collectionPct >= 80 ? '#10B981' : collectionPct >= 60 ? '#F59E0B' : '#EF4444'} />
          )}
        </div>

        {/* AI risk panel */}
        {riskData?.scores?.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-[--border] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(0,200,150,0.12)' }}>
                  <Brain className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                </div>
                <span className="font-medium text-sm text-[--text-1]">AI risk alerts</span>
              </div>
              <Link href="/ai" className="text-xs text-[--text-3] hover:text-[--text-1] flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-[--border]">
              {riskData.scores.filter((s: any) => ['critical','high'].includes(s.risk_category)).slice(0,5).map((s: any) => (
                <Link key={s.student_id} href={`/students/${s.student_id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[--surface] transition-colors">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-semibold flex-shrink-0"
                    style={{ background: `${RISK_COLORS[s.risk_category]}18`, color: RISK_COLORS[s.risk_category] }}>
                    {s.full_name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[--text-1] truncate">{s.full_name}</p>
                    <p className="text-xs text-[--text-3]">
                      {s.curriculum_mode === 'cbe' ? `Grade ${s.current_grade}` : s.current_form}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${s.risk_score}%`, background: RISK_COLORS[s.risk_category] }} />
                    </div>
                    <span className={`badge-${s.risk_category}`}>{s.risk_category}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div>
          <p className="text-xs font-medium text-[--text-2] uppercase tracking-wide mb-3">Quick actions</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: '/students/new', icon: Users, label: 'Add student', color: 'var(--navy)' },
              { href: '/grades', icon: BookOpen, label: 'Record grades', color: '#7C3AED' },
              { href: '/fees', icon: DollarSign, label: 'Manage fees', color: '#10B981' },
              { href: '/ai', icon: Brain, label: 'AI insights', color: 'var(--accent)' },
            ].map(({ href, icon: Icon, label, color }) => (
              <Link key={href} href={href}
                className="card-p flex flex-col items-center gap-2 text-center hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${color}15` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <span className="text-xs font-medium text-[--text-1]">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Fee summary */}
        {feeData?.totals && (
          <div className="card-p space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm text-[--text-1]">Fee collection — Term 1</span>
              <Link href="/fees" className="text-xs text-[--text-3] hover:text-[--text-1] flex items-center gap-1">
                Details <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="h-2 rounded-full overflow-hidden bg-[--surface]">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${collectionPct}%`,
                         background: collectionPct >= 80 ? '#10B981' : collectionPct >= 60 ? '#F59E0B' : '#EF4444' }} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-[--text-3]">Expected</p>
                <p className="text-sm font-semibold text-[--text-1]">{formatCurrency(feeData.totals.total_expected)}</p>
              </div>
              <div>
                <p className="text-xs text-[--text-3]">Collected</p>
                <p className="text-sm font-semibold text-emerald-600">{formatCurrency(feeData.totals.total_collected)}</p>
              </div>
              <div>
                <p className="text-xs text-[--text-3]">Outstanding</p>
                <p className="text-sm font-semibold text-red-500">{formatCurrency(feeData.totals.total_outstanding)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
