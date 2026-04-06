'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader, EmptyState } from '@/components/ui';
import { Brain, FileText, Printer, Share2, CheckCircle, Clock, AlertCircle, RefreshCw, Eye } from 'lucide-react';
import { useBranding } from '@/components/branding/BrandingProvider';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';

const STATUS_ICON: Record<string, any> = { pending: <Clock className="w-4 h-4 text-amber-500 animate-pulse" />, processing: <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />, completed: <CheckCircle className="w-4 h-4 text-emerald-500" />, failed: <AlertCircle className="w-4 h-4 text-red-500" /> };

export default function ExamGeneratorPage() {
  const [tab, setTab] = useState<'generate'|'history'>('generate');
  const [previewJob, setPreviewJob] = useState<any>(null);
  const [pollId, setPollId] = useState<string|null>(null);
  const branding = useBranding();
  const qc = useQueryClient();
  const [form, setForm] = useState({ title:'', subject:'', grade_level:'', exam_type:'cat', curriculum_mode:'eight_four_four', num_questions:20, source_text:'', term:1, academic_year: new Date().getFullYear() });

  const { data: jobs } = useQuery({ queryKey: ['exam-gen-jobs'], queryFn: () => api.get('/exam-generator').then(r => r.data), enabled: tab==='history', refetchInterval: pollId ? 3000 : false });
  const { data: polledJob } = useQuery({ queryKey: ['exam-gen-job', pollId], queryFn: () => api.get(`/exam-generator/${pollId}`).then(r => r.data), enabled: !!pollId, refetchInterval: (d:any) => (d?.status==='processing'||d?.status==='pending') ? 3000 : false });

  useEffect(() => {
    if (polledJob?.status === 'completed') { toast.success('Exam generated!'); setPreviewJob(polledJob); setPollId(null); setTab('history'); qc.invalidateQueries({ queryKey: ['exam-gen-jobs'] }); }
    if (polledJob?.status === 'failed') { toast.error('Generation failed: ' + (polledJob.error_message||'Unknown')); setPollId(null); }
  }, [polledJob]);

  const genM = useMutation({ mutationFn: (d:any) => api.post('/exam-generator', d), onSuccess: (r) => { toast.success('AI generating exam…'); setPollId(r.data.job_id); setTab('history'); }, onError: (e:any) => toast.error(e.response?.data?.error||'Failed') });
  const set = (k:string, v:any) => setForm(f => ({ ...f, [k]: v }));

  const questions = previewJob ? (typeof previewJob.generated_questions==='string' ? JSON.parse(previewJob.generated_questions||'[]') : (previewJob.generated_questions||[])) : [];

  return (
    <div className="page">
      <PageHeader title="AI exam generator" subtitle="Paste material → AI generates branded exam" />
      <div className="page-content">
        <div className="flex gap-1 p-1 rounded-2xl w-fit" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
          {[['generate','Generate exam'],['history','My exams']].map(([t,l]) => (<button key={t} onClick={() => setTab(t as any)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab===t?'text-white':'text-[--text-2]'}`} style={tab===t?{background:'var(--navy)'}:{}}>{l}{t==='history'&&pollId&&<span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-1"/>}</button>))}
        </div>
        {tab==='generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-2 card-p space-y-4 animate-slide-up">
              <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:'rgba(0,200,150,0.12)' }}><Brain className="w-4 h-4" style={{ color:'var(--accent)' }} /></div><h3 className="font-semibold text-[--text-1]">AI exam configuration</h3></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2"><label className="label">Exam title *</label><input className="input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Form 3 Mathematics CAT 1" /></div>
                <div className="space-y-1"><label className="label">Subject</label><input className="input" value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="Mathematics" /></div>
                <div className="space-y-1"><label className="label">Grade / Form</label><input className="input" value={form.grade_level} onChange={e => set('grade_level', e.target.value)} placeholder="Form 3 / Grade 9" /></div>
                <div className="space-y-1"><label className="label">Exam type</label><select className="input" value={form.exam_type} onChange={e => set('exam_type', e.target.value)}><option value="cat">CAT</option><option value="mock">Mock</option><option value="end_of_term">End of term</option><option value="assignment">Assignment</option><option value="revision">Revision</option></select></div>
                <div className="space-y-1"><label className="label">Curriculum</label><select className="input" value={form.curriculum_mode} onChange={e => set('curriculum_mode', e.target.value)}><option value="eight_four_four">8-4-4</option><option value="cbe">CBC / CBE</option></select></div>
                <div className="space-y-1"><label className="label">No. of questions</label><input type="number" className="input" min={5} max={100} value={form.num_questions} onChange={e => set('num_questions', +e.target.value)} /></div>
                <div className="space-y-1"><label className="label">Term</label><select className="input" value={form.term} onChange={e => set('term', +e.target.value)}>{[1,2,3].map(t => <option key={t} value={t}>Term {t}</option>)}</select></div>
              </div>
              <div className="space-y-1"><label className="label">Teaching material *</label><textarea className="input" rows={8} value={form.source_text} onChange={e => set('source_text', e.target.value)} placeholder="Paste your teaching notes or topic content here. The AI will read this and generate relevant exam questions…" /><p className="text-xs text-[--text-3]">Paste text content directly.</p></div>
              <button onClick={() => genM.mutate(form)} className="btn-primary w-full" disabled={!form.title || !form.source_text || genM.isPending}>{genM.isPending ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Starting…</> : <><Brain className="w-4 h-4" />Generate exam with AI</>}</button>
            </div>
            <div className="lg:col-span-3">
              {questions.length > 0 ? <ExamPreview job={previewJob} branding={branding} questions={questions} /> : <EmptyState icon={FileText} title="Exam preview appears here" description="Configure and generate an exam on the left. The AI creates questions from your material — preview, edit, print, or share." />}
            </div>
          </div>
        )}
        {tab==='history' && (
          <div className="space-y-3">
            {!jobs?.length ? <EmptyState icon={Brain} title="No exams generated yet" description="Generate your first AI exam" /> : jobs.map((j:any) => (
              <div key={j.id} className="card-p space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">{STATUS_ICON[j.status]}<div><p className="font-medium text-[--text-1]">{j.title}</p><p className="text-xs text-[--text-3]">{j.subject} · {j.grade_level} · {j.exam_type?.replace(/_/g,' ')}</p></div></div>
                  <div className="text-right flex-shrink-0"><p className="text-xs text-[--text-3]">{formatDate(j.created_at)}</p><span className={`badge text-xs ${j.status==='completed'?'badge-success':j.status==='failed'?'badge-danger':'badge-warning'}`}>{j.status}</span></div>
                </div>
                {j.status==='completed' && <button onClick={() => setPreviewJob(j)} className="btn-ghost btn-sm gap-1.5"><Eye className="w-3.5 h-3.5"/>Preview exam</button>}
                {j.status==='processing' && <p className="text-xs text-blue-600 animate-pulse">AI is generating questions…</p>}
              </div>
            ))}
            {previewJob && questions.length > 0 && <ExamPreview job={previewJob} branding={branding} questions={questions} />}
          </div>
        )}
      </div>
    </div>
  );
}

function ExamPreview({ job, branding, questions }: any) {
  const totalMarks = questions.reduce((s:number, q:any) => s + (q.marks||0), 0);
  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => window.print()} className="btn-ghost btn-sm gap-1.5"><Printer className="w-3.5 h-3.5"/>Print</button>
        <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Exam: ${job.title}\nSubject: ${job.subject}\nGenerated by Shule360`)}`, '_blank')} className="btn-ghost btn-sm gap-1.5" style={{ color:'#25D366', borderColor:'#25D366' }}><Share2 className="w-3.5 h-3.5"/>WhatsApp</button>
        <button onClick={() => window.open(`mailto:?subject=${encodeURIComponent(job.title)}&body=${encodeURIComponent(`${job.title}\n${job.subject} · ${job.grade_level}`)}`, '_blank')} className="btn-ghost btn-sm gap-1.5"><Share2 className="w-3.5 h-3.5"/>Email</button>
        <span className="text-xs text-[--text-3] self-center ml-auto">{questions.length} questions · {totalMarks} marks</span>
      </div>
      <div className="card-p space-y-4 print:shadow-none">
        <div className="border-b-2 pb-3 mb-4" style={{ borderColor:'var(--navy)' }}>
          <div className="flex items-start gap-4">
            {branding?.logo_url ? <img src={branding.logo_url} alt="" className="w-14 h-14 object-contain flex-shrink-0" /> : <div className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl flex-shrink-0 text-white" style={{ background:'var(--navy)' }}>{(branding?.school_name||'S').charAt(0)}</div>}
            <div className="flex-1 text-center">
              <h1 className="text-lg font-bold uppercase tracking-wide" style={{ color:'var(--navy)' }}>{branding?.school_name||'School Name'}</h1>
              {branding?.address && <p className="text-xs text-[--text-2]">{branding.address}</p>}
              <p className="text-sm font-semibold mt-1" style={{ color:'var(--accent)' }}>{job.exam_type?.replace(/_/g,' ').toUpperCase()} — {job.subject} — {job.grade_level}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-dashed grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div><span className="text-[--text-3]">Term: </span><strong>Term {job.term}</strong></div>
            <div><span className="text-[--text-3]">Year: </span><strong>{job.academic_year}</strong></div>
            <div><span className="text-[--text-3]">Marks: </span><strong>{totalMarks}</strong></div>
            <div><span className="text-[--text-3]">Time: </span><strong>{Math.round(questions.length * 2)} min</strong></div>
          </div>
        </div>
        <div className="space-y-5">
          {questions.map((q:any, i:number) => (
            <div key={i} className="space-y-2">
              <p className="text-sm font-medium text-[--text-1]">{q.number||i+1}. {q.question}<span className="text-xs text-[--text-3] ml-2">({q.marks} mark{q.marks!==1?'s':''})</span></p>
              {q.type==='mcq' && q.options && <div className="grid grid-cols-2 gap-1 ml-4">{Object.entries(q.options).map(([k,v]:any) => <p key={k} className="text-sm text-[--text-2]">({k}) {v}</p>)}</div>}
              {(q.type==='short_answer'||q.type==='structured') && <div className="ml-4">{[...Array(q.type==='short_answer'?3:6)].map((_,j) => <div key={j} className="border-b border-dashed border-gray-300 h-6 mt-1"/>)}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
