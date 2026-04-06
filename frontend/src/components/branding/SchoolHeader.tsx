'use client';
import { useBranding } from './BrandingProvider';
interface Props { subtitle?:string; examType?:string; subject?:string; grade?:string; term?:number; year?:number; duration?:string; totalMarks?:number; showExamFields?:boolean; }
export function SchoolHeader({ subtitle, examType, subject, grade, term, year, duration, totalMarks, showExamFields=false }: Props) {
  const branding = useBranding();
  return (
    <div className="border-b-2 pb-3 mb-4" style={{ borderColor:'var(--navy)' }}>
      <div className="flex items-start gap-4">
        {branding.logo_url ? <img src={branding.logo_url} alt="School logo" className="w-16 h-16 object-contain flex-shrink-0"/> : <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xl font-bold" style={{ background:'var(--navy)' }}>{branding.school_name?.charAt(0)||'S'}</div>}
        <div className="flex-1 text-center">
          <h1 className="text-xl font-bold uppercase tracking-wide" style={{ color:'var(--navy)' }}>{branding.school_name||'School Name'}</h1>
          {branding.address && <p className="text-xs text-[--text-2] mt-0.5">{branding.address}</p>}
          {branding.motto && <p className="text-xs italic text-[--text-3] mt-0.5">"{branding.motto}"</p>}
          {subtitle && <p className="text-sm font-semibold mt-1" style={{ color:'var(--accent)' }}>{subtitle}</p>}
        </div>
      </div>
      {showExamFields && (
        <div className="mt-3 pt-3 border-t border-dashed grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div><span className="text-[--text-3]">Exam: </span><span className="font-semibold uppercase">{examType?.replace(/_/g,' ')||'—'}</span></div>
          <div><span className="text-[--text-3]">Subject: </span><span className="font-semibold">{subject||'—'}</span></div>
          <div><span className="text-[--text-3]">Class: </span><span className="font-semibold">{grade||'—'}</span></div>
          <div><span className="text-[--text-3]">Term/Year: </span><span className="font-semibold">{term&&year?`Term ${term}, ${year}`:'—'}</span></div>
          {duration && <div><span className="text-[--text-3]">Duration: </span><span className="font-semibold">{duration}</span></div>}
          {totalMarks!==undefined && <div><span className="text-[--text-3]">Total Marks: </span><span className="font-semibold">{totalMarks}</span></div>}
          <div className="col-span-2"><span className="text-[--text-3]">Name: </span><span className="inline-block border-b border-gray-400 w-40 ml-1"/><span className="text-[--text-3] ml-4">Adm No: </span><span className="inline-block border-b border-gray-400 w-24 ml-1"/></div>
        </div>
      )}
    </div>
  );
}
