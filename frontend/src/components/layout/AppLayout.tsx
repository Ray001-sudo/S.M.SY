'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, BookOpen, ClipboardList, DollarSign, MessageSquare, FolderOpen, GitBranch, Brain, BarChart2, Settings, LogOut, GraduationCap, UserCheck, Heart, BookMarked, Video, Zap, Key, ShieldCheck } from 'lucide-react';

const NAV = [
  { href:'/dashboard',       icon:LayoutDashboard, label:'Dashboard',    roles:['all'],                                                    mobile:true  },
  { href:'/students',        icon:Users,           label:'Students',     roles:['all'],                                                    mobile:true  },
  { href:'/grades',          icon:BookOpen,        label:'Grades',       roles:['admin','principal','deputy_principal','teacher','class_teacher'], mobile:true },
  { href:'/attendance',      icon:UserCheck,       label:'Attendance',   roles:['admin','principal','deputy_principal','teacher','class_teacher'], mobile:false },
  { href:'/exams',           icon:ClipboardList,   label:'Exams',        roles:['admin','principal','deputy_principal','teacher','class_teacher'], mobile:false },
  { href:'/fees',            icon:DollarSign,      label:'Fees',         roles:['admin','principal','bursar'],                            mobile:true  },
  { href:'/communication',   icon:MessageSquare,   label:'Messages',     roles:['all'],                                                    mobile:true  },
  { href:'/portfolio',       icon:FolderOpen,      label:'Portfolios',   roles:['admin','principal','deputy_principal','teacher','class_teacher','counsellor'], mobile:false },
  { href:'/pathways',        icon:GitBranch,       label:'Pathways',     roles:['admin','principal','deputy_principal','counsellor'],       mobile:false },
  { href:'/health',          icon:Heart,           label:'Health',       roles:['admin','principal','nurse','class_teacher'],               mobile:false },
  { href:'/library',         icon:BookMarked,      label:'Library',      roles:['all'],                                                    mobile:false },
  { href:'/virtual',         icon:Video,           label:'Virtual',      roles:['admin','principal','deputy_principal','teacher','class_teacher'], mobile:false },
  { href:'/exam-generator',  icon:Zap,             label:'AI Exams',     roles:['admin','principal','deputy_principal','teacher'],          mobile:false },
  { href:'/ai',              icon:Brain,           label:'AI Insights',  roles:['admin','principal','deputy_principal','counsellor'],       mobile:false },
  { href:'/reports',         icon:BarChart2,       label:'Reports',      roles:['admin','principal','deputy_principal','bursar'],           mobile:false },
  { href:'/invite',          icon:Key,             label:'Access',       roles:['admin','principal'],                                      mobile:false },
  { href:'/admin',           icon:Settings,        label:'Settings',     roles:['admin','principal'],                                      mobile:false },
  { href:'/settings',        icon:Settings,        label:'Branding',     roles:['admin','principal'],                                      mobile:false },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const visible = NAV.filter(n => n.roles.includes('all') || (user?.role && n.roles.includes(user.role)));
  const mobileVisible = visible.filter(n => n.mobile).slice(0, 5);
  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex w-60 flex-col fixed inset-y-0 left-0 z-30 overflow-y-auto" style={{background:'var(--navy)',borderRight:'1px solid rgba(255,255,255,0.06)'}}>
        <div className="p-5 border-b flex-shrink-0" style={{borderColor:'rgba(255,255,255,0.06)'}}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'var(--accent)'}}><GraduationCap className="w-4 h-4 text-[--navy]"/></div>
            <span className="text-white font-semibold text-base">Shule360</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{background:'rgba(124,58,237,0.25)',color:'#C4B5FD'}}>8-4-4</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{background:'rgba(8,145,178,0.25)',color:'#67E8F9'}}>CBC/CBE</span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {visible.map(item => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} className={cn('flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-150', active?'font-medium':'text-white/50 hover:text-white/80 hover:bg-white/5')} style={active?{background:'rgba(0,200,150,0.15)',color:'var(--accent)'}:{}}>
                <item.icon className="w-4 h-4 flex-shrink-0"/>
                <span className="truncate">{item.label}</span>
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:'var(--accent)'}}/>}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t flex-shrink-0" style={{borderColor:'rgba(255,255,255,0.06)'}}>
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <ShieldCheck className="w-3 h-3" style={{color:'var(--accent)'}}/> <span className="text-xs" style={{color:'rgba(255,255,255,0.35)'}}>Zero-trust session</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-2 rounded-xl" style={{background:'rgba(255,255,255,0.05)'}}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{background:'var(--accent)',color:'var(--navy)'}}>{user?.full_name?.charAt(0)||'U'}</div>
            <div className="flex-1 min-w-0"><p className="text-white text-xs font-medium truncate">{user?.full_name}</p><p className="text-white/40 text-xs capitalize truncate">{user?.role?.replace(/_/g,' ')}</p></div>
            <button onClick={() => logout()} className="text-white/30 hover:text-red-400 transition-colors flex-shrink-0"><LogOut className="w-3.5 h-3.5"/></button>
          </div>
        </div>
      </aside>
      <main className="flex-1 md:ml-60 min-h-screen">{children}</main>
      <nav className="mobile-nav">
        {mobileVisible.map(item => {
          const active = isActive(item.href);
          return (<Link key={item.href} href={item.href} className={cn('mobile-nav-item',active&&'active')}><item.icon className="w-5 h-5"/><span>{item.label}</span></Link>);
        })}
      </nav>
    </div>
  );
}
