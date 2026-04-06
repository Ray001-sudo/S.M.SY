'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader, EmptyState, Field } from '@/components/ui';
import { Video, Plus, Play, Square, Archive, ExternalLink } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const TYPE_COLORS: Record<string, string> = { lesson:'badge-info', staff_meeting:'badge-844', parent_meeting:'badge-warning', revision:'badge-cbe' };

export default function VirtualPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<'upcoming'|'recordings'>('upcoming');
  const [form, setForm] = useState({ title:'', description:'', session_type:'lesson', subject:'', grade_level:'', scheduled_at: new Date().toISOString().slice(0,16), duration_minutes: 60 });
  const qc = useQueryClient();

  const { data: sessions, isLoading } = useQuery({ queryKey: ['virtual-sessions'], queryFn: () => api.get('/virtual').then(r => r.data) });
  const { data: recordings } = useQuery({ queryKey: ['recordings'], queryFn: () => api.get('/virtual/recordings').then(r => r.data), enabled: tab === 'recordings' });

  const createM = useMutation({ mutationFn: (d:any) => api.post('/virtual', d), onSuccess: () => { toast.success('Session created'); setShowCreate(false); setForm({ title:'', description:'', session_type:'lesson', subject:'', grade_level:'', scheduled_at: new Date().toISOString().slice(0,16), duration_minutes: 60 }); qc.invalidateQueries({ queryKey: ['virtual-sessions'] }); }, onError: (e:any) => toast.error(e.response?.data?.error||'Failed') });
  const startM = useMutation({ mutationFn: (id:string) => api.post(`/virtual/${id}/start`), onSuccess: (r) => { window.open(r.data.join_url, '_blank'); qc.invalidateQueries({ queryKey: ['virtual-sessions'] }); } });
  const endM = useMutation({ mutationFn: (id:string) => api.post(`/virtual/${id}/end`, {}), onSuccess: () => { toast.success('Session ended'); qc.invalidateQueries({ queryKey: ['virtual-sessions'] }); } });

  const upcoming = sessions?.filter((s:any) => ['scheduled','live'].includes(s.status)) || [];
  const display = tab === 'upcoming' ? upcoming : (recordings || []);
  const set = (k:string, v:any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="page">
      <PageHeader title="Virtual classrooms" subtitle="Live lessons · Recordings · Staff meetings" action={<button onClick={() => setShowCreate(true)} className="btn-primary btn-sm"><Plus className="w-4 h-4" /><span className="hidden sm:inline">New session</span></button>} />
      <div className="page-content">
        <div className="flex gap-1 p-1 rounded-2xl w-fit" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
          {[['upcoming','Upcoming & live'],['recordings','Recordings']].map(([t,l]) => (<button key={t} onClick={() => setTab(t as any)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab===t?'text-white':'text-[--text-2]'}`} style={tab===t?{background:'var(--navy)'}:{}}>{t==='recordings'?<Archive className="w-3.5 h-3.5"/>:<Video className="w-3.5 h-3.5"/>}{l}</button>))}
        </div>
        {showCreate && (
          <div className="card-p space-y-4 animate-slide-up" style={{ border:'2px solid rgba(0,200,150,0.3)' }}>
            <div className="flex justify-between"><h3 className="font-semibold">Schedule a session</h3><button onClick={() => setShowCreate(false)} className="btn-ghost btn-sm">Cancel</button></div>
            <div className="p-3 rounded-xl text-xs text-[--text-2]" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>Powered by <strong>Jitsi Meet</strong> — free, browser-based. No app download required. Students join via link.</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Title *"><input className="input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Grade 9 Mathematics — Algebra" /></Field>
              <Field label="Session type"><select className="input" value={form.session_type} onChange={e => set('session_type', e.target.value)}><option value="lesson">Lesson</option><option value="staff_meeting">Staff meeting</option><option value="parent_meeting">Parent meeting</option><option value="revision">Revision</option></select></Field>
              <Field label="Subject"><input className="input" value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="Mathematics" /></Field>
              <Field label="Grade / Form"><input className="input" value={form.grade_level} onChange={e => set('grade_level', e.target.value)} placeholder="Grade 9 / Form 3" /></Field>
              <Field label="Date & time *"><input type="datetime-local" className="input" value={form.scheduled_at} onChange={e => set('scheduled_at', e.target.value)} /></Field>
              <Field label="Duration (minutes)"><input type="number" className="input" min={15} max={240} value={form.duration_minutes} onChange={e => set('duration_minutes', +e.target.value)} /></Field>
            </div>
            <button onClick={() => createM.mutate(form)} className="btn-primary" disabled={!form.title || createM.isPending}>{createM.isPending ? 'Creating…' : 'Schedule session'}</button>
          </div>
        )}
        {isLoading ? <div className="space-y-2">{[...Array(3)].map((_,i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
          : display.length === 0 ? <EmptyState icon={Video} title={tab==='recordings'?'No recordings yet':'No sessions scheduled'} description={tab==='recordings'?'Ended sessions with recordings appear here':'Schedule a session above'} />
          : (
            <div className="space-y-3 stagger">
              {display.map((s:any) => (
                <div key={s.id} className="card-p space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s.status==='live'?'bg-red-100':'bg-blue-50'}`}><Video className={`w-4 h-4 ${s.status==='live'?'text-red-500':'text-blue-500'}`} /></div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap"><p className="font-medium text-[--text-1]">{s.title}</p>{s.status==='live' && <span className="flex items-center gap-1 text-xs text-red-600 font-semibold"><span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />LIVE</span>}</div>
                        <div className="flex gap-2 mt-0.5 flex-wrap"><span className={TYPE_COLORS[s.session_type]}>{s.session_type?.replace(/_/g,' ')}</span>{s.subject && <span className="text-xs text-[--text-3]">{s.subject}</span>}</div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0"><p className="text-xs text-[--text-3]">{s.scheduled_at ? formatDate(s.scheduled_at) : '—'}</p><p className="text-xs text-[--text-3]">{s.duration_minutes} min</p></div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {s.status==='scheduled' && <button onClick={() => startM.mutate(s.id)} className="btn-primary btn-sm gap-1.5" disabled={startM.isPending}><Play className="w-3.5 h-3.5" />Start session</button>}
                    {s.status==='live' && <><a href={s.join_url} target="_blank" rel="noopener noreferrer" className="btn-sm text-white" style={{ background:'#059669', display:'flex', alignItems:'center', gap:'6px', padding:'6px 12px', borderRadius:'10px' }}><ExternalLink className="w-3.5 h-3.5" />Rejoin</a><button onClick={() => endM.mutate(s.id)} className="btn-danger btn-sm gap-1.5"><Square className="w-3.5 h-3.5" />End</button></>}
                    {s.join_url && s.status!=='ended' && <button onClick={() => { navigator.clipboard.writeText(s.join_url); toast.success('Link copied'); }} className="btn-ghost btn-sm text-xs">Copy join link</button>}
                    {s.recording_url && <a href={s.recording_url} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm gap-1.5 text-xs"><Archive className="w-3.5 h-3.5" />View recording</a>}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
