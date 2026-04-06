'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader, EmptyState, StatCard } from '@/components/ui';
import { cn, pct, letterGrade844, competencyRating, gradeColor } from '@/lib/utils';
import { BookOpen, Save, ChevronDown, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import toast from 'react-hot-toast';

const RATING_CLASS: Record<string, string> = {
  EE: 'rating-EE', ME: 'rating-ME', AE: 'rating-AE', BE: 'rating-BE'
};
const RATING_FULL: Record<string, string> = {
  EE: 'Exceeds Expectation', ME: 'Meets Expectation',
  AE: 'Approaches Expectation', BE: 'Below Expectation'
};

export default function GradesPage() {
  const qc = useQueryClient();
  const [studentId, setStudentId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [type, setType] = useState('cat1');
  const [rawScore, setRawScore] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [strandId, setStrandId] = useState('');
  const [term, setTerm] = useState(1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [comments, setComments] = useState('');

  const { data: students } = useQuery({
    queryKey: ['students-active'],
    queryFn: () => api.get('/students?status=active&limit=300').then(r => r.data.data),
  });
  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api.get('/admin/subjects').then(r => r.data),
  });

  const student = students?.find((s: any) => s.id === studentId);
  const isCBE = student?.curriculum_mode === 'cbe';

  const { data: strands } = useQuery({
    queryKey: ['strands', subjectId],
    queryFn: () => api.get(`/exams/strands?subject_id=${subjectId}`).then(r => r.data),
    enabled: !!subjectId && isCBE,
  });

  const { data: grades, isLoading: gradesLoading } = useQuery({
    queryKey: ['student-grades', studentId, term, year],
    queryFn: () => api.get(`/grades/student/${studentId}?term=${term}&academic_year=${year}`).then(r => r.data),
    enabled: !!studentId,
  });

  const assessmentTypes = isCBE
    ? [
        { value: 'sba_entry',           label: 'SBA Entry' },
        { value: 'project_individual',  label: 'Individual Project' },
        { value: 'project_group',       label: 'Group Project' },
        { value: 'practical',           label: 'Practical Assessment' },
        { value: 'portfolio_submission',label: 'Portfolio Submission' },
        { value: 'arts_performance',    label: 'Arts Performance' },
        { value: 'sports_assessment',   label: 'Sports Assessment' },
        { value: 'kjsea_summative',     label: 'KJSEA Summative' },
      ]
    : [
        { value: 'cat1',        label: 'CAT 1' },
        { value: 'cat2',        label: 'CAT 2' },
        { value: 'cat3',        label: 'CAT 3' },
        { value: 'assignment',  label: 'Assignment' },
        { value: 'mock_exam',   label: 'Mock Exam' },
        { value: 'end_of_term', label: 'End of Term Exam' },
      ];

  const score = parseFloat(rawScore);
  const max   = parseFloat(maxScore) || 100;
  const percentage = !isNaN(score) ? pct(score, max) : null;
  const letter   = percentage !== null && !isCBE ? letterGrade844(score, max) : null;
  const rating   = percentage !== null && isCBE  ? competencyRating(score, max) : null;

  const mutation = useMutation({
    mutationFn: (d: any) => api.post('/grades', d),
    onSuccess: () => {
      toast.success('Grade recorded');
      qc.invalidateQueries({ queryKey: ['student-grades', studentId] });
      setRawScore(''); setComments(''); setStrandId('');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to save grade'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return toast.error('Select a student');
    if (!subjectId) return toast.error('Select a subject');
    if (!rawScore) return toast.error('Enter a score');
    if (parseFloat(rawScore) > max) return toast.error('Score cannot exceed maximum');
    mutation.mutate({
      student_id: studentId, subject_id: subjectId,
      strand_id: strandId || undefined,
      assessment_type: type,
      raw_score: score, max_score: max,
      term, academic_year: year,
      assessment_date: new Date().toISOString().split('T')[0],
      comments: comments || undefined,
    });
  };

  // Group grades by subject for display
  const gradesBySubject: Record<string, any[]> = {};
  grades?.forEach((g: any) => {
    const key = g.subject_name || 'Unknown';
    if (!gradesBySubject[key]) gradesBySubject[key] = [];
    gradesBySubject[key].push(g);
  });

  return (
    <div className="page">
      <PageHeader title="Grade entry" subtitle="Dual-curriculum · auto-scale applied" />

      <div className="page-content">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* ── Entry form ── */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="card-p space-y-4">
              <h3 className="font-semibold text-[--text-1] flex items-center gap-2">
                <BookOpen className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                Record grade
              </h3>

              {/* Student */}
              <div className="space-y-1">
                <label className="label">Student</label>
                <select className="input" value={studentId} onChange={e => { setStudentId(e.target.value); setType(isCBE ? 'sba_entry' : 'cat1'); }}>
                  <option value="">Select student…</option>
                  {students?.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.curriculum_mode === 'cbe' ? `Gr.${s.current_grade}` : s.current_form})
                    </option>
                  ))}
                </select>
                {student && (
                  <span className={isCBE ? 'badge-cbe' : 'badge-844'}>
                    {isCBE ? 'CBC/CBE — competency scale' : '8-4-4 — A to E scale'}
                  </span>
                )}
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <label className="label">Subject</label>
                <select className="input" value={subjectId} onChange={e => { setSubjectId(e.target.value); setStrandId(''); }}>
                  <option value="">Select subject…</option>
                  {subjects?.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* CBC Strand */}
              {isCBE && strands?.length > 0 && (
                <div className="space-y-1">
                  <label className="label">CBC strand <span className="text-[--text-3] normal-case">(optional)</span></label>
                  <select className="input" value={strandId} onChange={e => setStrandId(e.target.value)}>
                    <option value="">General assessment</option>
                    {strands.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.strand_name} — {s.sub_strand_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Assessment type */}
              <div className="space-y-1">
                <label className="label">Assessment type</label>
                <select className="input" value={type} onChange={e => setType(e.target.value)}>
                  {assessmentTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {/* Score */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="label">Score <span className="text-red-500">*</span></label>
                  <input type="number" className="input" min="0" step="0.5"
                    value={rawScore} onChange={e => setRawScore(e.target.value)} placeholder="76" />
                </div>
                <div className="space-y-1">
                  <label className="label">Out of</label>
                  <input type="number" className="input" min="1"
                    value={maxScore} onChange={e => setMaxScore(e.target.value)} />
                </div>
              </div>

              {/* Live preview */}
              {percentage !== null && (
                <div className="p-3 rounded-xl flex items-center gap-4"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <span className="text-3xl font-semibold tabular-nums" style={{ color: isCBE ? 'var(--cbe)' : (letter ? gradeColor(letter) : 'var(--text-1)') }}>
                    {isCBE ? rating : letter}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-[--text-1]">{percentage}%</p>
                    <p className="text-xs text-[--text-3]">
                      {isCBE && rating ? RATING_FULL[rating] : ''}
                    </p>
                  </div>
                </div>
              )}

              {/* Term / Year */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="label">Term</label>
                  <select className="input" value={term} onChange={e => setTerm(+e.target.value)}>
                    {[1,2,3].map(t => <option key={t} value={t}>Term {t}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="label">Year</label>
                  <select className="input" value={year} onChange={e => setYear(+e.target.value)}>
                    {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-1">
                <label className="label">Teacher comments <span className="text-[--text-3] normal-case">(optional)</span></label>
                <textarea className="input" rows={2} value={comments}
                  onChange={e => setComments(e.target.value)} placeholder="Optional comment…" />
              </div>

              <button type="submit" className="btn-primary w-full" disabled={mutation.isPending}>
                {mutation.isPending
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                  : <><Save className="w-4 h-4" /> Record grade</>}
              </button>
            </form>
          </div>

          {/* ── Grade history ── */}
          <div className="lg:col-span-3 space-y-4">
            {!studentId ? (
              <EmptyState icon={BookOpen} title="Select a student" description="Choose a student on the left to view their grade history" />
            ) : gradesLoading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
            ) : Object.keys(gradesBySubject).length === 0 ? (
              <EmptyState icon={BookOpen} title="No grades yet" description={`No grades recorded for Term ${term} ${year}`} />
            ) : (
              Object.entries(gradesBySubject).map(([subjectName, subGrades]) => (
                <div key={subjectName} className="card overflow-hidden">
                  <div className="px-4 py-3 border-b border-[--border] flex items-center justify-between">
                    <span className="font-medium text-sm text-[--text-1]">{subjectName}</span>
                    <span className="text-xs text-[--text-3]">{subGrades.length} assessment{subGrades.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="divide-y divide-[--border]">
                    {subGrades.map((g: any) => {
                      const p = g.max_score ? pct(g.raw_score, g.max_score) : null;
                      const lg = !isCBE && p !== null ? letterGrade844(g.raw_score, g.max_score) : null;
                      const cr = isCBE && p !== null ? (g.competency_rating || competencyRating(g.raw_score, g.max_score)) : null;
                      return (
                        <div key={g.id} className="px-4 py-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[--text-1]">{g.assessment_type?.replace(/_/g, ' ')}</p>
                            {g.strand_name && <p className="text-xs text-[--text-3]">{g.strand_name}</p>}
                            {g.comments && <p className="text-xs text-[--text-3] truncate">{g.comments}</p>}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-semibold" style={lg ? { color: gradeColor(lg) } : {}}>
                              {isCBE ? (
                                <span className={cn('badge', cr ? RATING_CLASS[cr] : '')}>{cr}</span>
                              ) : lg}
                            </p>
                            {p !== null && <p className="text-xs text-[--text-3]">{g.raw_score}/{g.max_score} · {p}%</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
