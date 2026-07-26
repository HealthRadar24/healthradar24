import { DASHBOARD_PATH } from '../routes';
import {
  HEALTHRADAR_COMPANY,
  HEALTHRADAR_FORK_URL,
  HEALTHRADAR_NAME,
  HEALTHRADAR_ORIGIN,
  HEALTHRADAR_SUPPORT_URL,
  HEALTHRADAR_UPSTREAM_URL,
} from '../../healthradar-brand.mjs';

export const Footer = () => (
  <footer className="border-t border-wm-border bg-[#020202] pt-8 pb-12 px-6 text-center">
    <div className="flex flex-col md:flex-row items-center justify-between max-w-7xl mx-auto text-xs text-wm-muted font-mono">
      <div className="flex items-center gap-3 mb-4 md:mb-0">
        <img src="/favico/favicon-32x32.png" alt="" width="28" height="28" loading="lazy" className="rounded-full" />
        <div className="flex flex-col">
          <span className="font-display font-bold text-sm leading-none tracking-tight text-wm-text">HEALTHRADAR24</span>
          <span className="text-[9px] uppercase tracking-[2px] opacity-60 mt-0.5">by {HEALTHRADAR_COMPANY}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <a href={DASHBOARD_PATH} className="hover:text-wm-text transition-colors">Dashboard</a>
        <a href={`${HEALTHRADAR_ORIGIN}/docs`} className="hover:text-wm-text transition-colors">Docs</a>
        <a href={HEALTHRADAR_SUPPORT_URL} className="hover:text-wm-text transition-colors">Support</a>
        <a href={HEALTHRADAR_FORK_URL} target="_blank" rel="noreferrer" className="hover:text-wm-text transition-colors">Source</a>
        <a href={HEALTHRADAR_UPSTREAM_URL} target="_blank" rel="noreferrer" className="hover:text-wm-text transition-colors">Upstream</a>
      </div>
      <span className="text-[10px] opacity-40 mt-4 md:mt-0" suppressHydrationWarning>&copy; {new Date().getFullYear()} {HEALTHRADAR_NAME}</span>
    </div>
  </footer>
);
