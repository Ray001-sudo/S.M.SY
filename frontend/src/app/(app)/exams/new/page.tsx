'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader, Field } from '@/components/ui';
import { ClipboardList, Plus, Trash2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

type QuestionType = 'mcq' | 'short_answer' | 'structured' | 'essay' | 'practical';

interface MCQOption { key: string; text: string; }

export default function NewExamPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'question' | 'paper'>('question');

  // Question form
  const [qForm, setQForm] = useState({
    subject_id: '', strand_id: '', curriculum_mode: 'eight_four_four',
    question_type: 'mcq' as QuestionType,
    question_text: '', marks: '2', difficulty: 'medium',
    topic: '', subtopic: '',
    answer_key: '', model_answer: '',
    options: [
      { key: 'A', text: '' }, { key: 'B', text: '' },
      { key: 'C', text: '' }, { key: 'D', text: '' },
    ] as MCQOption[],
    correct_option: 'A',
  });

  // Paper form
  const [pForm, setPForm] = useState({
    subject_id: '', title: '', paper_type: 'cat',
    curriculum_mode: 'eight_four_four',
    total_marks: '40', duration_minutes: '40',
    term: '1', academic_year: new Date().getFullYear().toString(),
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects'], queryFn: () => api.get('/admin/subjects').then(r => r.data)
  });

  const { data: strands } = useQuery({
    queryKey: ['strands', qForm.subject_id],
    queryFn: () => api.get(`/admin/strands?subject_id=${qForm.subject_id}`).then(r => r.data),
    enabled: !!qForm.subject_id && qForm.curriculum_mode === 'cbe'
  });

  const questionMutation = useMutation({
    mutationFn: (data: any) => api.post('/exams/questions', data),
    onSuccess: () => {
      toast.success('Question saved to bank');
      qc.invalidateQueries({ queryKey: ['questions'] });
      setQForm(f => ({ ...f, question_text: '', answer_key: '', topic: '', subtopic: '', model_answer: '', options: [{ key:'A',text:''},{key:'B',text:''},{key:'C',text:''},{key:'D',text:''}] }));
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to save question'),
  });

  const paperMutation = useMutation({
    mutationFn: (data: any) => api.post('/exams/papers', data),
    onSuccess: (res) => {
      toast.success('Exam paper created');
      qc.invalidateQueries({ queryKey: ['papers'] });
      router.push('/exams');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to create paper'),
  });

  const setQ = (k: string, v: any) => setQForm(f => ({ ...f, [k]: v }));
  const setP = (k: string, v: any) => setPForm(f => ({ ...f, [k]: v }));

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qForm.subject_id) return toast.error('Select a subject');
    if (!qForm.question_text.trim()) return toast.error('Question text is required');
    const payload: any = {
      subject_id: qForm.subject_id,
      strand_id: qForm.strand_id || null,
      curriculum_mode: qForm.curriculum_mode,
      question_type: qForm.question_type,
      question_text: qForm.question_text,
      marks: parseFloat(qForm.marks),
      difficulty: qForm.difficulty,
      topic: qForm.topic,
      subtopic: qForm.subtopic,
    };
    if (qForm.question_type === 'mcq') {
      payload.options = qForm.options.reduce((acc: any, o) => { acc[o.key] = o.text; return acc; }, {});
      payload.answer_key = qForm.correct_option;
    } else {
      payload.model_answer = qForm.model_answer;
    }
    questionMutation.mutate(payload);
  };

  const handleCreatePaper = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pForm.subject_id) return toast.error('Select a subject');
    if (!pForm.title.trim()) return toast.error('Paper title is required');
    paperMutation.mutate({
      ...pForm,
      total_marks: parseFloat(pForm.total_marks),
      duration_minutes: parseInt(pForm.duration_minutes),
      term: parseInt(pForm.term),
      academic_year: parseInt(pForm.academic_year),
    });
  };

  return (
    <div className="page">
      <PageHeader title="Exams & assessment" back="Exams" backHref="/exams" />

      <div className="page-content max-w-2xl">
        {/* Tab toggle */}
        <div className="flex gap-1 p-1 rounded-2xl w-fit"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {(['question', 'paper'] as const).map(t => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t ? 'text-white' : 'text-[--text-2] hover:text-[--text-1]'
              }`}
              style={tab === t ? { background: 'var(--navy)' } : {}}>
              {t === 'question' ? 'Add question' : 'Create exam paper'}
            </button>
          ))}
        </div>

        {/* ── Question form ── */}
        {tab === 'question' && (
          <form onSubmit={handleSaveQuestion} className="card-p space-y-5 animate-slide-up">
            <h3 className="font-semibold text-[--text-1] flex items-center gap-2">
              <ClipboardList className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              Add question to bank
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Curriculum" required>
                <select className="input" value={qForm.curriculum_mode} onChange={e => setQ('curriculum_mode', e.target.value)}>
                  <option value="eight_four_four">8-4-4</option>
                  <option value="cbe">CBC / CBE</option>
                </select>
              </Field>
              <Field label="Subject" required>
                <select className="input" value={qForm.subject_id} onChange={e => setQ('subject_id', e.target.value)}>
                  <option value="">Select subject…</option>
                  {subjects?.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </Field>
              {qForm.curriculum_mode === 'cbe' && (
                <Field label="CBC Strand">
                  <select className="input" value={qForm.strand_id} onChange={e => setQ('strand_id', e.target.value)}>
                    <option value="">Select strand…</option>
                    {strands?.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.strand_name} — {s.sub_strand_name}</option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Question type" required>
                <select className="input" value={qForm.question_type} onChange={e => setQ('question_type', e.target.value as QuestionType)}>
                  <option value="mcq">Multiple choice (MCQ)</option>
                  <option value="short_answer">Short answer</option>
                  <option value="structured">Structured</option>
                  <option value="essay">Essay</option>
                  <option value="practical">Practical</option>
                </select>
              </Field>
              <Field label="Marks" required>
                <input type="number" className="input" min="0.5" step="0.5"
                  value={qForm.marks} onChange={e => setQ('marks', e.target.value)} />
              </Field>
              <Field label="Difficulty">
                <select className="input" value={qForm.difficulty} onChange={e => setQ('difficulty', e.target.value)}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="kcse_level">KCSE level</option>
                  <option value="kjsea_level">KJSEA level</option>
                </select>
              </Field>
              <Field label="Topic">
                <input className="input" value={qForm.topic}
                  onChange={e => setQ('topic', e.target.value)} placeholder="e.g. Quadratic equations" />
              </Field>
              <Field label="Subtopic">
                <input className="input" value={qForm.subtopic}
                  onChange={e => setQ('subtopic', e.target.value)} placeholder="e.g. Completing the square" />
              </Field>
            </div>

            <Field label="Question text" required>
              <textarea className="input" rows={4} value={qForm.question_text}
                onChange={e => setQ('question_text', e.target.value)}
                placeholder="Write the full question here…" />
            </Field>

            {/* MCQ options */}
            {qForm.question_type === 'mcq' && (
              <div className="space-y-3">
                <label className="label">Answer options</label>
                {qForm.options.map((opt, i) => (
                  <div key={opt.key} className="flex items-center gap-3">
                    <button type="button" onClick={() => setQ('correct_option', opt.key)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                        qForm.correct_option === opt.key
                          ? 'text-white' : 'border border-[--border] text-[--text-3]'
                      }`}
                      style={qForm.correct_option === opt.key ? { background: 'var(--accent)' } : {}}>
                      {qForm.correct_option === opt.key ? <Check className="w-3.5 h-3.5" /> : opt.key}
                    </button>
                    <input className="input flex-1" value={opt.text} placeholder={`Option ${opt.key}`}
                      onChange={e => {
                        const opts = [...qForm.options];
                        opts[i] = { ...opts[i], text: e.target.value };
                        setQ('options', opts);
                      }} />
                  </div>
                ))}
                <p className="text-xs text-[--text-3]">Click the option letter to mark it as correct</p>
              </div>
            )}

            {/* Non-MCQ model answer */}
            {qForm.question_type !== 'mcq' && (
              <Field label="Model answer / marking guide">
                <textarea className="input" rows={3} value={qForm.model_answer}
                  onChange={e => setQ('model_answer', e.target.value)}
                  placeholder="Key points the answer should include…" />
              </Field>
            )}

            <button type="submit" disabled={questionMutation.isPending} className="btn-primary">
              {questionMutation.isPending
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                : <><Plus className="w-4 h-4" /> Save to question bank</>}
            </button>
          </form>
        )}

        {/* ── Paper form ── */}
        {tab === 'paper' && (
          <form onSubmit={handleCreatePaper} className="card-p space-y-5 animate-slide-up">
            <h3 className="font-semibold text-[--text-1]">Create exam paper</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Paper title" required>
                <input className="input" value={pForm.title}
                  onChange={e => setP('title', e.target.value)} placeholder="Form 3 Mathematics CAT 1 2026" />
              </Field>
              <Field label="Paper type" required>
                <select className="input" value={pForm.paper_type} onChange={e => setP('paper_type', e.target.value)}>
                  <option value="cat">CAT</option>
                  <option value="mock">Mock exam</option>
                  <option value="end_of_term">End of term</option>
                  <option value="sba">SBA (CBE)</option>
                  <option value="kjsea_summative">KJSEA Summative</option>
                </select>
              </Field>
              <Field label="Curriculum">
                <select className="input" value={pForm.curriculum_mode} onChange={e => setP('curriculum_mode', e.target.value)}>
                  <option value="eight_four_four">8-4-4</option>
                  <option value="cbe">CBC / CBE</option>
                </select>
              </Field>
              <Field label="Subject" required>
                <select className="input" value={pForm.subject_id} onChange={e => setP('subject_id', e.target.value)}>
                  <option value="">Select subject…</option>
                  {subjects?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Total marks">
                <input type="number" className="input" value={pForm.total_marks}
                  onChange={e => setP('total_marks', e.target.value)} />
              </Field>
              <Field label="Duration (minutes)">
                <input type="number" className="input" value={pForm.duration_minutes}
                  onChange={e => setP('duration_minutes', e.target.value)} />
              </Field>
              <Field label="Term">
                <select className="input" value={pForm.term} onChange={e => setP('term', e.target.value)}>
                  <option value="1">Term 1</option><option value="2">Term 2</option><option value="3">Term 3</option>
                </select>
              </Field>
              <Field label="Academic year">
                <select className="input" value={pForm.academic_year} onChange={e => setP('academic_year', e.target.value)}>
                  {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </Field>
            </div>
            <button type="submit" disabled={paperMutation.isPending} className="btn-primary">
              {paperMutation.isPending
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating…</>
                : <><ClipboardList className="w-4 h-4" /> Create paper</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
