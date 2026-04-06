'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
interface BrandingData { school_name?:string; logo_url?:string; primary_color?:string; accent_color?:string; motto?:string; address?:string; principal_name?:string; mpesa_paybill?:string; bank_name?:string; bank_account?:string; }
const BrandingCtx = createContext<BrandingData>({});
export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const [branding, setBranding] = useState<BrandingData>({});
  useEffect(() => {
    if (!isAuthenticated) return;
    api.get('/settings').then(r => {
      const s = r.data; setBranding(s);
      if (s.primary_color) document.documentElement.style.setProperty('--navy', s.primary_color);
      if (s.accent_color) document.documentElement.style.setProperty('--accent', s.accent_color);
      if (s.school_name) document.title = s.school_name + ' · Shule360';
    }).catch(() => {});
  }, [isAuthenticated]);
  return <BrandingCtx.Provider value={branding}>{children}</BrandingCtx.Provider>;
}
export const useBranding = () => useContext(BrandingCtx);
