'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader, EmptyState } from '@/components/ui';
import { MessageSquare, Bell, FileText, Plus, Send, Users } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

type Tab = 'notices' | 'consent';

const CATEGORY_STYLE: Record<string, string> = {
  academic:  'badge-info',
  welfare:   'badge-success',
  financial: 'badge-warning',
  events:    'badge bg-purple-100 text-purple-700',
  emergency: 'badge-danger',
  pathway:   'badge-cbe',
};

export default function CommunicationPage() {
  const [tab, setTab] = useState<Tab>('notices');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', category: 'academic', send_sms: false });
  const qc = useQueryClient();

  const { data: notices, isLoading } = useQuery({
    queryKey: ['notices'],
    queryFn: () => api.get('/communication/notices').then(r => r.data),
    enabled: tab === 'notices',
  });

  const { data: consents } = useQuery({
    queryKey: ['consent-forms'],
    queryFn: () => api.get('/communication/consent-forms').then(r => r.data),
    enabled: tab === 'consent',
  });

  const noticeMutation = useMutation({
    mutationFn: (data: any) => api.post('/communication/notices', data),
    onSuccess: () => {
      toast.success('Notice published' + (form.send_sms ? ' · SMS sent to all parents' : ''));
      setShowForm(false);
      setForm({ title: '', body: '', category: 'academic', send_sms: false });
      qc.invalidateQueries({ queryKey: ['notices'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to publish'),
  });

  const consentMutation = useMutation({
    mutationFn: (data: any) => api.post('/communication/consent-forms', data),
    onSuccess: () => {
      toast.success('Consent form created and parents notified');
      qc.invalidateQueries({ queryKey: ['consent-forms'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to create'),
  });

  const markRead = (id: string) => api.post(`/communication/notices/${id}/read`).catch(() => {});

  return (
    <div className="page">
      <PageHeader title="Communication" subtitle="Notices · Messaging · Consent forms"
        action={
          <button onClick={() => setShowForm(true)} className="btn-primary btn-sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{tab === 'notices' ? 'New notice' : 'New consent'}</span>
          </button>
        }
      />

      <div className="page-content">
        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-2xl w-fit"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {([['notices', 'Notices', Bell], ['consent', 'Consent forms', FileText]] as const).map(([t, l, Icon]) => (
            <button key={t} onClick={() => { setTab(t); setShowForm(false); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t ? 'text-white' : 'text-[--text-2]'
              }`}
              style={tab === t ? { background: 'var(--navy)' } : {}}>
              <Icon className="w-3.5 h-3.5" /> {l}
            </button>
          ))}
        </div>

        {/* New notice / consent form */}
        {showForm && (
          <div className="card-p space-y-4 animate-slide-up"
            style={{ border: '2px solid rgba(0,200,150,0.3)' }}>
            <h3 className="font-semibold text-[--text-1]">
              {tab === 'notices' ? 'Publish a notice' : 'Create consent form'}
            </h3>
            <div className="space-y-1">
              <label className="label">Title *</label>
              <input className="input" value={form.title} placeholder="Notice title…"
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="label">{tab === 'notices' ? 'Body' : 'Description'} *</label>
              <textarea className="input" rows={4} value={form.body}
                placeholder={tab === 'notices' ? 'Full notice content…' : 'What are parents consenting to?'}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="label">Category</label>
                <select className="input" value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {['academic','welfare','financial','events','emergency','pathway'].map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3 pt-5">
                <input type="checkbox" id="sms-chk" checked={form.send_sms}
                  onChange={e => setForm(f => ({ ...f, send_sms: e.target.checked }))}
                  className="w-4 h-4 accent-green-500" />
                <label htmlFor="sms-chk" className="text-sm text-[--text-1] cursor-pointer">
                  Send SMS to all parents
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => noticeMutation.mutate(form)}
                className="btn-primary" disabled={!form.title || !form.body || noticeMutation.isPending}>
                {noticeMutation.isPending
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Publishing…</>
                  : <><Send className="w-4 h-4" /> Publish</>}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        )}

        {/* Notices */}
        {tab === 'notices' && (
          <>
            {isLoading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>
            ) : !notices?.length ? (
              <EmptyState icon={Bell} title="No notices yet" description="Create your first notice above" />
            ) : (
              <div className="space-y-3 stagger">
                {notices.map((n: any) => (
                  <div key={n.id} className="card-p cursor-pointer hover:scale-[1.005] transition-transform active:scale-[0.998]"
                    onClick={() => markRead(n.id)}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={CATEGORY_STYLE[n.category] || 'badge-info'}>{n.category}</span>
                        {n.send_sms && (
                          <span className="badge-success text-xs">SMS sent</span>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-[--text-3]">{formatDate(n.created_at)}</p>
                        <p className="text-xs text-[--text-3] mt-0.5">{n.read_count} read</p>
                      </div>
                    </div>
                    <p className="font-semibold text-[--text-1] mb-1">{n.title}</p>
                    <p className="text-sm text-[--text-2] line-clamp-3">{n.body}</p>
                    <p className="text-xs text-[--text-3] mt-2">By {n.author}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Consent forms */}
        {tab === 'consent' && (
          <>
            {!consents?.length ? (
              <EmptyState icon={FileText} title="No consent forms" description="Create one using the button above" />
            ) : (
              <div className="space-y-3 stagger">
                {consents.map((f: any) => {
                  const signed = Array.isArray(f.signed_by) ? f.signed_by : (typeof f.signed_by === 'string' ? JSON.parse(f.signed_by) : []);
                  return (
                    <div key={f.id} className="card-p space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[--text-1]">{f.title}</p>
                          <p className="text-sm text-[--text-2] mt-1">{f.description}</p>
                        </div>
                        <span className="badge-info flex-shrink-0">{signed.length} signed</span>
                      </div>
                      {f.deadline && (
                        <p className="text-xs text-[--text-3]">Deadline: {formatDate(f.deadline)}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
