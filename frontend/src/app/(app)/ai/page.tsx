'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader, EmptyState } from '@/components/ui';
import { Brain, AlertTriangle, TrendingDown, ShieldCheck, Zap, ChevronRight, RefreshCw } from 'lucide-react';
import { cn, RISK_COLORS, PATHWAY_LABELS, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function AIPage() {
  const [currFilter, setCurrFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');

  const { data: riskData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['ai-risk', currFilter, catFilter],
    queryFn: () => api.get('/ai/risk/dashboard', {
      params: {
        curriculum_mode: currFilter || undefined,
        risk_category: catFilter || undefined,
        limit: 100,
      }
    }).then(r => r.data),
  });

  const summary = riskData?.summary;
  const scores = riskData?.scores || [];
  const highRisk = scores.filter((s: any) => ['critical', 'high'].includes(s.risk_category));

  const SUMMARY_ITEMS = [
    { label: 'Critical', key: 'critical', color: '#EF4444' },
    { label: 'High',     key: 'high',     color: '#F97316' },
    { label: 'Medium',   key: 'medium',   color: '#F59E0B' },
    { label: 'Low',      key: 'low',      color: '#10B981' },
  ];

  return (
    <div className="page">
      <PageHeader title="AI insights" subtitle="Weekly at-risk prediction · CBE pathway guidance"
        action={
          <button onClick={() => refetch()} disabled={isFetching} className="btn-ghost btn-sm">
            <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        }
      />

      <div className="page-content">
        {/* AI intro banner */}
        <div className="card-p flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg, rgba(0,200,150,0.08), rgba(11,29,53,0.05))', border: '1px solid rgba(0,200,150,0.2)' }}>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(0,200,150,0.15)' }}>
            <Brain className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[--text-1] text-sm">AI-native risk detection</p>
            <p className="text-xs text-[--text-2] mt-0.5">
              Analyses grades, attendance, and fee patterns weekly. Alerts fire automatically via SMS when risk crosses threshold.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 flex-shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Explainable AI</span>
          </div>
        </div>

        {/* Summary row */}
        {summary && (
          <div className="grid grid-cols-4 gap-3 stagger">
            {SUMMARY_ITEMS.map(({ label, key, color }) => (
              <button key={key} onClick={() => setCatFilter(catFilter === key ? '' : key)}
                className={cn('stat-card text-center transition-all', catFilter === key ? 'ring-2' : '')}
                style={catFilter === key ? { ringColor: color } : {}}>
                <div className="stat-val" style={{ color }}>{summary[key]}</div>
                <div className="stat-lbl" style={{ color: catFilter === key ? color : undefined }}>{label}</div>
              </button>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <select className="input w-auto" value={currFilter} onChange={e => setCurrFilter(e.target.value)}>
            <option value="">All curricula</option>
            <option value="eight_four_four">8-4-4</option>
            <option value="cbe">CBC / CBE</option>
          </select>
          {catFilter && (
            <button onClick={() => setCatFilter('')} className="btn-ghost btn-sm">
              Clear filter ✕
            </button>
          )}
          <span className="text-xs text-[--text-3] self-center ml-auto">
            {highRisk.length} high/critical students
          </span>
        </div>

        {/* Risk list */}
        {isLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>
        ) : scores.length === 0 ? (
          <EmptyState icon={Brain} title="No risk data yet"
            description="Risk scores are computed weekly. Run the AI service to generate scores." />
        ) : (
          <div className="tbl-wrap">
            <div className="px-4 py-3 border-b border-[--border] text-sm font-medium text-[--text-1]">
              At-risk students
            </div>

            {/* Mobile */}
            <div className="sm:hidden divide-y divide-[--border]">
              {scores.map((s: any) => {
                const factors = typeof s.top_factors === 'string' ? (() => { try { return JSON.parse(s.top_factors); } catch { return []; } })() : (s.top_factors || []);
                return (
                  <Link key={s.student_id} href={`/students/${s.student_id}`}
                    className="flex items-start gap-3 p-4 hover:bg-[--surface] active:bg-[--surface]">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-semibold flex-shrink-0"
                      style={{ background: `${RISK_COLORS[s.risk_category]}18`, color: RISK_COLORS[s.risk_category] }}>
                      {s.full_name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[--text-1]">{s.full_name}</p>
                      <p className="text-xs text-[--text-3]">
                        {s.curriculum_mode === 'cbe' ? `Grade ${s.current_grade}` : s.current_form}
                      </p>
                      {factors[0] && <p className="text-xs text-[--text-2] mt-1 truncate">{factors[0].factor}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`badge badge-${s.risk_category}`}>{Math.round(s.risk_score)}</span>
                      <p className="text-xs text-[--text-3] mt-1">{s.risk_category}</p>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Desktop */}
            <table className="tbl hidden sm:table">
              <thead>
                <tr>
                  <th>Student</th><th>Curriculum</th><th>Risk score</th>
                  <th>Category</th><th>Top factor</th><th>Computed</th><th></th>
                </tr>
              </thead>
              <tbody>
                {scores.map((s: any) => {
                  const factors = typeof s.top_factors === 'string' ? (() => { try { return JSON.parse(s.top_factors); } catch { return []; } })() : (s.top_factors || []);
                  return (
                    <tr key={s.student_id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0"
                            style={{ background: `${RISK_COLORS[s.risk_category]}18`, color: RISK_COLORS[s.risk_category] }}>
                            {s.full_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-[--text-1]">{s.full_name}</p>
                            <p className="text-xs text-[--text-3] font-mono">{s.admission_number}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={s.curriculum_mode === 'cbe' ? 'badge-cbe' : 'badge-844'}>
                          {s.curriculum_mode === 'cbe' ? `Grade ${s.current_grade}` : s.current_form}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden bg-gray-100">
                            <div className="h-full rounded-full"
                              style={{ width: `${s.risk_score}%`, background: RISK_COLORS[s.risk_category] }} />
                          </div>
                          <span className="font-mono text-sm">{Math.round(s.risk_score)}</span>
                        </div>
                      </td>
                      <td><span className={`badge-${s.risk_category}`}>{s.risk_category}</span></td>
                      <td className="text-xs text-[--text-2] max-w-48 truncate">{factors[0]?.factor || '—'}</td>
                      <td className="text-xs text-[--text-3]">{s.computed_at ? formatDate(s.computed_at) : '—'}</td>
                      <td>
                        <Link href={`/students/${s.student_id}`} className="text-[--text-3] hover:text-[--text-1]">
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
