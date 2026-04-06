'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader, EmptyState, Field } from '@/components/ui';
import { Heart, Plus, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
const OUTCOME_LABELS:Record<string,string>={treated_returned:'Treated & returned',sent_home:'Sent home',referred_hospital:'Referred to hospital',observation:'Under observation'};
const OUTCOME_COLORS:Record<string,string>={treated_returned:'badge-success',sent_home:'badge-warning',referred_hospital:'badge-danger',observation:'badge-info'};
export default function HealthPage() {
  const [tab,setTab]=useState<'visits'|'records'|'alerts'>('visits');
  const [showLog,setShowLog]=useState(false);
  const [studentId,setStudentId]=useState('');
  const [vf,setVf]=useState({student_id:'',presenting_complaint:'',diagnosis:'',medication_given:'',dosage:'',outcome:'treated_returned',nurse_notes:''});
  const [hf,setHf]=useState<any>({});
  const qc=useQueryClient();
  const {data:students}=useQuery({queryKey:['students-active'],queryFn:()=>api.get('/students?status=active&limit=300').then(r=>r.data.data)});
  const {data:visits,isLoading}=useQuery({queryKey:['infirmary-visits'],queryFn:()=>api.get('/health/visits?limit=50').then(r=>r.data),enabled:tab==='visits'});
  const {data:alerts}=useQuery({queryKey:['health-alerts'],queryFn:()=>api.get('/health/alerts').then(r=>r.data),enabled:tab==='alerts'});
  const {data:healthRecord}=useQuery({queryKey:['health-record',studentId],queryFn:()=>api.get(`/health/record/${studentId}`).then(r=>r.data).catch(()=>null),enabled:!!studentId&&tab==='records'});
  const logM=useMutation({mutationFn:(d:any)=>api.post('/health/visits',d),onSuccess:(r)=>{toast.success(`Visit logged${r.data.parent_notified?' — parent notified via SMS':''}`);setShowLog(false);setVf({student_id:'',presenting_complaint:'',diagnosis:'',medication_given:'',dosage:'',outcome:'treated_returned',nurse_notes:''});qc.invalidateQueries({queryKey:['infirmary-visits']})},onError:(e:any)=>toast.error(e.response?.data?.error||'Failed')});
  const healthM=useMutation({mutationFn:({sid,...d}:any)=>api.put(`/health/record/${sid}`,d),onSuccess:()=>{toast.success('Health record updated');qc.invalidateQueries({queryKey:['health-record',studentId]})},onError:(e:any)=>toast.error(e.response?.data?.error||'Failed')});
  return (
    <div className="page">
      <PageHeader title="Health & infirmary" subtitle="Medical records · Visit log · Auto-SMS to parents" action={tab==='visits'&&<button onClick={()=>setShowLog(true)} className="btn-primary btn-sm"><Plus className="w-4 h-4"/>Log visit</button>}/>
      <div className="page-content">
        <div className="flex gap-1 p-1 rounded-2xl w-fit" style={{background:'var(--surface)',border:'1px solid var(--border)'}}>
          {[['visits','Infirmary visits'],['records','Health records'],['alerts','Allergy alerts']].map(([t,l])=>(<button key={t} onClick={()=>setTab(t as any)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab===t?'text-white':'text-[--text-2]'}`} style={tab===t?{background:'var(--navy)'}:{}}>{l}</button>))}
        </div>
        {showLog&&(
          <div className="card-p space-y-4 animate-slide-up" style={{border:'2px solid rgba(239,68,68,0.3)'}}>
            <div className="flex justify-between items-center"><h3 className="font-semibold text-[--text-1] flex items-center gap-2"><Heart className="w-4 h-4 text-red-500"/>Log infirmary visit</h3><button onClick={()=>setShowLog(false)} className="btn-ghost btn-sm">Cancel</button></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Student *"><select className="input" value={vf.student_id} onChange={e=>setVf(f=>({...f,student_id:e.target.value}))}><option value="">Select…</option>{students?.map((s:any)=><option key={s.id} value={s.id}>{s.full_name} ({s.admission_number})</option>)}</select></Field>
              <Field label="Outcome"><select className="input" value={vf.outcome} onChange={e=>setVf(f=>({...f,outcome:e.target.value}))}>{Object.entries(OUTCOME_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>
              <Field label="Complaint *"><input className="input" value={vf.presenting_complaint} onChange={e=>setVf(f=>({...f,presenting_complaint:e.target.value}))} placeholder="Headache, fever…"/></Field>
              <Field label="Diagnosis"><input className="input" value={vf.diagnosis} onChange={e=>setVf(f=>({...f,diagnosis:e.target.value}))} placeholder="Malaria, flu…"/></Field>
              <Field label="Medication"><input className="input" value={vf.medication_given} onChange={e=>setVf(f=>({...f,medication_given:e.target.value}))} placeholder="Paracetamol…"/></Field>
              <Field label="Dosage"><input className="input" value={vf.dosage} onChange={e=>setVf(f=>({...f,dosage:e.target.value}))} placeholder="500mg twice daily…"/></Field>
            </div>
            <button onClick={()=>logM.mutate(vf)} className="btn-primary" disabled={!vf.student_id||!vf.presenting_complaint||logM.isPending}>
              {logM.isPending?<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Logging…</>:<><Heart className="w-4 h-4"/>Log visit & notify parent</>}
            </button>
          </div>
        )}
        {tab==='visits'&&(!isLoading&&visits?.length===0?<EmptyState icon={Heart} title="No visits logged" description="Log the first infirmary visit above"/>:
          <div className="tbl-wrap"><table className="tbl hidden sm:table"><thead><tr><th>Student</th><th>Complaint</th><th>Diagnosis</th><th>Medication</th><th>Outcome</th><th>SMS</th><th>Time</th></tr></thead>
            <tbody>{visits?.map((v:any)=>(<tr key={v.id}><td><p className="font-medium">{v.student_name}</p><p className="text-xs text-[--text-3] font-mono">{v.admission_number}</p></td><td className="text-sm max-w-32 truncate">{v.presenting_complaint}</td><td className="text-sm max-w-32 truncate">{v.diagnosis||'—'}</td><td className="text-sm">{v.medication_given||'—'}</td><td><span className={OUTCOME_COLORS[v.outcome]}>{OUTCOME_LABELS[v.outcome]}</span></td><td>{v.parent_notified?<CheckCircle className="w-4 h-4 text-emerald-500"/>:<AlertTriangle className="w-4 h-4 text-amber-400"/>}</td><td className="text-xs text-[--text-3]">{formatDate(v.visit_time)}</td></tr>))}</tbody>
          </table>
          <div className="sm:hidden divide-y divide-[--border]">{visits?.map((v:any)=>(<div key={v.id} className="p-4 space-y-1"><div className="flex justify-between"><p className="font-medium">{v.student_name}</p><span className={OUTCOME_COLORS[v.outcome]}>{OUTCOME_LABELS[v.outcome]?.split(' ')[0]}</span></div><p className="text-sm text-[--text-2]">{v.presenting_complaint}</p>{v.medication_given&&<p className="text-xs text-[--text-3]">Med: {v.medication_given}</p>}<p className="text-xs text-[--text-3]">{formatDate(v.visit_time)} · {v.parent_notified?'Parent notified':'Not notified'}</p></div>))}</div>
          </div>
        )}
        {tab==='records'&&(<div className="space-y-4"><div className="space-y-1"><label className="label">Select student</label><select className="input max-w-sm" value={studentId} onChange={e=>{setStudentId(e.target.value);setHf({})}}><option value="">Choose…</option>{students?.map((s:any)=><option key={s.id} value={s.id}>{s.full_name} ({s.admission_number})</option>)}</select></div>
          {studentId&&<div className="card-p space-y-4"><h3 className="font-semibold">Medical record</h3>
            {[['blood_group','Blood group'],['allergies','Allergies'],['chronic_conditions','Chronic conditions'],['current_medications','Current medications'],['emergency_contact_name','Emergency contact'],['emergency_contact_phone','Emergency phone'],['nhif_number','NHIF number'],['special_needs','Special needs']].map(([k,l])=>(
              <Field key={k} label={l}><input className="input" value={hf[k]??healthRecord?.[k]??''} onChange={e=>setHf((f:any)=>({...f,[k]:e.target.value}))}/></Field>
            ))}
            <button onClick={()=>healthM.mutate({sid:studentId,...hf})} className="btn-primary" disabled={healthM.isPending}>{healthM.isPending?'Saving…':'Save health record'}</button>
          </div>}
        </div>)}
        {tab==='alerts'&&(!alerts?.length?<EmptyState icon={AlertTriangle} title="No alerts" description="Students with allergies or conditions appear here"/>:
          <div className="space-y-2 stagger">{alerts.map((a:any)=>(<div key={a.id} className="card-p border-l-4 border-red-400" style={{borderRadius:'0 1rem 1rem 0'}}><div className="flex justify-between"><div><p className="font-medium">{a.full_name}</p><p className="text-xs text-[--text-3] font-mono">{a.admission_number}</p></div><AlertTriangle className="w-4 h-4 text-red-500"/></div>{a.allergies&&<p className="text-sm text-red-600 mt-2"><strong>Allergies:</strong> {a.allergies}</p>}{a.chronic_conditions&&<p className="text-sm text-amber-700 mt-1"><strong>Conditions:</strong> {a.chronic_conditions}</p>}</div>))}</div>
        )}
      </div>
    </div>
  );
}
