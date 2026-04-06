'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui';
import { UserCheck, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AttendancePage() {
  const [streamId,setStreamId]=useState('');
  const [subjectId,setSubjectId]=useState('');
  const [period,setPeriod]=useState(1);
  const [term,setTerm]=useState(1);
  const [year,setYear]=useState(new Date().getFullYear());
  const [marks,setMarks]=useState<Record<string,string>>({});
  const qc=useQueryClient();
  const {data:streams}=useQuery({queryKey:['streams'],queryFn:()=>api.get('/admin/streams').then(r=>r.data)});
  const {data:subjects}=useQuery({queryKey:['subjects'],queryFn:()=>api.get('/admin/subjects').then(r=>r.data)});
  const {data:students}=useQuery({
    queryKey:['stream-students',streamId],
    queryFn:()=>api.get(`/students?stream_id=${streamId}&status=active&limit=60`).then(r=>r.data.data),
    enabled:!!streamId
  });
  const mutation=useMutation({
    mutationFn:(d:any)=>api.post('/attendance',d),
    onSuccess:()=>{toast.success('Attendance saved');setMarks({});qc.invalidateQueries({queryKey:['attendance']})},
    onError:(e:any)=>toast.error(e.response?.data?.error||'Error')
  });
  const handleSave=()=>{
    if(!streamId||!subjectId)return toast.error('Select stream and subject');
    if(!students?.length)return toast.error('No students found');
    const records=students.map((s:any)=>({student_id:s.id,status:marks[s.id]||'present'}));
    mutation.mutate({records,subject_id:subjectId,lesson_date:new Date().toISOString().split('T')[0],period,term,academic_year:year});
  };
  const STATUS=['present','absent','late','excused'];
  const STATUS_COLORS:Record<string,string>={present:'bg-emerald-50 border-emerald-200 text-emerald-700',absent:'bg-red-50 border-red-200 text-red-700',late:'bg-amber-50 border-amber-200 text-amber-700',excused:'bg-gray-50 border-gray-200 text-gray-600'};
  return (
    <div className="page">
      <PageHeader title="Attendance" subtitle="Mark per lesson period"/>
      <div className="page-content">
        <div className="card-p space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <label className="label">Stream / class</label>
              <select className="input" value={streamId} onChange={e=>setStreamId(e.target.value)}>
                <option value="">Select…</option>
                {streams?.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="label">Subject</label>
              <select className="input" value={subjectId} onChange={e=>setSubjectId(e.target.value)}>
                <option value="">Select…</option>
                {subjects?.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="label">Period</label>
              <select className="input" value={period} onChange={e=>setPeriod(+e.target.value)}>
                {[1,2,3,4,5,6,7,8].map(p=><option key={p} value={p}>Period {p}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="label">Term</label>
              <select className="input" value={term} onChange={e=>setTerm(+e.target.value)}>
                {[1,2,3].map(t=><option key={t} value={t}>Term {t}</option>)}
              </select>
            </div>
          </div>
          {students?.length>0&&(
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[--text-1]">{students.length} students · {new Date().toDateString()}</p>
                <div className="flex gap-2">
                  <button onClick={()=>setMarks(Object.fromEntries(students.map((s:any)=>[s.id,'present'])))} className="btn-ghost btn-sm">All present</button>
                  <button onClick={()=>setMarks(Object.fromEntries(students.map((s:any)=>[s.id,'absent'])))} className="btn-ghost btn-sm">All absent</button>
                </div>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {students.map((s:any,i:number)=>(
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="text-xs text-[--text-3] w-5 text-right">{i+1}</span>
                    <p className="flex-1 text-sm font-medium text-[--text-1]">{s.full_name}</p>
                    <div className="flex gap-1">
                      {STATUS.map(st=>(
                        <button key={st} onClick={()=>setMarks(m=>({...m,[s.id]:st}))}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-all capitalize ${(marks[s.id]||'present')===st?STATUS_COLORS[st]:'border-[--border] text-[--text-3] hover:border-[--border]'}`}>
                          {st.slice(0,2).toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={handleSave} className="btn-primary" disabled={mutation.isPending}>
                {mutation.isPending?<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Saving…</>:<><Save className="w-4 h-4"/>Save attendance</>}
              </button>
            </>
          )}
          {streamId&&!students?.length&&<p className="text-sm text-[--text-3] text-center py-6">No students in this stream</p>}
        </div>
      </div>
    </div>
  );
}
