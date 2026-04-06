'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader, EmptyState } from '@/components/ui';
import { ClipboardList, Plus, BookOpen, FileText, Search } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function ExamsPage() {
  const [tab, setTab] = useState<'papers' | 'questions'>('papers');
  const [search, setSearch] = useState('');

  const { data: papers, isLoading: papersLoading } = useQuery({
    queryKey: ['exam-papers'],
    queryFn: () => api.get('/exams/papers').then(r => r.data),
    enabled: tab === 'papers',
  });

  const { data: questions, isLoading: qLoading } = useQuery({
    queryKey: ['questions', search],
    queryFn: () => api.get('/exams/questions', { params: { search: search || undefined, limit: 50 } }).then(r => r.data),
    enabled: tab === 'questions',
  });

  const TYPE_COLORS: Record<string, string> = {
    cat: 'badge-info', mock: 'badge-warning', end_of_term: 'badge-844',
    sba: 'badge-cbe', kjsea_summative: 'badge-cbe',
  };

  return (
    <div className="page">
      <PageHeader title="Exams & assessment" subtitle="Question bank · Exam papers · SBA"
        action={
          <Link href="/exams/new" className="btn-primary btn-sm">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add question / paper</span>
          </Link>
        }
      />

      <div className="page-content">
        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-2xl w-fit"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {([['papers', 'Exam papers', FileText], ['questions', 'Question bank', BookOpen]] as const).map(([t, l, Icon]) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t ? 'text-white' : 'text-[--text-2] hover:text-[--text-1]'
              }`}
              style={tab === t ? { background: 'var(--navy)' } : {}}>
              <Icon className="w-3.5 h-3.5" /> {l}
            </button>
          ))}
        </div>

        {/* ── Papers ── */}
        {tab === 'papers' && (
          <>
            {papersLoading ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>
            ) : !papers?.length ? (
              <EmptyState icon={FileText} title="No exam papers yet"
                description="Create your first exam paper"
                action={<Link href="/exams/new" className="btn-primary btn-sm"><Plus className="w-4 h-4" /> Create paper</Link>} />
            ) : (
              <div className="space-y-2 stagger">
                {papers.map((p: any) => (
                  <div key={p.id} className="card-p flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(0,200,150,0.1)' }}>
                      <FileText className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[--text-1] truncate">{p.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-[--text-3]">{p.subject_name}</span>
                        <span className={TYPE_COLORS[p.paper_type] || 'badge-info'}>{p.paper_type?.replace(/_/g, ' ')}</span>
                        <span className={p.curriculum_mode === 'cbe' ? 'badge-cbe' : 'badge-844'}>
                          {p.curriculum_mode === 'cbe' ? 'CBE' : '8-4-4'}
                        </span>
                        <span className="text-xs text-[--text-3]">
                          {p.total_marks} marks · {p.duration_minutes} min
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-[--text-3]">{formatDate(p.created_at)}</p>
                      <span className={p.is_published ? 'badge-success' : 'badge text-[--text-3] bg-[--surface]'}>
                        {p.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Question bank ── */}
        {tab === 'questions' && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-3]" />
              <input className="input pl-10" placeholder="Search questions…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {qLoading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-14 rounded-2xl" />)}</div>
            ) : !questions?.data?.length ? (
              <EmptyState icon={BookOpen} title="No questions yet"
                description="Build your question bank to auto-generate exams"
                action={<Link href="/exams/new" className="btn-primary btn-sm"><Plus className="w-4 h-4" /> Add question</Link>} />
            ) : (
              <div className="space-y-2 stagger">
                {questions.data.map((q: any) => (
                  <div key={q.id} className="card-p space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-[--text-1] line-clamp-2 flex-1">{q.question_text}</p>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-lg flex-shrink-0"
                        style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                        {q.marks} mk{q.marks !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="badge text-xs bg-[--surface] text-[--text-2]">{q.subject_name}</span>
                      <span className="badge text-xs bg-[--surface] text-[--text-2]">{q.question_type?.replace(/_/g, ' ')}</span>
                      <span className={`badge text-xs ${
                        q.difficulty === 'easy' ? 'badge-success' :
                        q.difficulty === 'medium' ? 'badge-info' :
                        q.difficulty === 'hard' ? 'badge-warning' : 'badge-danger'
                      }`}>{q.difficulty}</span>
                      {q.topic && <span className="text-xs text-[--text-3]">{q.topic}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
