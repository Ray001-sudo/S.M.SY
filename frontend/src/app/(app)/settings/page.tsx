'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader, Field } from '@/components/ui';
import { Save, Palette, CreditCard, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [tab, setTab] = useState<'branding'|'payment'|'sms'>('branding');
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['school-settings'], queryFn: () => api.get('/settings').then(r => r.data) });
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (settings) setForm(settings); }, [settings]);
  const mutation = useMutation({ mutationFn: (d:any) => api.put('/settings', d), onSuccess: (r) => { toast.success('Settings saved'); qc.invalidateQueries({ queryKey: ['school-settings'] }); if (r.data.primary_color) document.documentElement.style.setProperty('--navy', r.data.primary_color); if (r.data.accent_color) document.documentElement.style.setProperty('--accent', r.data.accent_color); }, onError: (e:any) => toast.error(e.response?.data?.error||'Failed') });
  const set = (k:string, v:any) => setForm((f:any) => ({ ...f, [k]: v }));
  const TABS = [['branding','Branding',Palette],['payment','Payments',CreditCard],['sms','SMS',Phone]] as const;
  return (
    <div className="page">
      <PageHeader title="Global settings" subtitle="Branding · Payments · Communication" action={<button onClick={() => mutation.mutate(form)} className="btn-primary btn-sm" disabled={mutation.isPending}><Save className="w-4 h-4"/>{mutation.isPending?'Saving…':'Save all'}</button>}/>
      <div className="page-content max-w-2xl">
        <div className="flex gap-1 p-1 rounded-2xl w-fit" style={{background:'var(--surface)',border:'1px solid var(--border)'}}>
          {TABS.map(([id,label,Icon]) => (<button key={id} onClick={() => setTab(id as any)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab===id?'text-white':'text-[--text-2]'}`} style={tab===id?{background:'var(--navy)'}:{}}><Icon className="w-3.5 h-3.5"/>{label}</button>))}
        </div>
        {tab==='branding' && (
          <div className="card-p space-y-5 animate-slide-up">
            <h3 className="font-semibold text-[--text-1]">School identity</h3>
            <p className="text-xs text-[--text-2]">These details appear on the login page, dashboards, report cards, exam papers, and all SMS messages.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="School name"><input className="input" value={form.school_name||''} onChange={e=>set('school_name',e.target.value)} placeholder="Uhuru Boarding High School"/></Field>
              <Field label="Principal name"><input className="input" value={form.principal_name||''} onChange={e=>set('principal_name',e.target.value)} placeholder="Dr. Mary Kamau"/></Field>
              <Field label="Address"><input className="input" value={form.address||''} onChange={e=>set('address',e.target.value)} placeholder="P.O Box 123, Nairobi"/></Field>
              <Field label="Phone"><input className="input" value={form.phone||''} onChange={e=>set('phone',e.target.value)} placeholder="+254700000000"/></Field>
              <Field label="Email"><input type="email" className="input" value={form.email||''} onChange={e=>set('email',e.target.value)} placeholder="admin@school.ac.ke"/></Field>
              <Field label="Website"><input className="input" value={form.website||''} onChange={e=>set('website',e.target.value)} placeholder="www.school.ac.ke"/></Field>
              <Field label="School motto"><input className="input" value={form.motto||''} onChange={e=>set('motto',e.target.value)} placeholder="Excellence in Education"/></Field>
              <Field label="Logo URL"><input className="input" value={form.logo_url||''} onChange={e=>set('logo_url',e.target.value)} placeholder="https://…/logo.png"/></Field>
            </div>
            <div>
              <h4 className="font-medium text-sm text-[--text-1] mb-3">Brand colours</h4>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Primary colour"><div className="flex gap-2"><input type="color" className="w-10 h-10 rounded-lg border border-[--border] cursor-pointer p-0.5" value={form.primary_color||'#0B1D35'} onChange={e=>set('primary_color',e.target.value)}/><input className="input" value={form.primary_color||'#0B1D35'} onChange={e=>set('primary_color',e.target.value)}/></div></Field>
                <Field label="Accent colour"><div className="flex gap-2"><input type="color" className="w-10 h-10 rounded-lg border border-[--border] cursor-pointer p-0.5" value={form.accent_color||'#00C896'} onChange={e=>set('accent_color',e.target.value)}/><input className="input" value={form.accent_color||'#00C896'} onChange={e=>set('accent_color',e.target.value)}/></div></Field>
              </div>
            </div>
            <div className="p-4 rounded-2xl" style={{background:form.primary_color||'var(--navy)',borderRadius:'16px'}}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm" style={{background:form.accent_color||'#00C896',color:form.primary_color||'#0B1D35'}}>{(form.school_name||'S').charAt(0)}</div>
                <span className="text-white font-semibold">{form.school_name||'School Name'}</span>
              </div>
              {form.motto && <p className="text-white/60 text-xs italic mt-1">"{form.motto}"</p>}
            </div>
          </div>
        )}
        {tab==='payment' && (
          <div className="card-p space-y-5 animate-slide-up">
            <h3 className="font-semibold text-[--text-1]">Payment details</h3>
            <p className="text-xs text-[--text-2]">Displayed to parents on invoices and the fee portal.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="M-Pesa Paybill"><input className="input" value={form.mpesa_paybill||''} onChange={e=>set('mpesa_paybill',e.target.value)} placeholder="174379"/></Field>
              <Field label="Bank name"><input className="input" value={form.bank_name||''} onChange={e=>set('bank_name',e.target.value)} placeholder="Equity Bank"/></Field>
              <Field label="Bank account"><input className="input" value={form.bank_account||''} onChange={e=>set('bank_account',e.target.value)} placeholder="0123456789"/></Field>
              <Field label="Branch"><input className="input" value={form.bank_branch||''} onChange={e=>set('bank_branch',e.target.value)} placeholder="Nairobi CBD"/></Field>
            </div>
          </div>
        )}
        {tab==='sms' && (
          <div className="card-p space-y-5 animate-slide-up">
            <h3 className="font-semibold text-[--text-1]">SMS communication</h3>
            <Field label="SMS sender ID (max 11 chars)"><input className="input max-w-xs" value={form.at_sender_id||'SHULE360'} maxLength={11} onChange={e=>set('at_sender_id',e.target.value.toUpperCase())} placeholder="SHULE360"/><p className="text-xs text-[--text-3] mt-1">Parents receive SMS from: <strong>{form.at_sender_id||'SHULE360'}</strong></p></Field>
            <Field label="Principal signature URL"><input className="input" value={form.principal_signature_url||''} onChange={e=>set('principal_signature_url',e.target.value)} placeholder="https://…/signature.png"/></Field>
          </div>
        )}
      </div>
    </div>
  );
}
