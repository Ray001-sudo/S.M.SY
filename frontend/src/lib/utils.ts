import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, fmt?: string) {
  if (!date) return '—';
  const d = new Date(date);
  if (fmt === 'dd MMM HH:mm') {
    return d.toLocaleDateString('en-KE', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatCurrency(amount: number | string | undefined | null) {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-KE', {
    style: 'currency', currency: 'KES', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(Number(amount));
}

export function pct(score: number, max: number) {
  if (!max) return 0;
  return Math.round((score / max) * 1000) / 10;
}

export function letterGrade844(score: number, max: number): string {
  const p = pct(score, max);
  if (p >= 80) return 'A';
  if (p >= 75) return 'A-';
  if (p >= 70) return 'B+';
  if (p >= 65) return 'B';
  if (p >= 60) return 'B-';
  if (p >= 55) return 'C+';
  if (p >= 50) return 'C';
  if (p >= 45) return 'C-';
  if (p >= 40) return 'D+';
  if (p >= 35) return 'D';
  if (p >= 30) return 'D-';
  return 'E';
}

export function competencyRating(score: number, max: number): 'EE' | 'ME' | 'AE' | 'BE' {
  const p = pct(score, max);
  if (p >= 80) return 'EE';
  if (p >= 50) return 'ME';
  if (p >= 30) return 'AE';
  return 'BE';
}

export const COMPETENCY_LABELS: Record<string, string> = {
  communication:     'Communication & Collaboration',
  critical_thinking: 'Critical Thinking & Problem Solving',
  creativity:        'Creativity & Imagination',
  citizenship:       'Citizenship',
  digital_literacy:  'Digital Literacy',
  learning_to_learn: 'Learning to Learn',
  self_efficacy:     'Self-Efficacy',
};

export const PATHWAY_LABELS: Record<string, string> = {
  stem:            'STEM',
  social_sciences: 'Social Sciences',
  arts_sports:     'Arts & Sports Science',
};

export const RISK_COLORS: Record<string, string> = {
  critical: '#EF4444',
  high:     '#F97316',
  medium:   '#F59E0B',
  low:      '#10B981',
};

export function initials(name: string) {
  return name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
}

export function gradeColor(letter: string): string {
  if (['A', 'A-'].includes(letter)) return '#10B981';
  if (['B+', 'B', 'B-'].includes(letter)) return '#0891B2';
  if (['C+', 'C', 'C-'].includes(letter)) return '#7C3AED';
  if (['D+', 'D', 'D-'].includes(letter)) return '#F59E0B';
  return '#EF4444';
}
