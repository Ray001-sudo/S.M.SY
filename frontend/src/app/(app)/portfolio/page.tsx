'use client';
// Portfolio page
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader, EmptyState } from '@/components/ui';
import { FolderOpen, CheckCircle, Clock, Eye, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn, formatDate } from '@/lib/utils';

const ICONS: Record<string, string> = { photo:'🖼️', pdf:'📄', video:'🎬', audio:'🎵', link:'🔗', document:'📝' };
const RATING_CLASS: Record<string, string> = { EE:'rating-EE', ME:'rating-ME', AE:'rating-AE', BE:'rating-BE' };

export default function PortfolioPage() {
  const [studentId, setStudentId] = useState('');
  const [reviewId, setReviewId] = useState<string|null>(null);
  const [feedback, setFeedback] = useState('');
  const [ratings, setRatings] = useState<Record<string,string>>({});
  const qc = useQueryClient();

  const { data: students } = useQuery({
    queryKey:['cbe-students'],
    queryFn:()=>api.get('/students?curriculum_mode=cbe&status=active&limit=200').then(r=>r.data.data)
  });
  const { data: portfolio } = useQuery({
    queryKey:['portfolio',studentId],
    queryFn:()=>api.get(`/portfolios/student/${studentId}`).then(r=>r.data),
    enabled:!!studentId
  });
  const { data: pending } = useQuery({
    queryKey:['portfolio-pending'],
    queryFn:()=>api.get('/portfolios/pending-reviews').then(r=>r.data)
  });

  const reviewMutation = useMutation({
    mutationFn:({id,...d}:any)=>api.put(`/portfolios/${id}/review`,d),
    onSuccess:()=>{
      toast.success('Portfolio item reviewed — parent notified');
      setReviewId(null); setFeedback(''); setRatings({});
      qc.invalidateQueries({queryKey:['portfolio-pending']});
      qc.invalidateQueries({queryKey:['portfolio',studentId]});
    },
    onError:(e:any)=>toast.error(e.response?.data?.error||'Review failed')
  });

  const COMPETENCIES=['communication','critical_thinking','creativity','citizenship','digital_literacy','learning_to_learn','self_efficacy'];

  return (
    <div className="page">
      <PageHeader title="Digital portfolios" subtitle="CBE evidence collection · Teacher review" />
      <div className="page-content">
        {pending?.length > 0 && !reviewId && (
          <div className="card-p space-y-1" style={{border:'1px solid rgba(245,158,11,0.4)',background:'rgba(245,158,11,0.05)'}}>
            <p className="font-semibold text-amber-700 text-sm">{pending.length} item{pending.length!==1?'s':''} awaiting review</p>
            <div className="space-y-2 mt-2">
              {pending.slice(0,3).map((item:any)=>(
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[--text-1]">{item.title}</p>
                    <p className="text-xs text-[--text-3]">{item.student_name} · {item.subject_name}</p>
                  </div>
                  <button onClick={()=>{setReviewId(item.id);}} className="btn-ghost btn-sm gap-1.5">
                    <Eye className="w-3.5 h-3.5"/> Review
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {reviewId && (() => {
          const item = pending?.find((p:any)=>p.id===reviewId);
          if (!item) return null;
          return (
            <div className="card-p space-y-4 animate-slide-up" style={{border:'2px solid rgba(0,200,150,0.3)'}}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-[--text-1]">{item.title}</p>
                  <p className="text-sm text-[--text-2]">{item.student_name} · {item.subject_name}</p>
                </div>
                <button onClick={()=>setReviewId(null)} className="btn-ghost btn-sm">← Back</button>
              </div>
              <div className="space-y-1">
                <label className="label">Teacher feedback *</label>
                <textarea className="input" rows={3} value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="Provide constructive feedback…"/>
              </div>
              <div>
                <label className="label">Competency ratings</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {COMPETENCIES.map(c=>(
                    <div key={c} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-[--text-2] capitalize">{c.replace(/_/g,' ')}</span>
                      <select className="input py-1 w-20 text-xs" value={ratings[c]||''}
                        onChange={e=>setRatings(r=>({...r,[c]:e.target.value}))}>
                        <option value="">—</option>
                        {['EE','ME','AE','BE'].map(r=><option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={()=>reviewMutation.mutate({id:reviewId,teacher_feedback:feedback,competency_ratings:ratings,review_status:'reviewed'})}
                  className="btn-primary" disabled={!feedback||reviewMutation.isPending}>
                  <CheckCircle className="w-4 h-4"/> Approve & rate
                </button>
                <button onClick={()=>reviewMutation.mutate({id:reviewId,teacher_feedback:feedback,review_status:'rejected'})}
                  className="btn-danger" disabled={!feedback||reviewMutation.isPending}>Return for revision</button>
              </div>
            </div>
          );
        })()}

        <div className="space-y-1">
          <label className="label">Browse student portfolio</label>
          <select className="input max-w-sm" value={studentId} onChange={e=>setStudentId(e.target.value)}>
            <option value="">Select CBE student…</option>
            {students?.map((s:any)=><option key={s.id} value={s.id}>{s.full_name} — Grade {s.current_grade}</option>)}
          </select>
        </div>

        {studentId && portfolio && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="stat-card text-center"><div className="stat-val">{portfolio.stats.total}</div><div className="stat-lbl">Total</div></div>
              <div className="stat-card text-center" style={{borderLeft:'3px solid #F59E0B',borderRadius:'0 1rem 1rem 0'}}><div className="stat-val" style={{color:'#F59E0B'}}>{portfolio.stats.pending}</div><div className="stat-lbl">Pending</div></div>
              <div className="stat-card text-center" style={{borderLeft:'3px solid #10B981',borderRadius:'0 1rem 1rem 0'}}><div className="stat-val" style={{color:'#10B981'}}>{portfolio.stats.reviewed}</div><div className="stat-lbl">Reviewed</div></div>
            </div>
            {portfolio.items.length===0
              ? <EmptyState icon={FolderOpen} title="No portfolio items yet" description="Student hasn't submitted any evidence yet"/>
              : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger">
                  {portfolio.items.map((item:any)=>(
                    <div key={item.id} className="card-p space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{ICONS[item.evidence_type]||'📁'}</span>
                          <div>
                            <p className="font-medium text-[--text-1] text-sm">{item.title}</p>
                            <p className="text-xs text-[--text-3]">{item.subject_name}</p>
                          </div>
                        </div>
                        <span className={cn('badge text-xs', item.review_status==='reviewed'?'badge-success':item.review_status==='pending'?'badge-warning':'badge-danger')}>
                          {item.review_status}
                        </span>
                      </div>
                      {item.teacher_feedback&&<div className="p-2 rounded-lg text-xs text-blue-700 bg-blue-50">{item.teacher_feedback}</div>}
                      {item.competency_ratings&&Object.keys(typeof item.competency_ratings==='string'?JSON.parse(item.competency_ratings):item.competency_ratings).length>0&&(
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(typeof item.competency_ratings==='string'?JSON.parse(item.competency_ratings):item.competency_ratings).map(([c,r]:any)=>(
                            <span key={c} className={cn('badge text-xs',RATING_CLASS[r])}>{r} · {c.replace(/_/g,' ')}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
            }
          </>
        )}
      </div>
    </div>
  );
}
