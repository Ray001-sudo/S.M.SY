'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader, EmptyState } from '@/components/ui';
import { GitBranch, Award } from 'lucide-react';
import toast from 'react-hot-toast';

const PL: Record<string,string> = { stem:'STEM', social_sciences:'Social Sciences', arts_sports:'Arts & Sports Science' };
const PC: Record<string,string> = { stem:'#185FA5', social_sciences:'#534AB7', arts_sports:'#993556' };
const FIELDS = [['sba_g7_score','SBA Gr.7'],['sba_g8_score','SBA Gr.8'],['sba_g9_score','SBA Gr.9'],['project_1_score','Project 1'],['project_2_score','Project 2'],['project_3_score','Project 3'],['summative_score','Summative']];

export default function PathwaysPage() {
  const [sid,setSid]=useState('');
  const [kv,setKv]=useState<Record<string,string>>({});
  const [sf,setSf]=useState(false);
  const qc=useQueryClient();
  const {data:students}=useQuery({queryKey:['g9s'],queryFn:()=>api.get('/students?curriculum_mode=cbe&grade=9&status=active&limit=200').then(r=>r.data.data)});
  const {data:score}=useQuery({queryKey:['kjsea',sid],queryFn:()=>api.get(`/pathways/kjsea/${sid}`).then(r=>r.data).catch(()=>null),enabled:!!sid});
  const {data:fit}=useQuery({queryKey:['pfit',sid],queryFn:()=>api.get(`/ai/pathway-fit/${sid}`).then(r=>r.data).catch(()=>null),enabled:!!sid});
  const save=useMutation({mutationFn:(d:any)=>api.post('/pathways/kjsea',d),onSuccess:()=>{toast.success('Saved');setSf(false);qc.invalidateQueries({queryKey:['kjsea',sid]})},onError:(e:any)=>toast.error(e.response?.data?.error||'Error')});
  const choose=useMutation({mutationFn:({id,...d}:any)=>api.post(`/pathways/kjsea/${id}/choose`,d),onSuccess:()=>{toast.success('Confirmed — parent notified');qc.invalidateQueries({queryKey:['kjsea',sid]})},onError:(e:any)=>toast.error(e.response?.data?.error||'Error')});
  return (
    <div className="page">
      <PageHeader title="Senior school pathways" subtitle="KJSEA scoring · AI pathway fit"/>
      <div className="page-content">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(PL).map(([k,l])=>(
            <div key={k} className="card-p" style={{borderLeft:`3px solid ${PC[k]}`,borderRadius:'0 1rem 1rem 0'}}>
              <p className="font-semibold text-sm" style={{color:PC[k]}}>{l}</p>
              <p className="text-xs text-[--text-3] mt-1">{k==='stem'?'Maths · Physics · Chemistry · Biology':k==='social_sciences'?'History · Geography · Economics · Business':'Languages · Music · Drama · PE · Sports Sci.'}</p>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <label className="label">Grade 9 student</label>
          <select className="input max-w-sm" value={sid} onChange={e=>setSid(e.target.value)}>
            <option value="">Select…</option>
            {students?.map((s:any)=><option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </div>
        {sid&&(
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="card-p space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm flex items-center gap-2"><Award className="w-4 h-4" style={{color:'var(--accent)'}}/>KJSEA composite</h3>
                <button onClick={()=>setSf(!sf)} className="btn-ghost btn-sm">{score?'Update':'Enter scores'}</button>
              </div>
              {score?<p className="text-4xl font-bold text-center py-2" style={{color:'var(--accent)'}}>{Number(score.composite_score).toFixed(1)}%</p>:<p className="text-sm text-center text-[--text-3] py-4">No scores yet</p>}
              {sf&&(
                <div className="space-y-3 pt-3 border-t border-[--border]">
                  <div className="grid grid-cols-2 gap-2">
                    {FIELDS.map(([k,l])=>(
                      <div key={k} className="space-y-1">
                        <label className="label text-xs">{l}</label>
                        <input type="number" className="input py-1.5 text-sm" min="0" max="100" step="0.1"
                          value={kv[k]||''} onChange={e=>setKv(v=>({...v,[k]:e.target.value}))} placeholder="0–100"/>
                      </div>
                    ))}
                  </div>
                  <button onClick={()=>save.mutate({student_id:sid,academic_year:new Date().getFullYear(),...Object.fromEntries(Object.entries(kv).map(([k,v])=>[k,v?parseFloat(v):null]))})}
                    className="btn-primary w-full" disabled={save.isPending}>{save.isPending?'Saving…':'Save & calculate'}</button>
                </div>
              )}
            </div>
            <div className="card-p space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2"><GitBranch className="w-4 h-4" style={{color:'var(--cbe)'}}/>AI recommendation</h3>
              {fit?(
                <>
                  <div className="p-3 rounded-xl text-sm font-medium" style={{background:`${PC[fit.recommended_pathway]}15`,color:PC[fit.recommended_pathway]}}>Recommended: {PL[fit.recommended_pathway]}</div>
                  {Object.entries(fit.pathway_scores||{}).map(([p,s]:any)=>(
                    <div key={p} className="flex items-center gap-2 text-sm">
                      <span className="w-24 text-xs text-[--text-2] truncate">{PL[p]}</span>
                      <div className="flex-1 h-2 rounded-full bg-[--surface] overflow-hidden"><div className="h-full rounded-full" style={{width:`${s}%`,background:PC[p]}}/></div>
                      <span className="text-xs font-mono text-[--text-3] w-8 text-right">{Number(s).toFixed(0)}</span>
                    </div>
                  ))}
                  {!score?.chosen_pathway&&(
                    <div className="pt-2 border-t border-[--border] space-y-2">
                      <p className="text-xs text-[--text-3]">Confirm pathway:</p>
                      <div className="flex gap-2">
                        {Object.entries(PL).map(([k,l])=>(
                          <button key={k} onClick={()=>choose.mutate({id:sid,chosen_pathway:k})}
                            className="btn-ghost btn-sm flex-1 text-xs" disabled={choose.isPending}
                            style={{borderColor:PC[k],color:PC[k]}}>{l}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {score?.chosen_pathway&&<div className="p-2 rounded-xl text-sm font-medium text-center" style={{background:`${PC[score.chosen_pathway]}15`,color:PC[score.chosen_pathway]}}>✓ {PL[score.chosen_pathway]}</div>}
                </>
              ):<p className="text-sm text-[--text-3] text-center py-4">Enter KJSEA scores first</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
