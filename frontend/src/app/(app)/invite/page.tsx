'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader, EmptyState, Field } from '@/components/ui';
import { Key, Upload, Shield, CheckCircle, XCircle, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function InvitePage() {
  const [tab, setTab] = useState<'tokens'|'bulk'|'pending'>('tokens');
  const [tf, setTf] = useState({ role:'guardian', intended_name:'', intended_phone:'', intended_email:'' });
  const [bulkRows, setBulkRows] = useState('');
  const qc = useQueryClient();

  const { data: tokens } = useQuery({ queryKey: ['tokens'], queryFn: () => api.get('/invite/tokens').then(r => r.data), enabled: tab==='tokens' });
  const { data: pending } = useQuery({ queryKey: ['pending-accounts'], queryFn: () => api.get('/invite/pending').then(r => r.data), enabled: tab==='pending' });

  const tokenM = useMutation({ mutationFn: (d:any) => api.post('/invite/tokens', d), onSuccess: () => { toast.success('Token created & SMS sent'); setTf({ role:'guardian', intended_name:'', intended_phone:'', intended_email:'' }); qc.invalidateQueries({ queryKey: ['tokens'] }); }, onError: (e:any) => toast.error(e.response?.data?.error||'Failed') });
  const bulkM = useMutation({ mutationFn: (d:any) => api.post('/invite/bulk-upload', d), onSuccess: (r) => { toast.success(`Processed ${r.data.success} records`); setBulkRows(''); qc.invalidateQueries({ queryKey: ['tokens'] }); }, onError: (e:any) => toast.error(e.response?.data?.error||'Failed') });
  const reviewM = useMutation({ mutationFn: ({ id, ...d }:any) => api.post(`/invite/pending/${id}/review`, d), onSuccess: (_, v) => { toast.success(v.action==='approve'?'Account approved':'Account rejected'); qc.invalidateQueries({ queryKey: ['pending-accounts'] }); }, onError: (e:any) => toast.error(e.response?.data?.error||'Failed') });

  const parseBulk = () => bulkRows.trim().split('\n').filter(Boolean).map(l => { const [name,phone,email,role] = l.split(',').map(s => s.trim()); return { name, phone, email, role: role||'guardian' }; }).filter(r => r.name && r.phone);

  return (
    <div className="page">
      <PageHeader title="Access control & invitations" subtitle="Tokens · Bulk upload · Pending review" />
      <div className="page-content">
        <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background:'rgba(0,200,150,0.08)', border:'1px solid rgba(0,200,150,0.2)' }}>
          <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color:'var(--accent)' }}/>
          <div><p className="font-semibold text-sm text-[--text-1]">Pre-validated registration</p><p className="text-xs text-[--text-2] mt-1">Only users with a valid invitation token can register. Accounts without tokens go into a Pending Manual Review queue — preventing students from posing as teachers or parents spoofing staff accounts.</p></div>
        </div>
        <div className="flex gap-1 p-1 rounded-2xl w-fit" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
          {[['tokens','Issue token'],['bulk','Bulk CSV'],['pending','Pending review']].map(([t,l]) => (<button key={t} onClick={() => setTab(t as any)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab===t?'text-white':'text-[--text-2]'}`} style={tab===t?{background:'var(--navy)'}:{}}>{l}{t==='pending'&&(pending?.length||0)>0&&<span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background:'#EF4444' }}>{pending.length}</span>}</button>))}
        </div>
        {tab==='tokens' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-2 card-p space-y-4">
              <h3 className="font-semibold text-[--text-1]">Issue invitation token</h3>
              <Field label="Role"><select className="input" value={tf.role} onChange={e => setTf(f => ({ ...f, role: e.target.value }))}>{['guardian','teacher','staff'].map(r => <option key={r} value={r}>{r}</option>)}</select></Field>
              <Field label="Name"><input className="input" value={tf.intended_name} onChange={e => setTf(f => ({ ...f, intended_name: e.target.value }))} placeholder="Jane Mwangi" /></Field>
              <Field label="Phone (token sent via SMS)"><input className="input" value={tf.intended_phone} onChange={e => setTf(f => ({ ...f, intended_phone: e.target.value }))} placeholder="+2547xxxxxxxx" /></Field>
              <Field label="Email (optional)"><input className="input" value={tf.intended_email} onChange={e => setTf(f => ({ ...f, intended_email: e.target.value }))} placeholder="jane@email.com" /></Field>
              <button onClick={() => tokenM.mutate(tf)} className="btn-primary w-full" disabled={!tf.intended_name || !tf.intended_phone || tokenM.isPending}>{tokenM.isPending ? 'Creating…' : <><Key className="w-4 h-4"/>Create & send via SMS</>}</button>
            </div>
            <div className="lg:col-span-3 tbl-wrap">
              <div className="px-4 py-3 border-b border-[--border] font-medium text-sm">Issued tokens</div>
              {!tokens?.length ? <div className="p-8 text-center text-sm text-[--text-3]">No tokens issued yet</div> : (
                <table className="tbl"><thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Status</th><th>Expires</th></tr></thead>
                  <tbody>{tokens.map((t:any) => (<tr key={t.id}><td className="font-medium">{t.intended_name||'—'}</td><td><span className="badge-info capitalize">{t.role}</span></td><td className="text-sm font-mono text-[--text-2]">{t.intended_phone||'—'}</td><td>{t.is_used?<span className="badge-success">Used</span>:new Date(t.expires_at)<new Date()?<span className="badge-danger">Expired</span>:<span className="badge-warning">Active</span>}</td><td className="text-xs text-[--text-3]">{t.expires_at ? formatDate(t.expires_at) : '—'}</td></tr>))}</tbody>
                </table>
              )}
            </div>
          </div>
        )}
        {tab==='bulk' && (
          <div className="card-p space-y-4">
            <h3 className="font-semibold">Bulk CSV upload</h3>
            <div className="p-3 rounded-xl text-xs text-[--text-2] space-y-1" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
              <p className="font-medium text-[--text-1]">CSV format (one per line):</p>
              <p className="font-mono">Full Name, Phone, Email, Role</p>
              <p className="font-mono text-[--text-3]">Jane Mwangi, +254712345678, jane@email.com, guardian</p>
              <p className="mt-1">Each person receives an SMS with their unique invitation token automatically.</p>
            </div>
            <Field label="Paste CSV data"><textarea className="input font-mono text-xs" rows={10} value={bulkRows} onChange={e => setBulkRows(e.target.value)} placeholder={"Jane Mwangi, +254712345678, jane@gmail.com, guardian\nPeter Otieno, +254722345678, peter@school.ac.ke, teacher"}/></Field>
            <div className="flex items-center justify-between">
              <p className="text-sm text-[--text-2]">{parseBulk().length} valid rows</p>
              <button onClick={() => bulkM.mutate({ upload_type:'guardians', rows: parseBulk() })} className="btn-primary" disabled={parseBulk().length===0||bulkM.isPending}>{bulkM.isPending?'Processing…':<><Upload className="w-4 h-4"/>Upload & send SMS tokens</>}</button>
            </div>
          </div>
        )}
        {tab==='pending' && (!pending?.length ? <EmptyState icon={CheckCircle} title="No pending accounts" description="All requests reviewed" /> : (
          <div className="space-y-3 stagger">
            {pending.map((p:any) => (
              <div key={p.id} className="card-p space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-medium text-[--text-1]">{p.full_name}</p><p className="text-xs text-[--text-3]">{p.email} · {p.phone}</p><p className="text-xs text-amber-600 mt-0.5">Requested: <strong>{p.requested_role}</strong></p></div>
                  <div className="flex items-center gap-1"><Clock className="w-4 h-4 text-amber-500"/><span className="badge-warning">Pending</span></div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <select className="input w-auto text-sm py-1.5" id={`role-${p.id}`} defaultValue={p.requested_role}>{['guardian','teacher','class_teacher','bursar','counsellor'].map(r => <option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}</select>
                  <button onClick={() => { const sel = document.getElementById(`role-${p.id}`) as HTMLSelectElement; reviewM.mutate({ id: p.id, action:'approve', role: sel?.value||p.requested_role }); }} className="btn-primary btn-sm gap-1.5" disabled={reviewM.isPending}><CheckCircle className="w-3.5 h-3.5"/>Approve</button>
                  <button onClick={() => reviewM.mutate({ id: p.id, action:'reject' })} className="btn-danger btn-sm gap-1.5" disabled={reviewM.isPending}><XCircle className="w-3.5 h-3.5"/>Reject</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
