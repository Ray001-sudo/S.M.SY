'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader, EmptyState, Field } from '@/components/ui';
import { BookMarked, Plus, Download, Trash2, Search, FileText, Video } from 'lucide-react';
import toast from 'react-hot-toast';

const TYPE_ICON: Record<string, any> = { pdf: FileText, video: Video, document: FileText, link: FileText, audio: FileText, image: FileText };

export default function LibraryPage() {
  const [search, setSearch] = useState('');
  const [currFilter, setCurrFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title:'', description:'', resource_type:'pdf', curriculum_mode:'both', subject:'', grade_level:'', file_url:'', is_public:true });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['library', currFilter], queryFn: () => api.get('/library', { params: { curriculum_mode: currFilter||undefined } }).then(r => r.data) });
  const addM = useMutation({ mutationFn: (d:any) => api.post('/library', d), onSuccess: () => { toast.success('Resource added'); setShowAdd(false); setForm({ title:'', description:'', resource_type:'pdf', curriculum_mode:'both', subject:'', grade_level:'', file_url:'', is_public:true }); qc.invalidateQueries({ queryKey: ['library'] }); }, onError: (e:any) => toast.error(e.response?.data?.error||'Failed') });
  const delM = useMutation({ mutationFn: (id:string) => api.delete(`/library/${id}`), onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['library'] }); } });
  const dlM = useMutation({ mutationFn: (id:string) => api.post(`/library/${id}/download`) });

  const filtered = data?.data?.filter((r:any) => !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.subject?.toLowerCase().includes(search.toLowerCase())) || [];
  const set = (k:string, v:any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="page">
      <PageHeader title="Digital library" subtitle="CBC & 8-4-4 resources · View & download" action={<button onClick={() => setShowAdd(true)} className="btn-primary btn-sm"><Plus className="w-4 h-4" /><span className="hidden sm:inline">Add resource</span></button>} />
      <div className="page-content">
        {showAdd && (
          <div className="card-p space-y-4 animate-slide-up" style={{ border:'2px solid rgba(0,200,150,0.3)' }}>
            <div className="flex justify-between"><h3 className="font-semibold text-[--text-1]">Add resource</h3><button onClick={() => setShowAdd(false)} className="btn-ghost btn-sm">Cancel</button></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Title *"><input className="input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="CBC Grade 8 Science Notes" /></Field>
              <Field label="Type"><select className="input" value={form.resource_type} onChange={e => set('resource_type', e.target.value)}>{['pdf','video','document','audio','link','image'].map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}</select></Field>
              <Field label="Subject"><input className="input" value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="Integrated Science" /></Field>
              <Field label="Grade / Form"><input className="input" value={form.grade_level} onChange={e => set('grade_level', e.target.value)} placeholder="Grade 8 / Form 3" /></Field>
              <Field label="Curriculum"><select className="input" value={form.curriculum_mode} onChange={e => set('curriculum_mode', e.target.value)}><option value="both">Both</option><option value="eight_four_four">8-4-4</option><option value="cbe">CBE</option></select></Field>
              <Field label="File URL *"><input className="input" value={form.file_url} onChange={e => set('file_url', e.target.value)} placeholder="https://drive.google.com/…" /></Field>
              <div className="sm:col-span-2"><Field label="Description"><input className="input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description…" /></Field></div>
            </div>
            <button onClick={() => addM.mutate(form)} className="btn-primary" disabled={!form.title || !form.file_url || addM.isPending}>{addM.isPending ? 'Adding…' : <><Plus className="w-4 h-4" />Add to library</>}</button>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-3]" /><input className="input pl-10" placeholder="Search resources…" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <select className="input w-auto" value={currFilter} onChange={e => setCurrFilter(e.target.value)}><option value="">All curricula</option><option value="eight_four_four">8-4-4</option><option value="cbe">CBE</option></select>
        </div>
        {isLoading ? <div className="space-y-2">{[...Array(4)].map((_,i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
          : filtered.length === 0 ? <EmptyState icon={BookMarked} title="No resources found" description="Add the first resource above" />
          : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger">
              {filtered.map((r:any) => {
                const Icon = TYPE_ICON[r.resource_type] || FileText;
                return (
                  <div key={r.id} className="card-p space-y-3">
                    <div className="flex items-start gap-3">
                      <Icon className="w-5 h-5 text-[--text-3] flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[--text-1] truncate">{r.title}</p>
                        <p className="text-xs text-[--text-3]">{r.subject && <>{r.subject} · </>}{r.grade_level && <>{r.grade_level} · </>}{r.download_count} downloads</p>
                        {r.description && <p className="text-xs text-[--text-2] mt-1 line-clamp-2">{r.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={r.curriculum_mode === 'cbe' ? 'badge-cbe' : r.curriculum_mode === 'eight_four_four' ? 'badge-844' : 'badge-info'}>{r.curriculum_mode === 'both' ? 'Both' : r.curriculum_mode === 'cbe' ? 'CBE' : '8-4-4'}</span>
                      <span className="badge text-xs bg-[--surface] text-[--text-2]">{r.resource_type?.toUpperCase()}</span>
                      <div className="flex gap-1 ml-auto">
                        <a href={r.file_url} target="_blank" rel="noopener noreferrer" onClick={() => dlM.mutate(r.id)} className="btn-ghost btn-sm gap-1 text-xs"><Download className="w-3.5 h-3.5" />Open</a>
                        <button onClick={() => { if (confirm('Delete this resource?')) delM.mutate(r.id); }} className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </div>
  );
}
