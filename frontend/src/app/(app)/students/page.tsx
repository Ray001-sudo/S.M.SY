'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader, EmptyState, CardSkeleton, StatCard } from '@/components/ui';
import { Users, UserPlus, Search, ChevronRight, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StudentsPage() {
  const [search, setSearch] = useState('');
  const [curr, setCurr] = useState('');
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['students', search, curr, status, page],
    queryFn: () => api.get('/students', {
      params: { search: search || undefined, curriculum_mode: curr || undefined, status, page, limit: 25 }
    }).then(r => r.data),
    keepPreviousData: true,
  });

  const { data: stats } = useQuery({
    queryKey: ['student-stats'],
    queryFn: () => api.get('/students/stats').then(r => r.data),
  });

  const total844 = stats?.by_curriculum_mode?.find((m: any) => m.curriculum_mode === 'eight_four_four')?.count || 0;
  const totalCBE = stats?.by_curriculum_mode?.find((m: any) => m.curriculum_mode === 'cbe')?.count || 0;

  return (
    <div className="page">
      <PageHeader
        title="Students"
        subtitle="All enrolled students"
        action={
          <Link href="/students/new" className="btn-primary btn-sm">
            <UserPlus className="w-4 h-4" /> <span className="hidden sm:inline">Add student</span>
          </Link>
        }
      />

      <div className="page-content">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger">
          <StatCard label="Total active" value={data?.pagination?.total || '—'} accent="#0B1D35" icon={Users} />
          <StatCard label="8-4-4 students" value={total844} hint="Forms 1–4" accent="#7C3AED" />
          <StatCard label="CBE students" value={totalCBE} hint="Grades 7–12" accent="#0891B2" />
          <StatCard label="Boarding" value={data?.data?.filter((s: any) => s.boarding_house)?.length || '—'} hint="with boarding" />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-3]" />
            <input className="input pl-10" placeholder="Search by name or admission number…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="flex gap-2">
            <select className="input w-auto" value={curr} onChange={e => { setCurr(e.target.value); setPage(1); }}>
              <option value="">All curricula</option>
              <option value="eight_four_four">8-4-4</option>
              <option value="cbe">CBC / CBE</option>
            </select>
            <select className="input w-auto" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="active">Active</option>
              <option value="">All</option>
              <option value="withdrawn">Withdrawn</option>
              <option value="graduated">Graduated</option>
            </select>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : data?.data?.length === 0 ? (
          <EmptyState title="No students found" description="Try adjusting the filters or add a new student"
            icon={Users}
            action={<Link href="/students/new" className="btn-primary btn-sm"><UserPlus className="w-4 h-4" /> Add student</Link>} />
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="sm:hidden space-y-2 stagger">
              {data?.data?.map((s: any) => (
                <Link key={s.id} href={`/students/${s.id}`} className="card-p flex items-center gap-3 active:scale-[0.99] transition-transform">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm flex-shrink-0"
                    style={{ background: s.curriculum_mode === 'cbe' ? 'rgba(8,145,178,0.12)' : 'rgba(124,58,237,0.12)',
                             color: s.curriculum_mode === 'cbe' ? '#0891B2' : '#7C3AED' }}>
                    {s.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[--text-1] truncate">{s.full_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-[--text-3] font-mono">{s.admission_number}</span>
                      <span className={s.curriculum_mode === 'cbe' ? 'badge-cbe' : 'badge-844'}>
                        {s.curriculum_mode === 'cbe' ? `Grade ${s.current_grade}` : s.current_form}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[--text-3] flex-shrink-0" />
                </Link>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Student</th><th>Adm. no.</th><th>Curriculum</th>
                    <th>Level</th><th>House</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.map((s: any) => (
                    <tr key={s.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold"
                            style={{ background: s.curriculum_mode === 'cbe' ? 'rgba(8,145,178,0.12)' : 'rgba(124,58,237,0.12)',
                                     color: s.curriculum_mode === 'cbe' ? '#0891B2' : '#7C3AED' }}>
                            {s.full_name.charAt(0)}
                          </div>
                          <span className="font-medium">{s.full_name}</span>
                        </div>
                      </td>
                      <td><span className="font-mono text-xs text-[--text-2]">{s.admission_number}</span></td>
                      <td>
                        <span className={s.curriculum_mode === 'cbe' ? 'badge-cbe' : 'badge-844'}>
                          {s.curriculum_mode === 'cbe' ? 'CBE' : '8-4-4'}
                        </span>
                      </td>
                      <td className="text-sm">
                        {s.curriculum_mode === 'cbe' ? `Grade ${s.current_grade}` : s.current_form}
                        {(s.stream_name || s.pathway_name) && (
                          <span className="text-[--text-3] ml-1">· {s.stream_name || s.pathway_name}</span>
                        )}
                      </td>
                      <td className="text-sm text-[--text-2]">{s.boarding_house || '—'}</td>
                      <td>
                        <span className={s.status === 'active' ? 'badge-success' : 'badge text-[--text-3] bg-[--surface]'}>
                          {s.status}
                        </span>
                      </td>
                      <td>
                        <Link href={`/students/${s.id}`} className="text-[--text-3] hover:text-[--text-1] transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data?.pagination?.pages > 1 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[--text-2] text-xs">
                  {((page-1)*25)+1}–{Math.min(page*25, data.pagination.total)} of {data.pagination.total}
                </span>
                <div className="flex gap-2">
                  <button className="btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p=>p-1)}>← Prev</button>
                  <button className="btn-ghost btn-sm" disabled={page >= data.pagination.pages} onClick={() => setPage(p=>p+1)}>Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
