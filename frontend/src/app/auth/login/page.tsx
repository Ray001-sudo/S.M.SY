'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { GraduationCap, Eye, EyeOff, ShieldCheck, Zap, Brain, ArrowRight, Building2 } from 'lucide-react';
import { TrustChip } from '@/components/ui';

type Mode = 'login' | 'signup';

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();

  // Login state
  const [loginData, setLoginData] = useState({ email: '', password: '' });

  // Signup state
  const [signupData, setSignupData] = useState({
    school_name: '', school_type: 'boarding', county: '',
    full_name: '', email: '', phone: '', password: '', confirm: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) return toast.error('Please fill all fields');
    setLoading(true);
    try {
      await login(loginData.email, loginData.password);
      router.replace('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupData.password !== signupData.confirm) return toast.error('Passwords do not match');
    if (signupData.password.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      await api.post('/auth/signup', signupData);
      toast.success('School registered! Please sign in.');
      setLoginData({ email: signupData.email, password: '' });
      setMode('login');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* ── Left panel — brand ── */}
      <div className="hidden md:flex md:w-[45%] flex-col justify-between p-10"
        style={{ background: 'var(--navy)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--accent)' }}>
            <GraduationCap className="w-5 h-5 text-[--navy]" />
          </div>
          <span className="text-white text-xl font-semibold">Shule360</span>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-semibold text-white leading-tight mb-4">
              Built for Kenya's<br />
              <span style={{ color: 'var(--accent)' }}>education transition</span>
            </h1>
            <p className="text-white/60 text-base leading-relaxed">
              One platform for 8-4-4 and CBC/CBE. AI-powered insights,
              M-Pesa fees, digital portfolios, and pathway guidance — all in one.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: Brain, text: 'AI predicts at-risk students weekly' },
              { icon: Zap, text: 'M-Pesa integrated fee collection' },
              { icon: ShieldCheck, text: 'Zero-trust, encrypted, KDPA compliant' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(0,200,150,0.15)' }}>
                  <Icon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                </div>
                <span className="text-white/70 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: 'rgba(124,58,237,0.25)', color: '#C4B5FD' }}>8-4-4 Forms 1–4</span>
          <span className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: 'rgba(8,145,178,0.25)', color: '#67E8F9' }}>CBC Grades 7–12</span>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col justify-center px-6 py-10 md:px-12 max-w-lg mx-auto w-full">
        {/* Mobile logo */}
        <div className="flex md:hidden items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--navy)' }}>
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-[--text-1]">Shule360</span>
        </div>

        {/* Mode switcher */}
        <div className="flex gap-1 p-1 rounded-2xl mb-8 w-fit"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {(['login', 'signup'] as Mode[]).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                mode === m
                  ? 'text-white shadow-sm'
                  : 'text-[--text-2] hover:text-[--text-1]'
              }`}
              style={mode === m ? { background: 'var(--navy)' } : {}}>
              {m === 'login' ? 'Sign in' : 'Register school'}
            </button>
          ))}
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-5 animate-slide-up">
            <div>
              <h2 className="text-2xl font-semibold text-[--text-1]">Welcome back</h2>
              <p className="text-sm text-[--text-2] mt-1">Sign in to your school dashboard</p>
            </div>

            <div className="space-y-4">
              <div className="input-group">
                <label className="label">Email address</label>
                <input type="email" className="input" placeholder="you@school.ac.ke"
                  value={loginData.email} onChange={e => setLoginData(d => ({ ...d, email: e.target.value }))}
                  required autoComplete="email" />
              </div>
              <div className="input-group">
                <label className="label">Password</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} className="input pr-11"
                    placeholder="••••••••" value={loginData.password}
                    onChange={e => setLoginData(d => ({ ...d, password: e.target.value }))}
                    required autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-3] hover:text-[--text-2]">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full btn-lg text-white font-semibold flex items-center justify-center gap-2"
              style={{ background: 'var(--navy)' }}>
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in…</>
              ) : (
                <> Sign in <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            <div className="flex justify-center">
              <TrustChip label="AES-256 encrypted · KDPA compliant" />
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4 animate-slide-up">
            <div>
              <h2 className="text-2xl font-semibold text-[--text-1]">Register your school</h2>
              <p className="text-sm text-[--text-2] mt-1">Set up Shule360 for your institution</p>
            </div>

            <div className="p-4 rounded-2xl space-y-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 text-xs font-medium text-[--text-2] uppercase tracking-wide">
                <Building2 className="w-3.5 h-3.5" /> School details
              </div>
              <div className="input-group">
                <label className="label">School name <span className="text-red-500">*</span></label>
                <input className="input" placeholder="e.g. Uhuru Boarding High School"
                  value={signupData.school_name}
                  onChange={e => setSignupData(d => ({ ...d, school_name: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="input-group">
                  <label className="label">Type</label>
                  <select className="input" value={signupData.school_type}
                    onChange={e => setSignupData(d => ({ ...d, school_type: e.target.value }))}>
                    <option value="boarding">Boarding</option>
                    <option value="day">Day school</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="label">County</label>
                  <input className="input" placeholder="e.g. Nairobi"
                    value={signupData.county}
                    onChange={e => setSignupData(d => ({ ...d, county: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl space-y-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 text-xs font-medium text-[--text-2] uppercase tracking-wide">
                <ShieldCheck className="w-3.5 h-3.5" /> Principal / Admin account
              </div>
              <div className="input-group">
                <label className="label">Full name <span className="text-red-500">*</span></label>
                <input className="input" placeholder="Dr. Jane Mwangi"
                  value={signupData.full_name}
                  onChange={e => setSignupData(d => ({ ...d, full_name: e.target.value }))} required />
              </div>
              <div className="input-group">
                <label className="label">Email <span className="text-red-500">*</span></label>
                <input type="email" className="input" placeholder="principal@school.ac.ke"
                  value={signupData.email}
                  onChange={e => setSignupData(d => ({ ...d, email: e.target.value }))} required />
              </div>
              <div className="input-group">
                <label className="label">Phone</label>
                <input className="input" placeholder="+2547xxxxxxxx"
                  value={signupData.phone}
                  onChange={e => setSignupData(d => ({ ...d, phone: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="input-group">
                  <label className="label">Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} className="input pr-9"
                      placeholder="Min 8 chars" value={signupData.password}
                      onChange={e => setSignupData(d => ({ ...d, password: e.target.value }))} required minLength={8} />
                    <button type="button" onClick={() => setShowPass(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-3]">
                      {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="input-group">
                  <label className="label">Confirm password</label>
                  <input type={showPass ? 'text' : 'password'} className="input"
                    placeholder="Repeat" value={signupData.confirm}
                    onChange={e => setSignupData(d => ({ ...d, confirm: e.target.value }))} required />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full btn-lg text-white font-semibold"
              style={{ background: 'var(--navy)' }}>
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Registering…</>
                : <> Register school <ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
