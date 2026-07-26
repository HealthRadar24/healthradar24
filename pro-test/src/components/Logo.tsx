import { Globe, Activity } from 'lucide-react';
import {
  HEALTHRADAR_COMPANY,
  HEALTHRADAR_NAME,
  HEALTHRADAR_ORIGIN,
} from '../../healthradar-brand.mjs';

export const Logo = () => (
  <a href={HEALTHRADAR_ORIGIN} className="flex items-center gap-2 hover:opacity-80 transition-opacity" aria-label={`${HEALTHRADAR_NAME} — Home`}>
    <div className="relative w-8 h-8 rounded-full bg-wm-card border border-wm-border flex items-center justify-center overflow-hidden">
      <Globe className="w-5 h-5 text-wm-blue opacity-50 absolute" aria-hidden="true" />
      <Activity className="w-6 h-6 text-wm-green absolute z-10" aria-hidden="true" />
    </div>
    <div className="flex flex-col">
      <span className="font-display font-bold text-sm leading-none tracking-tight">HEALTHRADAR24</span>
      <span className="text-[9px] text-wm-muted font-mono uppercase tracking-widest leading-none mt-1">by {HEALTHRADAR_COMPANY}</span>
    </div>
  </a>
);
