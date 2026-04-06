'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader, EmptyState } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DollarSign, Smartphone, CheckCircle, AlertCircle, Clock, Plus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

export default function FeesPage() {
  const [term, setTerm] = useState(1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [stkPhone, setStkPhone] = useState<Record<string, string>>({});
  const [stkOpen, setStkOpen] = useState<string | null>(null);
  const [showAddStructure, setShowAddStructure] = useState(false);
  const qc = useQueryClient();

  const { data: dashboard, isLoading, refetch } = useQuery({
    queryKey: ['fee-dashboard', term, year],
    queryFn: () => api.get(`/fees/dashboard?term=${term}&academic_year=${year}`).then(r => r.data),
  });

  const { data: structures } = useQuery({
    queryKey: ['fee-structures'],
    queryFn: () => api.get('/fees/structures').then(r => r.data),
  });

  const stkMutation = useMutation({
    mutationFn: (data: { phone: string; amount: number; invoice_id: string }) =>
      api.post('/payments/mpesa/stk-push', data),
    onSuccess: () => {
      toast.success('STK Push sent — parent will receive a prompt on their phone');
      setStkOpen(null);
      setStkPhone({});
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'STK Push failed — check M-Pesa credentials'),
  });

  const invoiceMutation = useMutation({
    mutationFn: (data: any) => api.post('/fees/generate-invoices', data),
    onSuccess: (r) => {
      toast.success(`Generated ${r.data.created} invoices`);
      qc.invalidateQueries({ queryKey: ['fee-dashboard'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to generate invoices'),
  });

  const totals = dashboard?.totals;
  const collectionPct = totals?.total_expected > 0
    ? Math.round((totals.total_collected / totals.total_expected) * 100) : 0;

  const STATUS_ICON: Record<string, React.ReactNode> = {
    paid:    <CheckCircle className="w-4 h-4 text-emerald-500" />,
    partial: <Clock className="w-4 h-4 text-amber-500" />,
    overdue: <AlertCircle className="w-4 h-4 text-red-500" />,
    unpaid:  <AlertCircle className="w-4 h-4 text-gray-400" />,
  };

  return (
    <div className="page">
      <PageHeader title="Fee management" subtitle="M-Pesa integrated · Real-time balances"
        action={
          <div className="flex gap-2">
            <button onClick={() => refetch()} className="btn-ghost btn-sm">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setShowAddStructure(true)} className="btn-primary btn-sm">
              <Plus className="w-4 h-4" /><span className="hidden sm:inline">New structure</span>
            </button>
          </div>
        }
      />

      <div className="page-content">
        {/* Term/Year filters */}
        <div className="flex gap-2 flex-wrap">
          <select className="input w-auto" value={term} onChange={e => setTerm(+e.target.value)}>
            <option value={1}>Term 1</option><option value={2}>Term 2</option><option value={3}>Term 3</option>
          </select>
          <select className="input w-auto" value={year} onChange={e => setYear(+e.target.value)}>
            {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {structures?.length > 0 && (
            <button onClick={() => {
              const s = structures[0];
              invoiceMutation.mutate({ term, academic_year: year, fee_structure_id: s.id });
            }} className="btn-ghost btn-sm" disabled={invoiceMutation.isPending}>
              {invoiceMutation.isPending
                ? <><span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" /> Generating…</>
                : <><Plus className="w-3.5 h-3.5" /> Generate invoices</>}
            </button>
          )}
        </div>

        {/* Summary cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
          </div>
        ) : totals ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger">
              <div className="stat-card">
                <div className="stat-lbl">Expected</div>
                <div className="stat-val text-xl">{formatCurrency(totals.total_expected)}</div>
                <div className="stat-hint">{totals.total_invoices} invoices</div>
              </div>
              <div className="stat-card" style={{ borderLeft: '3px solid #10B981', borderRadius: '0 1rem 1rem 0' }}>
                <div className="stat-lbl">Collected</div>
                <div className="stat-val text-xl" style={{ color: '#10B981' }}>{formatCurrency(totals.total_collected)}</div>
                <div className="stat-hint">{collectionPct}% of target</div>
              </div>
              <div className="stat-card" style={{ borderLeft: '3px solid #EF4444', borderRadius: '0 1rem 1rem 0' }}>
                <div className="stat-lbl">Outstanding</div>
                <div className="stat-val text-xl" style={{ color: '#EF4444' }}>{formatCurrency(totals.total_outstanding)}</div>
                <div className="stat-hint">{totals.overdue} overdue</div>
              </div>
              <div className="stat-card">
                <div className="stat-lbl">Fully paid</div>
                <div className="stat-val text-xl">{totals.fully_paid}</div>
                <div className="stat-hint">students</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="card-p space-y-2">
              <div className="flex justify-between text-xs text-[--text-2]">
                <span>Collection progress</span>
                <span>{collectionPct}%</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${collectionPct}%`,
                    background: collectionPct >= 80 ? '#10B981' : collectionPct >= 60 ? '#F59E0B' : '#EF4444'
                  }} />
              </div>
            </div>
          </>
        ) : (
          <EmptyState icon={DollarSign} title="No fee data" description="Generate invoices first or select a different term" />
        )}

        {/* Defaulters table */}
        {dashboard?.defaulters?.length > 0 && (
          <div className="tbl-wrap">
            <div className="px-4 py-3 border-b border-[--border] flex items-center justify-between">
              <span className="font-medium text-sm text-[--text-1]">Outstanding balances</span>
              <span className="badge-danger">{dashboard.defaulters.length} students</span>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-[--border]">
              {dashboard.defaulters.map((d: any) => (
                <div key={d.admission_number} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[--text-1]">{d.full_name}</p>
                      <p className="text-xs text-[--text-3] font-mono">{d.admission_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-500">{formatCurrency(d.balance)}</p>
                      <div className="flex items-center gap-1 justify-end mt-0.5">
                        {STATUS_ICON[d.status]}
                        <span className="text-xs text-[--text-3]">{d.status}</span>
                      </div>
                    </div>
                  </div>
                  {stkOpen === d.admission_number ? (
                    <div className="flex gap-2">
                      <input className="input flex-1 text-sm py-2" placeholder="+2547xxxxxxxx"
                        value={stkPhone[d.admission_number] || ''}
                        onChange={e => setStkPhone(p => ({ ...p, [d.admission_number]: e.target.value }))} />
                      <button className="btn-primary btn-sm" disabled={stkMutation.isPending}
                        onClick={() => stkMutation.mutate({
                          phone: stkPhone[d.admission_number],
                          amount: d.balance,
                          invoice_id: d.admission_number
                        })}>
                        {stkMutation.isPending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Send'}
                      </button>
                      <button className="btn-ghost btn-sm" onClick={() => setStkOpen(null)}>✕</button>
                    </div>
                  ) : (
                    <button onClick={() => setStkOpen(d.admission_number)} className="btn-ghost btn-sm w-full gap-1.5">
                      <Smartphone className="w-4 h-4" /> Send M-Pesa prompt
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <table className="tbl hidden sm:table">
              <thead>
                <tr>
                  <th>Student</th><th>Balance</th><th>Status</th>
                  <th>Due date</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.defaulters.map((d: any) => (
                  <tr key={d.admission_number}>
                    <td>
                      <p className="font-medium text-[--text-1]">{d.full_name}</p>
                      <p className="text-xs text-[--text-3] font-mono">{d.admission_number}</p>
                    </td>
                    <td><span className="font-semibold text-red-500">{formatCurrency(d.balance)}</span></td>
                    <td>
                      <div className="flex items-center gap-1">
                        {STATUS_ICON[d.status]}
                        <span className="text-sm capitalize">{d.status}</span>
                      </div>
                    </td>
                    <td className="text-sm text-[--text-2]">
                      {d.due_date ? formatDate(d.due_date) : '—'}
                    </td>
                    <td>
                      {stkOpen === d.admission_number ? (
                        <div className="flex gap-2">
                          <input className="input text-xs py-1.5 w-36" placeholder="+2547xxxxxxxx"
                            value={stkPhone[d.admission_number] || ''}
                            onChange={e => setStkPhone(p => ({ ...p, [d.admission_number]: e.target.value }))} />
                          <button className="btn-primary btn-sm text-xs" disabled={stkMutation.isPending}
                            onClick={() => stkMutation.mutate({
                              phone: stkPhone[d.admission_number],
                              amount: d.balance,
                              invoice_id: d.admission_number,
                            })}>Send</button>
                          <button className="btn-ghost btn-sm text-xs" onClick={() => setStkOpen(null)}>✕</button>
                        </div>
                      ) : (
                        <button onClick={() => setStkOpen(d.admission_number)} className="btn-ghost btn-sm gap-1.5">
                          <Smartphone className="w-3.5 h-3.5" /> STK Push
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Recent payments */}
        {dashboard?.recent_payments?.length > 0 && (
          <div className="tbl-wrap">
            <div className="px-4 py-3 border-b border-[--border]">
              <span className="font-medium text-sm text-[--text-1]">Recent payments</span>
            </div>
            <div className="divide-y divide-[--border]">
              {dashboard.recent_payments.map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(16,185,129,0.1)' }}>
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[--text-1]">{p.full_name}</p>
                    <div className="flex gap-2 mt-0.5">
                      <span className="badge bg-[--surface] text-[--text-3] text-xs">{p.payment_method?.replace(/_/g, ' ')}</span>
                      {p.mpesa_transaction_code && (
                        <span className="text-xs font-mono text-[--text-3]">{p.mpesa_transaction_code}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-emerald-600">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-[--text-3]">{formatDate(p.payment_date, 'dd MMM HH:mm')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
