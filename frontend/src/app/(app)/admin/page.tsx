'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui';
import { Settings, Plus, Building2, BookOpen, GitBranch, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const [tab,setTab]=useState('school');
  const [newSubj,setNewSubj]=useState({name:'',code:'',curriculum_mode:'both'});
  const [newStream,setNewStream]=useState({name:'',form:'Form 1'});
  const [newStaff,setNewStaff]=useState({full_name:'',email:'',phone:'',role:'teacher',password:'Shule360!'});
  const qc=useQueryClient();
  const {data:school}=useQuery({queryKey:['school'],queryFn:()=>api.get('/admin/school').then(r=>r.data)});
  const {data:subjects}=useQuery({queryKey:['subjects'],queryFn:()=>api.get('/admin/subjects').then(r=>r.data)});
  const {data:streams}=useQuery({queryKey:['streams'],queryFn:()=>api.get('/admin/streams').then(r=>r.data)});
  const {data:staff}=useQuery({queryKey:['staff'],queryFn:()=>api.get('/staff').then(r=>r.data)});
  const addSubj=useMutation({mutationFn:(d:any)=>api.post('/admin/subjects',d),onSuccess:()=>{toast.success('Subject added');qc.invalidateQueries({queryKey:['subjects']});setNewSubj({name:'',code:'',curriculum_mode:'both'})},onError:(e:any)=>toast.error(e.response?.data?.error||'Error')});
  const addStream=useMutation({mutationFn:(d:any)=>api.post('/admin/streams',d),onSuccess:()=>{toast.success('Stream created');qc.invalidateQueries({queryKey:['streams']});setNewStream({name:'',form:'Form 1'})},onError:(e:any)=>toast.error(e.response?.data?.error||'Error')});
  const addStaff=useMutation({mutationFn:(d:any)=>api.post('/staff',d),onSuccess:()=>{toast.success('Staff member added');qc.invalidateQueries({queryKey:['staff']});setNewStaff({full_name:'',email:'',phone:'',role:'teacher',password:'Shule360!'})},onError:(e:any)=>toast.error(e.response?.data?.error||'Error')});
  const TABS=[['school','School','Building2'],['subjects','Subjects','BookOpen'],['streams','Streams','GitBranch'],['staff','Staff','Users']];
  return (
    <div className="page">
      <PageHeader title="School settings" subtitle="Configuration & administration"/>
      <div className="page-content">
        <div className="flex gap-1 p-1 rounded-2xl flex-wrap" style={{background:'var(--surface)',border:'1px solid var(--border)'}}>
          {TABS.map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab===t?'text-white':'text-[--text-2]'}`}
              style={tab===t?{background:'var(--navy)'}:{}}>{l}</button>
          ))}
        </div>

        {tab==='school'&&school&&(
          <div className="card-p space-y-4 max-w-xl">
            <h3 className="font-semibold text-[--text-1]">{school.name}</h3>
            {[['Type',school.school_type],['County',school.county||'—'],['M-Pesa Paybill',school.mpesa_paybill||'Not configured'],['Subscription',school.subscription_plan]].map(([l,v])=>(
              <div key={l} className="flex justify-between py-2 border-b border-[--border]">
                <span className="text-sm text-[--text-2]">{l}</span>
                <span className="text-sm font-medium text-[--text-1]">{v}</span>
              </div>
            ))}
            <div className="flex gap-2">{school.active_curricula?.eight_four_four&&<span className="badge-844">8-4-4</span>}{school.active_curricula?.cbe&&<span className="badge-cbe">CBE</span>}</div>
          </div>
        )}

        {tab==='subjects'&&(
          <div className="space-y-4">
            <div className="card-p space-y-3">
              <h3 className="font-semibold text-sm text-[--text-1]">Add subject</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 sm:col-span-1"><label className="label">Name *</label><input className="input" value={newSubj.name} onChange={e=>setNewSubj(s=>({...s,name:e.target.value}))} placeholder="Mathematics"/></div>
                <div className="space-y-1"><label className="label">Code</label><input className="input" value={newSubj.code} onChange={e=>setNewSubj(s=>({...s,code:e.target.value}))} placeholder="MAT"/></div>
                <div className="space-y-1"><label className="label">Curriculum</label><select className="input" value={newSubj.curriculum_mode} onChange={e=>setNewSubj(s=>({...s,curriculum_mode:e.target.value}))}><option value="both">Both</option><option value="eight_four_four">8-4-4</option><option value="cbe">CBE</option></select></div>
              </div>
              <button onClick={()=>addSubj.mutate(newSubj)} className="btn-primary btn-sm" disabled={!newSubj.name||addSubj.isPending}><Plus className="w-3.5 h-3.5"/>Add subject</button>
            </div>
            <div className="tbl-wrap">
              <table className="tbl"><thead><tr><th>Name</th><th>Code</th><th>Curriculum</th></tr></thead>
                <tbody>{subjects?.map((s:any)=>(
                  <tr key={s.id}><td className="font-medium">{s.name}</td><td className="font-mono text-xs text-[--text-3]">{s.code}</td><td><span className={s.curriculum_mode==='cbe'?'badge-cbe':s.curriculum_mode==='eight_four_four'?'badge-844':'badge-info'}>{s.curriculum_mode}</span></td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        {tab==='streams'&&(
          <div className="space-y-4">
            <div className="card-p space-y-3">
              <h3 className="font-semibold text-sm text-[--text-1]">Add stream (8-4-4)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="label">Name *</label><input className="input" value={newStream.name} onChange={e=>setNewStream(s=>({...s,name:e.target.value}))} placeholder="Form 3 East"/></div>
                <div className="space-y-1"><label className="label">Form</label><select className="input" value={newStream.form} onChange={e=>setNewStream(s=>({...s,form:e.target.value}))}>{['Form 1','Form 2','Form 3','Form 4'].map(f=><option key={f} value={f}>{f}</option>)}</select></div>
              </div>
              <button onClick={()=>addStream.mutate(newStream)} className="btn-primary btn-sm" disabled={!newStream.name||addStream.isPending}><Plus className="w-3.5 h-3.5"/>Add stream</button>
            </div>
            <div className="tbl-wrap">
              <table className="tbl"><thead><tr><th>Stream name</th><th>Form</th></tr></thead>
                <tbody>{streams?.map((s:any)=>(
                  <tr key={s.id}><td className="font-medium">{s.name}</td><td><span className="badge-844">{s.form}</span></td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        {tab==='staff'&&(
          <div className="space-y-4">
            <div className="card-p space-y-3">
              <h3 className="font-semibold text-sm text-[--text-1]">Add staff member</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1"><label className="label">Full name *</label><input className="input" value={newStaff.full_name} onChange={e=>setNewStaff(s=>({...s,full_name:e.target.value}))} placeholder="Mr. James Otieno"/></div>
                <div className="space-y-1"><label className="label">Email *</label><input type="email" className="input" value={newStaff.email} onChange={e=>setNewStaff(s=>({...s,email:e.target.value}))} placeholder="james@school.ac.ke"/></div>
                <div className="space-y-1"><label className="label">Phone</label><input className="input" value={newStaff.phone} onChange={e=>setNewStaff(s=>({...s,phone:e.target.value}))} placeholder="+2547…"/></div>
                <div className="space-y-1"><label className="label">Role</label><select className="input" value={newStaff.role} onChange={e=>setNewStaff(s=>({...s,role:e.target.value}))}>{['teacher','class_teacher','deputy_principal','bursar','counsellor','nurse','admin'].map(r=><option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}</select></div>
                <div className="space-y-1 sm:col-span-2"><label className="label">Temporary password</label><input className="input" value={newStaff.password} onChange={e=>setNewStaff(s=>({...s,password:e.target.value}))}/><p className="text-xs text-[--text-3] mt-1">Staff member will be prompted to change on first login</p></div>
              </div>
              <button onClick={()=>addStaff.mutate(newStaff)} className="btn-primary btn-sm" disabled={!newStaff.full_name||!newStaff.email||addStaff.isPending}><Plus className="w-3.5 h-3.5"/>Add staff member</button>
            </div>
            <div className="tbl-wrap">
              <table className="tbl"><thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
                <tbody>{staff?.map((s:any)=>(
                  <tr key={s.id}><td className="font-medium">{s.full_name}</td><td className="text-xs text-[--text-2]">{s.email}</td><td><span className="badge-info capitalize">{s.role?.replace(/_/g,' ')}</span></td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
