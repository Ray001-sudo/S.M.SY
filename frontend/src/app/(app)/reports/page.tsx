'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui';
import { BarChart2, Download } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function ReportsPage() {
  const [term,setTerm]=useState(1);
  const [year,setYear]=useState(new Date().getFullYear());
  const {data:perf}=useQuery({queryKey:['school-perf',term,year],queryFn:()=>api.get(`/reports/school-performance?term=${term}&academic_year=${year}`).then(r=>r.data)});
  return (
    <div className="page">
      <PageHeader title="Reports & analytics" subtitle="School performance · Fee statements · Report cards"/>
      <div className="page-content">
        <div className="flex gap-2">
          <select className="input w-auto" value={term} onChange={e=>setTerm(+e.target.value)}>
            {[1,2,3].map(t=><option key={t} value={t}>Term {t}</option>)}
          </select>
          <select className="input w-auto" value={year} onChange={e=>setYear(+e.target.value)}>
            {[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {perf?.length>0&&(
          <div className="tbl-wrap">
            <div className="px-4 py-3 border-b border-[--border] font-medium text-sm text-[--text-1]">Subject performance averages</div>
            <table className="tbl">
              <thead><tr><th>Subject</th><th>Curriculum</th><th>Avg %</th><th>Assessments</th></tr></thead>
              <tbody>
                {perf.map((r:any,i:number)=>(
                  <tr key={i}>
                    <td className="font-medium">{r.name}</td>
                    <td><span className={r.curriculum_mode==='cbe'?'badge-cbe':'badge-844'}>{r.curriculum_mode==='cbe'?'CBE':'8-4-4'}</span></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-[--surface] overflow-hidden">
                          <div className="h-full rounded-full" style={{width:`${Math.min(r.avg_pct,100)}%`,background:r.avg_pct>=60?'#10B981':r.avg_pct>=40?'#F59E0B':'#EF4444'}}/>
                        </div>
                        <span className="text-sm font-medium">{Number(r.avg_pct).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="text-[--text-3]">{r.assessments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="card-p text-center py-8">
          <BarChart2 className="w-10 h-10 text-[--text-3] mx-auto mb-3"/>
          <p className="font-medium text-[--text-1]">Individual report cards</p>
          <p className="text-sm text-[--text-2] mt-1">Navigate to a student profile to generate their report card (dual-format: 8-4-4 or CBE)</p>
        </div>
      </div>
    </div>
  );
}
