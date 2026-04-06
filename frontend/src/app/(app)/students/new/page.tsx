'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader, Field, TrustChip } from '@/components/ui';
import { UserPlus, Users, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const FORMS = ['Form 1', 'Form 2', 'Form 3', 'Form 4'];
const GRADES = [7, 8, 9, 10, 11, 12];
const COUNTIES = ['Nairobi','Mombasa','Kisumu','Nakuru','Eldoret','Thika','Machakos','Nyeri','Meru','Kisii','Kakamega','Kilifi','Garissa','Malindi','Embu'];

export default function NewStudentPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    full_name: '', admission_number: '', date_of_birth: '',
    gender: '', intake_year: new Date().getFullYear().toString(),
    curriculum_mode: 'cbe',
    current_form: '', current_grade: '', school_level: 'junior',
    pathway_id: '',
    stream_id: '',
    kcpe_index: '', kcpe_score: '', kpsea_score: '',
    boarding_house: '', dormitory: '', bed_number: '',
    bursary_status: false, bursary_amount: '', bursary_source: '',
    guardian_name: '', guardian_phone: '', guardian_email: '',
    guardian_relationship: 'father',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: streams } = useQuery({
    queryKey: ['streams'], queryFn: () => api.get('/admin/streams').then(r => r.data)
  });
  const { data: pathways } = useQuery({
    queryKey: ['pathways'], queryFn: () => api.get('/admin/pathways').then(r => r.data)
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        guardians: [{
          full_name: data.guardian_name,
          phone: data.guardian_phone,
          email: data.guardian_email,
          relationship: data.guardian_relationship,
          is_primary: true,
        }],
        bursary_status: data.bursary_status,
        bursary_amount: data.bursary_amount ? parseFloat(data.bursary_amount) : 0,
        intake_year: parseInt(data.intake_year),
        current_grade: data.current_grade ? parseInt(data.current_grade) : undefined,
        kcpe_score: data.kcpe_score ? parseInt(data.kcpe_score) : undefined,
        kpsea_score: data.kpsea_score ? parseFloat(data.kpsea_score) : undefined,
      };
      return api.post('/students', payload);
    },
    onSuccess: (res) => {
      toast.success(`${form.full_name} added successfully`);
      qc.invalidateQueries({ queryKey: ['students'] });
      router.push(`/students/${res.data.id}`);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to add student'),
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const validate1 = () => {
    const e: Record<string, string> = {};
    if (!form.full_name.trim()) e.full_name = 'Required';
    if (!form.admission_number.trim()) e.admission_number = 'Required';
    if (!form.gender) e.gender = 'Required';
    if (!form.intake_year) e.intake_year = 'Required';
    if (form.curriculum_mode === 'eight_four_four' && !form.current_form) e.current_form = 'Required';
    if (form.curriculum_mode === 'cbe' && !form.current_grade) e.current_grade = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validate2 = () => {
    const e: Record<string, string> = {};
    if (!form.guardian_name.trim()) e.guardian_name = 'Required';
    if (!form.guardian_phone.trim()) e.guardian_phone = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validate1()) return;
    if (step === 2 && !validate2()) return;
    setStep(s => s + 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate2()) return;
    mutation.mutate(form);
  };

  const isCBE = form.curriculum_mode === 'cbe';

  return (
    <div className="page">
      <PageHeader title="Add student" back="Students" backHref="/students"
        action={<TrustChip />} />

      <div className="page-content max-w-2xl">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-2">
          {['Basic info', 'Guardian', 'Boarding & fees'].map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                i + 1 === step ? 'text-[--navy]' : i + 1 < step ? 'text-white' : 'bg-[--surface] text-[--text-3]'
              }`} style={i + 1 <= step ? { background: i + 1 < step ? 'var(--accent)' : 'rgba(0,200,150,0.15)', color: i+1 === step ? 'var(--accent)' : undefined } : {}}>
                {i + 1 < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i+1 === step ? 'font-medium text-[--text-1]' : 'text-[--text-3]'}`}>{s}</span>
              {i < 2 && <div className="flex-1 h-px" style={{ background: i + 1 < step ? 'var(--accent)' : 'var(--border)' }} />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* ── Step 1: Basic info ── */}
          {step === 1 && (
            <div className="card-p space-y-4 animate-slide-up">
              <h3 className="font-semibold text-[--text-1] flex items-center gap-2">
                <UserPlus className="w-4 h-4" style={{ color: 'var(--accent)' }} /> Student information
              </h3>

              {/* Curriculum toggle */}
              <div className="flex gap-2 p-1 rounded-xl w-fit"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {[['eight_four_four','8-4-4'], ['cbe','CBC / CBE']].map(([val, lbl]) => (
                  <button key={val} type="button" onClick={() => set('curriculum_mode', val)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      form.curriculum_mode === val ? 'text-white shadow-sm' : 'text-[--text-2]'
                    }`}
                    style={form.curriculum_mode === val ? {
                      background: val === 'eight_four_four' ? 'var(--s844)' : 'var(--cbe)'
                    } : {}}>
                    {lbl}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full name" error={errors.full_name} required>
                  <input className="input" value={form.full_name}
                    onChange={e => set('full_name', e.target.value)} placeholder="Alice Wambui Kamau" />
                </Field>
                <Field label="Admission number" error={errors.admission_number} required>
                  <input className="input" value={form.admission_number}
                    onChange={e => set('admission_number', e.target.value)} placeholder="UHS/2026/001" />
                </Field>
                <Field label="Date of birth">
                  <input type="date" className="input" value={form.date_of_birth}
                    onChange={e => set('date_of_birth', e.target.value)} />
                </Field>
                <Field label="Gender" error={errors.gender} required>
                  <select className="input" value={form.gender} onChange={e => set('gender', e.target.value)}>
                    <option value="">Select…</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                <Field label="Intake year" error={errors.intake_year} required>
                  <select className="input" value={form.intake_year} onChange={e => set('intake_year', e.target.value)}>
                    {[2022,2023,2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </Field>

                {isCBE ? (
                  <>
                    <Field label="Current grade" error={errors.current_grade} required>
                      <select className="input" value={form.current_grade} onChange={e => {
                        const g = parseInt(e.target.value);
                        set('current_grade', e.target.value);
                        set('school_level', g <= 9 ? 'junior' : 'senior');
                      }}>
                        <option value="">Select grade…</option>
                        {GRADES.map(g => <option key={g} value={g}>Grade {g} {g<=9?'(Junior)':'(Senior)'}</option>)}
                      </select>
                    </Field>
                    {parseInt(form.current_grade) >= 10 && (
                      <Field label="Pathway">
                        <select className="input" value={form.pathway_id} onChange={e => set('pathway_id', e.target.value)}>
                          <option value="">Select pathway…</option>
                          {pathways?.map((p: any) => (
                            <option key={p.id} value={p.id}>{p.pathway_name.replace(/_/g,' ').replace(/\b\w/g, (c:string)=>c.toUpperCase())}</option>
                          ))}
                        </select>
                      </Field>
                    )}
                    <Field label="KPSEA score (out of 100)">
                      <input type="number" className="input" min="0" max="100" step="0.1"
                        value={form.kpsea_score} onChange={e => set('kpsea_score', e.target.value)} placeholder="82.5" />
                    </Field>
                  </>
                ) : (
                  <>
                    <Field label="Current form" error={errors.current_form} required>
                      <select className="input" value={form.current_form} onChange={e => set('current_form', e.target.value)}>
                        <option value="">Select form…</option>
                        {FORMS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </Field>
                    <Field label="Stream">
                      <select className="input" value={form.stream_id} onChange={e => set('stream_id', e.target.value)}>
                        <option value="">Select stream…</option>
                        {streams?.filter((s: any) => s.form === form.current_form).map((s: any) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="KCPE index number">
                      <input className="input" value={form.kcpe_index}
                        onChange={e => set('kcpe_index', e.target.value)} placeholder="23456789" />
                    </Field>
                    <Field label="KCPE score (out of 500)">
                      <input type="number" className="input" min="0" max="500"
                        value={form.kcpe_score} onChange={e => set('kcpe_score', e.target.value)} placeholder="380" />
                    </Field>
                  </>
                )}
              </div>

              <button type="button" onClick={handleNext}
                className="btn-primary w-full sm:w-auto sm:min-w-40">
                Next: Guardian <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Step 2: Guardian ── */}
          {step === 2 && (
            <div className="card-p space-y-4 animate-slide-up">
              <h3 className="font-semibold text-[--text-1]">Parent / guardian details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Guardian full name" error={errors.guardian_name} required>
                  <input className="input" value={form.guardian_name}
                    onChange={e => set('guardian_name', e.target.value)} placeholder="James Kamau" />
                </Field>
                <Field label="Relationship">
                  <select className="input" value={form.guardian_relationship}
                    onChange={e => set('guardian_relationship', e.target.value)}>
                    {['father','mother','guardian','sibling','uncle','aunt','grandparent','other'].map(r => (
                      <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Phone number" error={errors.guardian_phone} required>
                  <input type="tel" className="input" value={form.guardian_phone}
                    onChange={e => set('guardian_phone', e.target.value)} placeholder="+2547xxxxxxxx" />
                </Field>
                <Field label="Email (optional)">
                  <input type="email" className="input" value={form.guardian_email}
                    onChange={e => set('guardian_email', e.target.value)} placeholder="parent@email.com" />
                </Field>
              </div>
              <div className="flex gap-3 flex-wrap">
                <button type="button" onClick={() => setStep(1)} className="btn-ghost">← Back</button>
                <button type="button" onClick={handleNext} className="btn-primary">
                  Next: Boarding <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Boarding & fees ── */}
          {step === 3 && (
            <div className="card-p space-y-4 animate-slide-up">
              <h3 className="font-semibold text-[--text-1]">Boarding & financial details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Boarding house">
                  <input className="input" value={form.boarding_house}
                    onChange={e => set('boarding_house', e.target.value)} placeholder="Block A" />
                </Field>
                <Field label="Dormitory">
                  <input className="input" value={form.dormitory}
                    onChange={e => set('dormitory', e.target.value)} placeholder="Dorm 2" />
                </Field>
                <Field label="Bed number">
                  <input className="input" value={form.bed_number}
                    onChange={e => set('bed_number', e.target.value)} placeholder="B-14" />
                </Field>
              </div>
              <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="bursary" checked={form.bursary_status}
                    onChange={e => set('bursary_status', e.target.checked)} className="w-4 h-4 accent-[--accent]" />
                  <label htmlFor="bursary" className="text-sm font-medium text-[--text-1] cursor-pointer">
                    Bursary / scholarship student
                  </label>
                </div>
                {form.bursary_status && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                    <Field label="Bursary amount (KES)">
                      <input type="number" className="input" value={form.bursary_amount}
                        onChange={e => set('bursary_amount', e.target.value)} placeholder="15000" />
                    </Field>
                    <Field label="Bursary source">
                      <input className="input" value={form.bursary_source}
                        onChange={e => set('bursary_source', e.target.value)} placeholder="CDF, NGO, County…" />
                    </Field>
                  </div>
                )}
              </div>
              <div className="flex gap-3 flex-wrap">
                <button type="button" onClick={() => setStep(2)} className="btn-ghost">← Back</button>
                <button type="submit" disabled={mutation.isPending} className="btn-primary">
                  {mutation.isPending
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                    : <><UserPlus className="w-4 h-4" /> Add student</>}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
