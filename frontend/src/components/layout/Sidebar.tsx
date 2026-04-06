'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, BookOpen, ClipboardList, DollarSign,
  MessageSquare, FolderOpen, GitBranch, Brain, BarChart2,
  Settings, LogOut, GraduationCap
} from 'lucide-react';

const nav = [
  { href: '/dashboard',         icon: LayoutDashboard, label: 'Dashboard',     roles: ['all'] },
  { href: '/students',          icon: Users,           label: 'Students',      roles: ['all'] },
  { href: '/grades',            icon: BookOpen,        label: 'Grades',        roles: ['admin','principal','deputy_principal','teacher','class_teacher'] },
  { href: '/exams',             icon: ClipboardList,   label: 'Exams & SBA',   roles: ['admin','principal','deputy_principal','teacher','class_teacher'] },
  { href: '/fees',              icon: DollarSign,      label: 'Fees',          roles: ['admin','principal','bursar'] },
  { href: '/communication',     icon: MessageSquare,   label: 'Communication', roles: ['all'] },
  { href: '/portfolio',         icon: FolderOpen,      label: 'Portfolios',    roles: ['admin','principal','deputy_principal','teacher','class_teacher','counsellor'] },
  { href: '/pathways',          icon: GitBranch,       label: 'Pathways',      roles: ['admin','principal','deputy_principal','counsellor'] },
  { href: '/ai',                icon: Brain,           label: 'AI Insights',   roles: ['admin','principal','deputy_principal','counsellor'] },
  { href: '/reports',           icon: BarChart2,       label: 'Reports',       roles: ['admin','principal','deputy_principal','bursar'] },
  { href: '/admin',             icon: Settings,        label: 'Settings',      roles: ['admin','principal'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const visible = nav.filter(n =>
    n.roles.includes('all') || (user?.role && n.roles.includes(user.role))
  );

  return (
    <aside className="w-60 bg-primary min-h-screen flex flex-col">
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <GraduationCap className="text-white w-6 h-6" />
          <span className="text-white font-bold text-lg">Shule360</span>
        </div>
        <div className="flex gap-1 mt-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-s844-light text-s844 font-medium">8-4-4</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-cbe-light text-cbe font-medium">CBE</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {visible.map(item => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-blue-200 hover:bg-white/10 hover:text-white'
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className="px-3 py-2 mb-1">
          <p className="text-white text-sm font-medium truncate">{user?.full_name}</p>
          <p className="text-blue-300 text-xs capitalize">{user?.role?.replace('_', ' ')}</p>
        </div>
        <button
          onClick={() => logout()}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}
